import { Logger } from '@nestjs/common';
import { Brackets } from 'typeorm/query-builder/Brackets';
import { WellSchematicQueryDTO } from '../interfaces/DTO/WellSchematicQueryDTO';
import { WellboreData } from '../interfaces/WellboreData';
import {
  WellboreGradient,
  LithologyFormation,
  ReferenceDepths,
  Wellhead,
  WellheadAnnularPressure,
  WellheadComponent,
  WellheadHanger,
  WellheadOutlet,
  WellheadPressureRelief,
  WellSchematic,
  AnnulusComponentData,
  AnnulusLatestTestData,
  AnnulustestComponentData,
  SurveyStation,
} from '../interfaces/WellSchematicData';
import { SchematicProvider } from '../SchematicProvider';

export class ActualSchematicProvider extends SchematicProvider {
  private readonly logger = new Logger(ActualSchematicProvider.name);

  async getWellSchematic(body: WellSchematicQueryDTO): Promise<WellSchematic> {
    this.logger.log(
      'Getting Well Schematic for well_id: ' +
        body.well_id +
        ' wellbore_id: ' +
        body.wellbore_id +
        ' scenario_id: ' +
        body.scenario_id +
        ' schematic_date: ' +
        body.schematic_date,
    );

    //Iterative WellborePath Search
    const wellborePathTree = await this.GetWellboreSequence(body);

    const wellSchematic: WellSchematic = {
      Obstructions: {
        Fish: [],
        HoldUpDepth: [],
      },
      SidetrackCutoffs: {
        Sidetrack: [],
      },
      Stimulations: {
        BridgePlug: [],
        Stimulation: [],
      },
      PorePressureGradient: [],
      FractureGradient: [],
    };

    //Initialize Path Independent Properties
    wellSchematic.Wellhead = await this.GetWellheads(body);

    wellSchematic.Units = {
      DepthUnits: 'ft',
      DiameterUnits: 'in',
      LengthUnits: 'ft',
      DepthDP: 1,
      DiameterDP: 3,
      LengthDP: 2,
    };

    wellSchematic.ReferenceDepths = await this.GetReferenceDepths(body);

    wellSchematic.AnnulusData = {
      Annulus: await this.GetAnnulusData(body),
    };

    wellSchematic.WellboreFPGradient = await this.GetWellboreGradient(
      body,
      'PL_WELLBORE_FRAC_GRAD',
    );
    wellSchematic.WellborePPGradient = await this.GetWellboreGradient(
      body,
      'PL_WELLBORE_PP_GRAD',
    );
    wellSchematic.WellboreTGradient = await this.GetWellboreGradient(
      body,
      'PL_WELLBORE_TEMP_GRAD',
    );

    wellSchematic.Survey = {
      Station: await this.GetSurveyStations(body),
    };

    //Initialize Path Dependant Properties
    wellSchematic.Lithology = {
      Formation: [],
    };

    //Fore each of the wellbores, get the properties and append them to initialized properties
    for (const wellbore of wellborePathTree) {
      const isLastWellbore =
        wellborePathTree.indexOf(wellbore) === wellborePathTree.length - 1;

      wellSchematic.Lithology.Formation = [
        ...wellSchematic.Lithology.Formation,
        ...(await this.GetLithology(body, wellbore, isLastWellbore)),
      ];
    }
    return wellSchematic;
  }

  /**
   * For a given well, at given dates, returns the full wellhead information, including its components, and pressure relief information
   * @param body Query Body
   * @returns Wellheads associated for this well, including its components, and pressure relief information
   */
  async GetWellheads({
    well_id,
    scenario_id,
    wellbore_id,
    schematic_date,
  }: WellSchematicQueryDTO): Promise<Wellhead> {
    try {
      this.logger.log('Getting wellhead data for well_id: ' + well_id);

      const wellheadData: Wellhead = {
        Component: await this.GetWellheadComponents({
          well_id,
          scenario_id,
          wellbore_id,
          schematic_date,
        }),
        AnnularPressure: await this.GetWellheadAnnulusPressureData({
          well_id,
          scenario_id,
          wellbore_id,
          schematic_date,
        }),
      };

      return wellheadData;
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }

  /**
   * Returns annulus pressure information from wellhead report
   * @param query query parameters
   * @returns
   */
  async GetWellheadAnnulusPressureData({
    well_id,
  }: WellSchematicQueryDTO): Promise<WellheadAnnularPressure[]> {
    const rawAnnulusPressuresData = await this.dbConnection
      .createQueryBuilder()
      .from('PL_WELLHEAD_ANNULAR_PRES', null)
      .where('WELL_ID = :wellid', { wellid: well_id })
      .getRawManyNormalized();

    const annulusPressureData: WellheadAnnularPressure[] = [];
    for (const annularPressure of rawAnnulusPressuresData) {
      const pressReliefData: WellheadPressureRelief[] =
        await this.GetPressureReliefData(well_id, annularPressure);

      annulusPressureData.push({
        ...annularPressure,
        PressureRelief: pressReliefData,
      });
    }
    return annulusPressureData;
  }

  /**
   * Returns the pressure relief data for a given annulus pressure
   * @param well_id
   * @param press Annulus pressure data
   * @returns
   */
  async GetPressureReliefData(
    well_id,
    press,
  ): Promise<WellheadPressureRelief[]> {
    const rawPressureReliefData = await this.dbConnection
      .createQueryBuilder()
      .from('PL_WELLHEAD_PRESS_RELIEF', null)
      .where(
        `WELL_ID = :wellid
          AND WELLHEAD_ID = :wellheadid
          AND WELLHEAD_ANN_PRESS_ID = :annularpressureid
          `,
        {
          wellid: well_id,
          wellheadid: press.wellhead_id,
          annularpressureid: press.wellhead_ann_press_id,
        },
      )
      .getRawManyNormalized<WellheadPressureRelief>();

    return rawPressureReliefData;
  }

  /**
   * For a given well, returns all the wellhead components
   * @param data
   * @returns
   */
  async GetWellheadComponents({
    well_id,
    scenario_id,
    wellbore_id,
    schematic_date,
  }: WellSchematicQueryDTO): Promise<WellheadComponent[]> {
    this.logger.log('Getting wellhead components');

    const wellheadCompsQuery = this.dbConnection
      .createQueryBuilder()
      .from('CD_WELLHEAD', null)
      .innerJoin(
        'CD_WELLHEAD_COMP',
        null,
        'CD_WELLHEAD.wellhead_id = CD_WELLHEAD_COMP.wellhead_id AND CD_WELLHEAD.well_id = CD_WELLHEAD_COMP.well_id',
      )
      .leftJoin(
        'PL_WELLHEAD_COMP_EXT',
        null,
        'PL_WELLHEAD_COMP_EXT.wellhead_comp_id = CD_WELLHEAD_COMP.wellhead_comp_id AND PL_WELLHEAD_COMP_EXT.wellhead_id = CD_WELLHEAD_COMP.wellhead_id',
      )
      .where('CD_WELLHEAD_COMP.well_id = :well_id', { well_id })
      .andWhere('CD_WELLHEAD.scenario_id is null')
      .andWhere('CD_WELLHEAD_COMP.install_date <= :schematic_date', {
        schematic_date,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('CD_WELLHEAD_COMP.removal_date is null').orWhere(
            new Brackets((qb2) => {
              qb2.where(
                'CD_WELLHEAD_COMP.removal_date IS NOT NULL AND CD_WELLHEAD_COMP.removal_date > :schematic_date',
                { schematic_date },
              );
            }),
          );
        }),
      )
      .orderBy('sequence_no', 'ASC')
      .select([
        'CD_WELLHEAD_COMP.*',
        'PL_WELLHEAD_COMP_EXT.wellhead_section',
        'PL_WELLHEAD_COMP_EXT.test_result',
      ]);

    const wellheadCompsRawData: any =
      await wellheadCompsQuery.getRawManyNormalized();

    const wellheadComponents: WellheadComponent[] = [];
    for (const wellheadComp of wellheadCompsRawData) {
      const refId = `CdWellheadCompT/${wellheadComp.well_id}+${wellheadComp.event_id}+${wellheadComp.wellhead_id}+${wellheadComp.wellhead_comp_id}`;
      const barriers = await this.schematicHelper.getElementBarriers(
        well_id,
        scenario_id,
        wellbore_id,
        schematic_date,
        refId,
      );

      this.logger.log('Getting Wellhead Outlets for wellhead');
      const outlets: WellheadOutlet[] = await this.GetWellheadCompOutlets(
        schematic_date,
        scenario_id,
        wellbore_id,
        wellheadComp,
      );

      this.logger.log('Getting Wellhead Hangers for wellhead');

      const hangers: WellheadHanger[] = await this.GetWellheadHangers(
        wellheadComp,
        well_id,
        scenario_id,
        wellbore_id,
        schematic_date,
      );

      wellheadComponents.push({
        ref_id: refId,
        SectType: wellheadComp.sect_type_code,
        CompType: wellheadComp.comp_type_code,
        Manufacturer: wellheadComp.make,
        Model: wellheadComp.model,
        description: `(${wellheadComp.wellhead_section}) ${wellheadComp.sect_type_code} - ${wellheadComp.comp_type_code} - ${wellheadComp.make} - ${wellheadComp.model}`,
        wellhead_section: wellheadComp.wellhead_section,
        test_result: wellheadComp.test_result,
        TopPresRating: wellheadComp.working_press_rating,
        comments: wellheadComp.comments,
        installDate: wellheadComp.install_date,
        removalDate: wellheadComp.removal_date,
        barrier_id: barriers.map((barrier) => barrier.barrier_name).join(','),
        is_barrier_closed: false,
        include_seals: false,
        test_duration: wellheadComp.manufacture_method,
        test_pressure: wellheadComp.connection_top_press_rating,
        Outlet: outlets,
        Hanger: hangers,
        reference: null,
        wellheadReference: null,
      });
    }

    return wellheadComponents;
  }

  /**
   * Return the wellhead hangers for a given component
   * @param item Wellhead Component Item
   * @param well_id
   * @param scenario_id
   * @param wellbore_id
   * @param schematic_date
   * @returns
   */
  async GetWellheadHangers(
    item,
    well_id: string,
    scenario_id: string,
    wellbore_id: string,
    schematic_date: Date,
  ): Promise<WellheadHanger[]> {
    const rawHangersData = await this.dbConnection
      .createQueryBuilder()
      .from('CD_WELLHEAD_HANGER', 'WHCH')
      .where(
        `WELL_ID = :wellid
                AND EVENT_ID = :eventid
                AND WELLHEAD_ID = :wellheadid
                AND WELLHEAD_COMP_ID = :wellheadcompid
                `,
        {
          wellid: well_id,
          eventid: item.event_id,
          wellheadid: item.wellhead_id,
          wellheadcompid: item.wellhead_comp_id,
        },
      )
      .getRawManyNormalized();

    const wellheadHangers: WellheadHanger[] = [];
    for (const hangerItem of rawHangersData) {
      if (!hangerItem.assembly_id) continue;
      const refId = `CdWellheadHangerT/${item.well_id}+${item.event_id}+${item.wellhead_id}+${item.wellhead_comp_id}+${hangerItem.wellhead_hanger_id}`;
      const hangerBarriers = await this.schematicHelper.getElementBarriers(
        well_id,
        scenario_id,
        wellbore_id,
        schematic_date,
        refId,
      );

      wellheadHangers.push({
        ref_id: refId,
        CompType: hangerItem.comp_type_code,
        SectType: 'HGR',
        description:
          hangerItem.model +
          ' - ' +
          hangerItem.hanger_size +
          ' // ' +
          hangerItem.comp_type_code,
        Model: hangerItem.model,
        Size: hangerItem.hanger_size,
        barrier_id: hangerBarriers
          .map((barrier) => barrier.barrier_name)
          .join(','),
        is_barrier_closed: true,
        include_seals: true,
        reference: '',
      });
    }

    return wellheadHangers;
  }

  /**
   * Return the outlets for a given wellhead component
   * @param schematic_date
   * @param scenario_id
   * @param wellbore_id
   * @param wellhead_comp
   * @returns
   */
  async GetWellheadCompOutlets(
    schematic_date: Date,
    scenario_id: string,
    wellbore_id: string,
    wellhead_comp: any,
  ): Promise<WellheadOutlet[]> {
    try {
      const outletsResults = await this.dbConnection
        .createQueryBuilder()
        .from('CD_WELLHEAD_COMP_OUTLET', 'WHCO')
        .where(
          `WELL_ID = :well_id 
              AND EVENT_ID = :event_id 
              AND WELLHEAD_ID = :wellhead_id 
              AND WELLHEAD_COMP_ID = :wellhead_comp_id 
              AND WHCO.valve_install_date <= :schematic_date 
              AND (WHCO.valve_removal_date is null or WHCO.valve_removal_date > :schematic_date)`,
          {
            well_id: wellhead_comp.well_id,
            event_id: wellhead_comp.event_id,
            wellhead_id: wellhead_comp.wellhead_id,
            wellhead_comp_id: wellhead_comp.wellhead_comp_id,
            schematic_date,
          },
        )
        .select('*')
        .orderBy('sequence_no', 'ASC')
        .getRawManyNormalized();

      const outlets: WellheadOutlet[] = [];
      for (const outletItem of outletsResults) {
        const refId = `CdWellheadCompOutletT/${wellhead_comp.well_id}+${wellhead_comp.event_id}+${wellhead_comp.wellhead_id}+${wellhead_comp.wellhead_comp_id}+${outletItem.outlet_id}`;

        const outletBarriers = await this.schematicHelper.getElementBarriers(
          wellhead_comp.well_id,
          scenario_id,
          wellbore_id,
          schematic_date,
          refId,
        );
        outlets.push({
          CompType: outletItem.comp_type_code,
          Location: outletItem.outlet_location,
          Manufacturer: outletItem.valve_make,
          Model: outletItem.valve_model,
          SectType: outletItem.sect_type_code,
          wellhead_section: wellhead_comp.wellhead_section,
          test_result: wellhead_comp.test_result,
          test_duration: wellhead_comp.manufacture_method,
          test_pressure: wellhead_comp.connection_top_press_rating,
          OutletWorkingPress: outletItem.outlet_working_press,
          description: `${outletItem.comp_type_code} - ${outletItem.outlet_location} - ${outletItem.valve_model} - ${outletItem.valve_make}`,
          barrier_id: outletBarriers
            .map((barrier) => barrier.barrier_name)
            .join(','), //TODO
          include_seals: false,
          is_barrier_closed: false,
          ref_id: refId,
          reference: null,
        });
      }
      return outlets;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * Returns the lithology data loaded for a given wellbore
   *
   * @param queryData Request Data
   * @param wellbore Wellbore Information for Getting the Lithology. The function could return lithologies for the full wellbore path if needed
   * @param isLastWellbore Flag that indicates if it is the last wellbore in the path
   * @returns
   */
  async GetLithology(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    isLastWellbore: boolean,
  ): Promise<LithologyFormation[]> {
    const { well_id, scenario_id, schematic_date } = queryData;
    const { wellbore_id, ko_md } = wellbore;

    try {
      const lithologyQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_SCENARIO_FORMATION_LINK', 'SFL')
        .innerJoin(
          'CD_WELLBORE_FORMATION',
          'WBF',
          'WBF.WELL_ID = SFL.WELL_ID AND WBF.WELLBORE_ID = SFL.WELLBORE_ID AND WBF.WELLBORE_FORMATION_ID = SFL.WELLBORE_FORMATION_ID',
        )
        .leftJoin(
          'CD_FORMATION_PICK',
          'FP',
          'FP.WELL_ID = SFL.WELL_ID AND FP.WELLBORE_ID = SFL.WELLBORE_ID AND FP.WELLBORE_FORMATION_ID = SFL.WELLBORE_FORMATION_ID',
        )
        .leftJoin(
          'HM_LITHOLOGIES',
          'LITH',
          'LITH.OW_LITHOLOGY_ID = WBF.LITHOLOGY_ID',
        )
        .select([
          'WBF.*',
          'FP.tvd_base as actual_tvd_base',
          'FP.tvd_top as actual_tvd_top',
          'FP.md_top as actual_md_top',
          'FP.md_base as actual_md_base',
          'FP.phase as actual_phase',
          'LITH.LITHOLOGY_NAME',
        ])
        .where(
          'SFL.WELL_ID = :wellid AND SFL.WELLBORE_ID = :wellboreId AND SFL.SCENARIO_ID=:scenarioId',
          { wellid: well_id, wellboreId: wellbore_id, scenarioId: scenario_id },
        )
        .orderBy('prognosed_md', 'ASC');

      if (!isLastWellbore) {
        lithologyQuery.andWhere('prognosed_md <= :md', { md: ko_md });
      }

      const rawLithologyData = await lithologyQuery.getRawManyNormalized();

      const lithologyData: LithologyFormation[] = [];

      for (let i = 0; i < rawLithologyData.length; i++) {
        const formation = rawLithologyData[i];
        const refId = `CdWellboreFormationT/${well_id}+${wellbore_id}+${formation.wellbore_formation_id}`;
        const barriers = await this.schematicHelper.getElementBarriers(
          well_id,
          scenario_id,
          wellbore_id,
          schematic_date,
          refId,
        );

        lithologyData.push({
          Lithology: formation.lithology_name || formation.lithology_id,
          Top: formation.actual_md_top,
          Base: formation.actual_md_base,
          TopTVD: formation.actual_tvd_top,
          BaseTVD: formation.actual_tvd_base,
          Label: formation.formation_name,
          comments: formation.comments,
          phase: formation.actual_phase,
          description: formation.formation_name,
          BarrierDepth: formation.actual_md_base,
          tests: [],
          ref_id: refId,
          barrier_id: barriers.map((barrier) => barrier.barrier_name).join(','),
        });
      }
      return lithologyData;
    } catch (err) {
      this.logger.error(
        'An error ocurred while fetching lithology data for wellbore ' +
          wellbore_id +
          ' in well ' +
          well_id +
          '. Error: ' +
          err,
      );
    }
  }

  /**
   * Returns the default reference depths for a given well
   * @param body Request Data
   * @returns Reference depths for the default datum in the given well
   */
  async GetReferenceDepths(
    body: WellSchematicQueryDTO,
  ): Promise<ReferenceDepths> {
    const { well_id } = body;

    const refDepths: ReferenceDepths = await this.dbConnection
      .createQueryBuilder()
      .from('CD_WELL_SOURCE', null)
      .innerJoin(
        'CD_DATUM',
        'CD_DATUM',
        'CD_DATUM.WELL_ID = CD_WELL_SOURCE.WELL_ID',
      )
      .where("CD_WELL_SOURCE.WELL_ID = :wellid AND CD_DATUM.is_default='Y'", {
        wellid: well_id,
      })
      .getRawOneNormalized()
      .then((datumInfo) => {
        if (datumInfo) {
          return {
            Offshore: datumInfo.is_offshore == 'Y',
            AirGap: Number(
              (datumInfo.datum_elevation - datumInfo.water_depth).toFixed(1),
            ),
            WaterDepth: Number(datumInfo.water_depth.toFixed(1)),
            Mudline: Number(
              (datumInfo.datum_elevation - datumInfo.water_depth).toFixed(1),
            ),
            DatumElevation: datumInfo.datum_elevation
              ? Number(datumInfo.datum_elevation.toFixed(1))
              : undefined,
            WellheadDepth: datumInfo.wellhead_depth
              ? Number(datumInfo.wellhead_depth.toFixed(1))
              : undefined,
            SystemDatum: 'Mean Sea Level',
          } as ReferenceDepths;
        } else {
          this.logger.error('No datum data found for well ' + well_id + '.');
          return {
            Offshore: false,
            AirGap: 0,
            WaterDepth: 0,
            Mudline: 0,
            DatumElevation: 0,
            WellheadDepth: 0,
            SystemDatum: 'None',
          } as ReferenceDepths;
        }
      })
      .catch((err) => {
        this.logger.error(
          'An error ocurred while fetching reference depths for well ' +
            well_id +
            '. Error: ' +
            err,
          err,
        );
        return {
          Offshore: false,
          AirGap: 0,
          WaterDepth: 0,
          Mudline: 0,
          DatumElevation: 0,
          WellheadDepth: 0,
          SystemDatum: 'None',
        } as ReferenceDepths;
      });
    return refDepths;
  }

  /**
   * Returns the Gradient information wether it is Pore Pressure, Fracture Pressure or Temperature
   * @param body Request Data
   * @param tableName Gradient Table Name to Query
   * @returns
   */
  async GetWellboreGradient(
    body: WellSchematicQueryDTO,
    tableName:
      | 'PL_WELLBORE_TEMP_GRAD'
      | 'PL_WELLBORE_PP_GRAD'
      | 'PL_WELLBORE_FRAC_GRAD',
  ): Promise<WellboreGradient[]> {
    return await this.dbConnection
      .createQueryBuilder()
      .from(tableName, null)
      .where({
        well_id: body.well_id,
        wellbore_id: body.wellbore_id,
      })
      .select([
        'formation as formationname',
        `${
          tableName === 'PL_WELLBORE_TEMP_GRAD' ? 'temperature' : 'pressure'
        } as value`,
      ])
      .getRawManyNormalized<WellboreGradient>()
      .catch((err) => {
        console.log(tableName);
        this.logger.error(
          'An error ocurred while fetching gradient data for wellbore ' +
            body.wellbore_id +
            ' in well ' +
            body.well_id +
            '. Error: ' +
            err,
          err,
        );
        return [];
      });
  }

  /**
   * Returns annulus information for a given analysis
   * @param body
   * @returns
   */
  async GetAnnulusData(body: WellSchematicQueryDTO) {
    try {
      const barrierDiagram = await this.dbConnection
        .createQueryBuilder()
        .from('CD_BARRIER_DIAGRAM_T', 'CBD')
        .where({
          well_id: body.well_id,
          wellbore_id: body.wellbore_id,
          scenario_id: body.scenario_id,
          diagram_date: body.schematic_date,
        })
        .getRawOneNormalized();

      if (!barrierDiagram) {
        return [];
      }

      const annulusRawData = await this.dbConnection
        .createQueryBuilder()
        .from('CD_ANNULUS_ELEMENT_T', 'CAE')
        .where({
          well_id: body.well_id,
          wellbore_id: body.wellbore_id,
          scenario_id: body.scenario_id,
          barrier_diagram_id: barrierDiagram.barrier_diagram_id,
        })
        .getRawManyNormalized<AnnulusComponentData>();

      const annulusDataResponse: AnnulusComponentData[] = [];
      for (const annulus of annulusRawData) {
        const testData = await this.GetAnnulusTests(annulus);
        annulusDataResponse.push({
          ...annulus,
          maasp_location: testData.maasp_location,
          mawop_location: testData.mawop_location,
          maasp_value: testData.maasp_value,
          mawop_value: testData.mawop_value,
          mop_value: testData.mop_value,
        });
      }
      return annulusDataResponse;
    } catch (err) {
      this.logger.error(
        'An error ocurred while fetching annulus data for wellbore ' +
          body.wellbore_id +
          ' in well ' +
          body.well_id +
          '. Error: ' +
          err,
        err,
      );
      return [];
    }
  }

  /**
   * Returns the latest test information for each annulus (Operative Conditions - MOP, MAWOP, MAASP -)
   * @param annulus
   * @returns
   */
  async GetAnnulusTests(
    annulus: AnnulusComponentData,
  ): Promise<AnnulusLatestTestData> {
    const testData = await this.dbConnection
      .createQueryBuilder()
      .from('CD_ANNULUS_TEST_T', 'CAT')
      .where({
        well_id: annulus.well_id,
        wellbore_id: annulus.wellbore_id,
        scenario_id: annulus.scenario_id,
        barrier_diagram_id: annulus.barrier_diagram_id,
        annulus_element_id: annulus.annulus_element_id,
      })
      .getRawManyNormalized<AnnulustestComponentData>();

    const mopData = testData.find((x) => x.test_type === 'MOP');
    const mawopData = testData.find((x) => x.test_type === 'MAWOP');
    const maaspData = testData.find((x) => x.test_type === 'MAASP');

    const annulusTestData: AnnulusLatestTestData = {
      maasp_location: null,
      maasp_value: null,
      mawop_location: null,
      mawop_value: null,
      mop_value: null,
    };

    if (mopData) {
      annulusTestData.mop_value = mopData.pressure;
    }

    if (mawopData) {
      annulusTestData.mawop_value = mawopData.pressure;
      annulusTestData.mawop_location = mawopData.location;
    }

    if (mawopData) {
      annulusTestData.maasp_value = maaspData.pressure;
      annulusTestData.maasp_location = maaspData.location;
    }

    return annulusTestData;
  }

  /**
   * For a given wellbore, returns the survey stations
   * @param body
   */
  async GetSurveyStations(body: WellSchematicQueryDTO) {
    const scenarioData = await this.schematicHelper.getDesignData(
      body.scenario_id,
      body.well_id,
      body.wellbore_id,
    );

    const rawSurveyData = await this.dbConnection
      .createQueryBuilder()
      .from('CD_DEFINITIVE_SURVEY_STATION', 'DSS')
      .where({
        def_survey_header_id: scenarioData.def_survey_header_id,
      })
      .orderBy('md', 'ASC')
      .getRawManyNormalized();

    return rawSurveyData.map(
      (surveyStation) =>
        ({
          Md: surveyStation.md,
          Inc: surveyStation.inclination,
          Azi: surveyStation.azimuth,
          Tvd: surveyStation.tvd,
          Ns: surveyStation.offset_north,
          Ew: surveyStation.offset_east,
        } as SurveyStation),
    );
  }

  /**
   * Returns the wellbores from the top of the well until bottom of the target wellbore.
   * @param param0 Request query parameters
   * @returns Wellbore Array with from top to bottom.
   */
  async GetWellboreSequence({
    well_id,
    wellbore_id,
  }: WellSchematicQueryDTO): Promise<WellboreData[]> {
    try {
      const wellboreArray: WellboreData[] = [];
      let currentWellboreData;
      do {
        currentWellboreData = await this.dbConnection
          .createQueryBuilder()
          .from('CD_WELLBORE', 'WB')
          .where('WB.WELL_ID = :wellid', { wellid: well_id })
          .andWhere('WB.WELLBORE_ID = :wellboreid', {
            wellboreid: currentWellboreData
              ? currentWellboreData.parent_wellbore_id
              : wellbore_id,
          })
          .getRawOneNormalized<WellboreData>();

        this.logger.log(
          'Appending Wellbore with name ' + currentWellboreData.wellbore_name,
        );

        wellboreArray.push(currentWellboreData);
      } while (currentWellboreData && currentWellboreData.parent_wellbore_id);

      return wellboreArray.reverse();
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }
}
