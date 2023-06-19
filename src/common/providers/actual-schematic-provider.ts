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
  HoleSectionComponent,
  IntegrityTest,
  CasingComponent,
  Casing,
  AssemblyComponent,
  CementStage,
  Assembly,
  Perforation,
  DerratingData,
  Fluid,
  Log,
} from '../interfaces/WellSchematicData';
import { SchematicProvider } from './SchematicProvider';

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

    wellSchematic.DerratingData = await this.GetDerratingData(body);

    wellSchematic.Catalogs = {
      Catalog: await this.schematicHelper.getCatalogs(), //TODO: This must be migrated to another call. For compatibility purposes we will fetch them here
    };

    wellSchematic.Lithology = {
      Formation: await this.GetLithology(body),
    };

    wellSchematic.Logs = {
      Log: await this.GetLogs(body),
    };

    //Initialize Path Dependant Properties

    wellSchematic.HoleSections = {
      HoleSection: [],
    };

    wellSchematic.Assemblies = {
      Assembly: [],
    };

    wellSchematic.Casings = {
      Casing: [],
    };

    wellSchematic.CementJobs = {
      CementStage: [],
    };

    wellSchematic.Perforations = {
      Perforation: [],
    };

    //Fore each of the wellbores, get the properties and append them to initialized properties
    for (const [index, wellbore] of wellborePathTree.entries()) {
      const nextWellbore = wellborePathTree[index + 1] || undefined;

      wellSchematic.HoleSections.HoleSection = [
        ...wellSchematic.HoleSections.HoleSection,
        ...(await this.GetHoleSections(body, wellbore, nextWellbore)),
      ];

      wellSchematic.Casings.Casing = [
        ...wellSchematic.Casings.Casing,
        ...(await this.GetCasings(body, wellbore, nextWellbore)),
      ];

      wellSchematic.CementJobs.CementStage = [
        ...wellSchematic.CementJobs.CementStage,
        ...(await this.GetCementJobs(body, wellbore, nextWellbore)),
      ];

      wellSchematic.Assemblies.Assembly = [
        ...wellSchematic.Assemblies.Assembly,
        ...(await this.GetAssemblies(body, wellbore, nextWellbore)),
      ];

      wellSchematic.Perforations.Perforation = [
        ...wellSchematic.Perforations.Perforation,
        ...(await this.GetPerforations(body, wellbore, nextWellbore)),
      ];
    }

    //Add Fluid data at the end as it requires data from the full schematic

    wellSchematic.Fluids = {
      Fluid: await this.GetFluids(body, wellSchematic),
    };

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
    try {
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
    } catch (err) {
      this.logger.error(err);
      return [];
    }
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
    try {
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
    } catch (err) {
      this.logger.error(err);
      return [];
    }
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

    try {
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
    } catch (err) {
      this.logger.error(err);
    }
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
    try {
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
    } catch (err) {
      this.logger.error(err);
      return [];
    }
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
  ): Promise<LithologyFormation[]> {
    const { well_id, wellbore_id, scenario_id, schematic_date } = queryData;

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
        .leftJoin(
          'CD_STRAT_UNIT',
          'CSU',
          'WBF.STRAT_UNIT_ID = CSU.STRAT_UNIT_ID',
        )
        .select([
          'WBF.*',
          'FP.tvd_base as actual_tvd_base',
          'FP.tvd_top as actual_tvd_top',
          'FP.md_top as actual_md_top',
          'FP.md_base as actual_md_base',
          'FP.phase as actual_phase',
          'LITH.LITHOLOGY_NAME',
          'CSU.STRAT_UNIT_NAME',
        ])
        .where(
          'SFL.WELL_ID = :wellid AND SFL.WELLBORE_ID = :wellboreId AND SFL.SCENARIO_ID=:scenarioId AND IS_LOG=:isLog',
          { wellid: well_id, wellboreId: wellbore_id, scenarioId: scenario_id , isLog: 'Y'},
        )
        .orderBy('prognosed_md', 'ASC');

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
          Label: formation.strat_unit_name,
          StratUnitName: formation.strat_unit_name,
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
      return [];
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
        'depth_tvd',
      ])
      .getRawManyNormalized<WellboreGradient>()
      .catch((err) => {
        this.logger.error(
          `An error ocurred while fetching gradient from table ${tableName} data for wellbore ` +
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
      const barrierDiagram: any = await this.GetLatestBarrierDiagram(body);

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

  async GetLatestBarrierDiagram(body: WellSchematicQueryDTO) {
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

      return barrierDiagram;
    } catch (err) {
      this.logger.error(
        'An error ocurred while fetching barrier diagram data for wellbore ' +
          body.wellbore_id +
          ' in well ' +
          body.well_id +
          '. Error: ' +
          err,
        err,
      );
      return null;
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
    try {
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
    } catch (err) {
      this.logger.error(
        'An error ocurred while fetching annulus test data for wellbore ' +
          annulus.wellbore_id +
          ' in well ' +
          annulus.well_id +
          '. Error: ' +
          err,
        err,
      );
      return {
        maasp_location: null,
        mawop_location: null,
        maasp_value: null,
        mawop_value: null,
        mop_value: null,
      };
    }
  }

  /**
   * For a given wellbore, returns the survey stations
   * @param body
   */
  async GetSurveyStations(
    body: WellSchematicQueryDTO,
  ): Promise<SurveyStation[]> {
    try {
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
    } catch (err) {
      this.logger.error(
        'An error ocurred while fetching survey stations for wellbore ' +
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

  /**
   * Returns the hole sections associated with a given wellbore
   * @param queryData Query parameters
   * @param wellbore Wellbore data
   * @param isLastWellbore Flag that indicates if the wellbore is the last in the path
   */
  async GetHoleSections(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    nextWellbore: WellboreData,
  ): Promise<HoleSectionComponent[]> {
    try {
      this.logger.log(
        'Fetching hole sections for wellbore ' + wellbore.wellbore_name,
      );

      const holeSectionsQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_HOLE_SECT_GROUP', 'HSG')
        .where('HSG.WELL_ID = :wellid', { wellid: queryData.well_id })
        .andWhere('HSG.WELLBORE_ID = :wellboreid', {
          wellboreid: wellbore.wellbore_id,
        })
        .andWhere('HSG.PHASE = :phase', { phase: 'ACTUAL' })
        .andWhere('HSG.DATE_SECT_START <= :date', {
          date: queryData.schematic_date,
        })
        .orderBy('HSG.MD_HOLE_SECT_TOP', 'ASC');

      if (nextWellbore) {
        holeSectionsQuery.andWhere('md_hole_sect_top <= :md', {
          md: nextWellbore.ko_md,
        });
      }

      const rawHoleSections =
        await holeSectionsQuery.getRawManyNormalized<any>();

      const holeSections: HoleSectionComponent[] = [];
      for (const holeSection of rawHoleSections) {
        const refId = `CdHoleSectGroupT/${queryData.well_id}+${wellbore.wellbore_id}+${holeSection.hole_sect_group_id}`;
        const integrityTests = await this.GetHoleSectionsIntegrityTests(
          wellbore,
          holeSection.hole_sect_group_id,
        );

        if (nextWellbore) {
          holeSection.md_hole_sect_base = Math.min(
            holeSection.md_hole_sect_base,
            nextWellbore.ko_md,
          );
        }

        const holeSectionComp: HoleSectionComponent = {
          ref_id: refId,
          StartMD: holeSection.md_hole_sect_top,
          Length: holeSection.md_hole_sect_base - holeSection.md_hole_sect_top,
          Diameter: await this.schematicHelper.getMaxHoleSectionDiameter(
            holeSection,
          ),
          dateSectEnd: holeSection.date_sect_end,
          name: holeSection.hole_name,
          reference: null,
          IntegrityTest: integrityTests,
        };

        holeSections.push(holeSectionComp);
      }

      return holeSections;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * Returns the integrity tests associated with a given hole section
   * @param queryData
   * @param hole_sect_group_id
   * @returns
   */
  async GetHoleSectionsIntegrityTests(
    wellbore: WellboreData,
    hole_sect_group_id: string,
  ): Promise<IntegrityTest[]> {
    try {
      this.logger.log(
        'Fetching integrity tests for hole section group ' +
          hole_sect_group_id +
          ' in wellbore ' +
          wellbore.wellbore_id +
          ' in well ' +
          wellbore.well_id +
          '.',
      );
      return this.dbConnection
        .createQueryBuilder()
        .from('DM_WELLBORE_INTEG', 'WI')
        .where('WI.WELL_ID = :wellid', { wellid: wellbore.well_id })
        .andWhere('WI.WELLBORE_ID = :wellboreid', {
          wellboreid: wellbore.wellbore_id,
        })
        .andWhere('WI.HOLE_SECT_GROUP_ID = :holesectgroupid', {
          holesectgroupid: hole_sect_group_id,
        })
        .andWhere('WI.TEST_TYPE IS NOT NULL')
        .getRawManyNormalized<IntegrityTest>();
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * Returns the casings associated for a given Wellbore
   * @param queryData
   * @param wellbore
   * @param isLastWellbore
   */
  async GetCasings(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    nextWellbore: WellboreData,
  ): Promise<Casing[]> {
    const activeAssembliesIds =
      await this.schematicHelper.getActiveAssembliesOnDate({
        ...queryData,
        wellbore_id: wellbore.wellbore_id,
      });

    if (activeAssembliesIds.length === 0) {
      return [];
    }

    const rawCasingStringsQuery = this.dbConnection
      .createQueryBuilder()
      .from('CD_ASSEMBLY', 'CD_ASSEMBLY')
      .where('CD_ASSEMBLY.WELL_ID = :wellid', { wellid: queryData.well_id })
      .andWhere('CD_ASSEMBLY.WELLBORE_ID = :wellboreid', {
        wellboreid: wellbore.wellbore_id,
      })
      .andWhere('CD_ASSEMBLY.PHASE = :phase', { phase: 'ACTUAL' })
      .andWhere('CD_ASSEMBLY.CREATE_APP_ID = :createappid', {
        createappid: 'OpenWells',
      })
      .andWhere('CD_ASSEMBLY.STRING_TYPE IN (:...stringtype)', {
        stringtype: ['Casing', 'Liner'],
      })
      .andWhere('CD_ASSEMBLY.ASSEMBLY_ID IN (:...assemblyid)', {
        assemblyid: activeAssembliesIds || [''],
      })
      .orderBy('CD_ASSEMBLY.MD_ASSEMBLY_TOP', 'ASC')
      .orderBy('CD_ASSEMBLY.MD_ASSEMBLY_BASE', 'ASC');

    if (nextWellbore) {
      rawCasingStringsQuery.andWhere('CD_ASSEMBLY.MD_ASSEMBLY_TOP <= :md', {
        md: nextWellbore.ko_md,
      });
    }

    const rawCasingStrings =
      await rawCasingStringsQuery.getRawManyNormalized<any>();

    const casingStrings: Casing[] = [];

    for (const [index, casing] of rawCasingStrings.entries()) {
      const refId = `CdAssemblyT/${casing.well_id}+${casing.wellbore_id}+${casing.assembly_id}`;

      const barriers = await this.schematicHelper.getElementBarriers(
        queryData.well_id,
        queryData.scenario_id,
        queryData.wellbore_id,
        queryData.schematic_date,
        refId,
      );

      const assemblyComponents: CasingComponent[] =
        await this.GetCasingComponents(queryData, casing, nextWellbore);

      if (nextWellbore) {
        casing.md_assembly_base = Math.min(
          casing.md_assembly_base,
          nextWellbore.ko_md,
        );
        casing.tvd_assembly_base = Math.min(
          casing.tvd_assembly_base,
          nextWellbore.ko_tvd,
        );
      }

      const casingString: Casing = {
        ref_id: refId,
        StringType: casing.string_type,
        isCasing: casing.is_casing_liner === 'Y',
        index: index,
        mdAssemblyTop: casing.md_assembly_top,
        mdAssemblyBase: casing.md_assembly_base,
        assemblySize: casing.assembly_size,
        name: casing.assembly_name,
        description: casing.assembly_name,
        AssemblyID: casing.assembly_id,
        TvdAssemblyTop: casing.tvd_assembly_top,
        TvdAssemblyBase: casing.tvd_assembly_base,
        Liner: casing.susp_point,
        Component: assemblyComponents,
        Umbilical: [],
        Jewellery: [],
        Barrier: barriers.map((barrier) => {
          return {
            barrier_id: barrier.barrier_name,
            from: barrier.top_depth
              ? Number((<number>barrier.top_depth).toFixed(1))
              : casing.md_assembly_top,
            to: barrier.base_depth
              ? Number((<number>barrier.base_depth).toFixed(1))
              : casing.md_assembly_base,
            is_combined: barrier.top_depth && barrier.base_depth ? true : false,
          };
        }),
        reference: null,
      };
      casingStrings.push(casingString);
    }
    return casingStrings;
  }

  /**
   * For a given Casing, returns its components
   * @param queryData
   * @param casing
   * @returns
   */
  async GetCasingComponents(
    queryData: WellSchematicQueryDTO,
    casing: any,
    nextWellbore: WellboreData,
  ): Promise<CasingComponent[]> {
    try {
      const rawAssemblyComponentsQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_ASSEMBLY_COMP', 'CD_ASSEMBLY_COMP')
        .where('CD_ASSEMBLY_COMP.WELL_ID = :wellid', {
          wellid: queryData.well_id,
        })
        .andWhere('CD_ASSEMBLY_COMP.WELLBORE_ID = :wellboreid', {
          wellboreid: casing.wellbore_id,
        })
        .andWhere('CD_ASSEMBLY_COMP.ASSEMBLY_ID = :assemblyid', {
          assemblyid: casing.assembly_id,
        })
        .orderBy('CD_ASSEMBLY_COMP.SEQUENCE_NO', 'ASC');

      if (nextWellbore) {
        rawAssemblyComponentsQuery.andWhere('CD_ASSEMBLY_COMP.md_top <= :md', {
          md: nextWellbore.ko_md,
        });
      }

      const rawAssemblyComponents =
        await rawAssemblyComponentsQuery.getRawManyNormalized<any>();

      const assemblyComponents: CasingComponent[] = [];
      for (const component of rawAssemblyComponents) {
        const refId = `CdAssemblyComp_Cas/${casing.well_id}+${casing.wellbore_id}+${casing.assembly_id}+${component.assembly_comp_id}`;

        const barriers = await this.schematicHelper.getElementBarriers(
          queryData.well_id,
          queryData.scenario_id,
          queryData.wellbore_id,
          queryData.schematic_date,
          refId,
        );

        if (nextWellbore) {
          component.md_base = Math.min(component.md_base, nextWellbore.ko_md);
        }

        const assemblyComponent: CasingComponent = {
          ref_id: refId,
          SectType: component.sect_type_code,
          CompType:
            component.comp_type_code === 'LIN'
              ? 'CAS'
              : component.comp_type_code,
          Manufacturer: component.manufacturer,
          Model: component.model,
          description: component.catalog_key_desc,
          StartMD: component.md_top,
          BottomMD: component.md_base,
          JointCount: component.joints,
          Length: component['length'],
          ComponentID: component.assembly_comp_id,
          OD: component.od_body,
          ID: component.id_body,
          GradeID: component.grade_id,
          Grade: component.grade,
          ApproxiWeight: component.approximate_weight,
          CasingSectionName: casing.assembly_name,
          CasingSectionDescription: casing.assembly_name,
          SerialNo: component.serial_no,
          PressRatingTop: component.press_rating_top,
          PressRatingBottom: component.press_rating_bog,
          BurstPressure: component.pressure_burst,
          CollapsePressure: component.pressure_collapse,
          Stretchable: true,
          barrier_id: barriers.map((barrier) => barrier.barrier_name).join(','),
          barrier_from: barriers.length > 0 ? component.md_top : null,
          barrier_to: barriers.length > 0 ? component.md_base : null,
          reference: '',
        };

        assemblyComponents.push(assemblyComponent);
      }
      return assemblyComponents;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * Returns Cement Jobs for a given wellbore
   * @param queryData
   * @param wellbore
   * @param isLastWellbore
   * @returns
   */
  async GetCementJobs(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    nextWellbore: WellboreData,
  ): Promise<CementStage[]> {
    try {
      const casings = await this.GetCasings(queryData, wellbore, nextWellbore);
      const activeAssembliesIds =
        await this.schematicHelper.getActiveAssembliesOnDate({
          ...queryData,
          wellbore_id: wellbore.wellbore_id,
        });

      if (activeAssembliesIds.length === 0) {
        return [];
      }

      const cementStagesQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_CEMENT_JOB', 'CCJ')
        .where('CCJ.WELL_ID = :wellid', { wellid: queryData.well_id })
        .andWhere('CCJ.WELLBORE_ID = :wellboreid', {
          wellboreid: wellbore.wellbore_id,
        })
        .andWhere('CCJ.ASSEMBLY_ID IN (:...assemblyids)', {
          assemblyids: activeAssembliesIds,
        })
        .andWhere('CCJ.JOB_START_DATE <= :date', {
          date: queryData.schematic_date,
        })
        .innerJoin(
          'CD_CEMENT_STAGE',
          'CCS',
          'CCS.WELL_ID = CCJ.WELL_ID AND CCS.WELLBORE_ID = CCJ.WELLBORE_ID AND CCS.CEMENT_JOB_ID = CCJ.CEMENT_JOB_ID',
        )
        .select([
          'CCS.*',
          'CCJ.assembly_id',
          'CCJ.is_drilled_out',
          'CCJ.job_type',
          'CCJ.casing_test_press',
          'CCJ.casing_test_duration',
          'CCJ.test_comments',
          'CCJ.date_report',
          'CCJ.plug_type',
          'CCJ.is_liner_neg_test_tool',
          'CCJ.liner_emw_neg_test',
        ])
        .orderBy('md_top', 'ASC')
        .orderBy('md_base', 'DESC');

      if (nextWellbore) {
        cementStagesQuery.andWhere('CCS.md_top <= :md', {
          md: nextWellbore.ko_md,
        });
      }

      const rawCementStages =
        await cementStagesQuery.getRawManyNormalized<any>();
      const cementStages: CementStage[] = [];

      for (const stage of rawCementStages) {
        const casingIndex = casings.findIndex(
          (casing) => casing.AssemblyID === stage.assembly_id,
        );
        const casing = casings.find(
          (casing) => casing.AssemblyID === stage.assembly_id,
        );

        stage.AssemblyName = casing.name;
        stage.AssemblyOd = casing.assemblySize;

        if (nextWellbore) {
          stage.md_base = Math.min(stage.md_base, nextWellbore.ko_md);
        }

        const refId = `CdCementStageT/${queryData.well_id}+${queryData.wellbore_id}+${stage.cement_job_id}+${stage.cement_stage_id}`;
        const barriers = await this.schematicHelper.getElementBarriers(
          queryData.well_id,
          queryData.scenario_id,
          queryData.wellbore_id,
          queryData.schematic_date,
          refId,
        );

        const cementStage: CementStage = {
          ref_id: refId,
          TopMD: stage.md_top,
          BottomMD: stage.md_base,
          CasingIndex: casingIndex,
          AssemblyID: '', //Mandatory to leave blank
          AssemID: stage.assembly_id,
          Tvd_top: stage.tvd_top,
          Plug: stage.job_type.toUpperCase().includes('PLUG'),
          Drilled: stage.is_drilled_out === 'Y',
          MinimumDiameter: 0,
          BottomOfAssembly: 0,
          description: stage.job_type + ' - ' + stage.AssemblyName,
          AssemblyName: stage.AssemblyName,
          AssemblyOd: stage.AssemblyOd,
          Color: '162,180,185',
          reference: null,
          jobReference: null,
          stageName: stage.job_type,
          CasingTest: stage.casing_test_press,
          CasingTestDuration: stage.casing_test_duration,
          CasingTestComment: stage.test_comments,
          DateReport: stage.date_report,
          PlugType: stage.plug_type,
          LinerNegTestTool: stage.is_liner_neg_test_tool,
          LinerEnwNegTest: stage.liner_emw_neg_test,
          Barrier: barriers.map((barrier) => {
            return {
              barrier_id: barrier.barrier_name,
              from: barrier.top_depth
                ? Number((<number>barrier.top_depth).toFixed(1))
                : stage.md_top,
              to: barrier.base_depth
                ? Number((<number>barrier.base_depth).toFixed(1))
                : stage.md_base,
              is_combined:
                barrier.top_depth && barrier.base_depth ? true : false,
            };
          }),
          barrier_id: barriers.map((barrier) => barrier.barrier_name).join(','),
        };
        cementStages.push(cementStage);
      }

      return cementStages;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * Returns for a given wellbore its assemblies
   * @param queryData
   * @param wellbore
   * @param nextWellbore
   * @returns
   */
  async GetAssemblies(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    nextWellbore: WellboreData,
  ): Promise<Assembly[]> {
    try {
      const activeAssembliesIds =
        await this.schematicHelper.getActiveAssembliesOnDate({
          ...queryData,
          wellbore_id: wellbore.wellbore_id,
        });

      if (activeAssembliesIds.length === 0) {
        return [];
      }
      const assembliesQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_ASSEMBLY', null)
        .where('CD_ASSEMBLY.WELL_ID = :wellid', { wellid: queryData.well_id })
        .andWhere('CD_ASSEMBLY.WELLBORE_ID = :wellboreid', {
          wellboreid: wellbore.wellbore_id,
        })
        .andWhere('CD_ASSEMBLY.PHASE = :phase', { phase: 'ACTUAL' })
        .andWhere('CD_ASSEMBLY.STRING_TYPE NOT IN (:...stringtypes)', {
          stringtypes: ['Casing', 'Liner'],
        })
        .andWhere('CD_ASSEMBLY.ASSEMBLY_ID IN (:...assemblyids)', {
          assemblyids: activeAssembliesIds,
        })
        .select('*')
        .orderBy('MD_ASSEMBLY_TOP', 'ASC')
        .addOrderBy('MD_ASSEMBLY_BASE', 'DESC');

      if (nextWellbore) {
        assembliesQuery.andWhere('CD_ASSEMBLY.MD_ASSEMBLY_BASE < :mdbase', {
          mdbase: nextWellbore.ko_md,
        });
      }

      const rawAssemblies = await assembliesQuery.getRawManyNormalized<any>();
      const assemblies: Assembly[] = [];

      for (const assembly of rawAssemblies) {
        const ref_id = `CdAssemblyT/${assembly.well_id}+${assembly.wellbore_id}+${assembly.assembly_id}`;
        const assemblyComponents: AssemblyComponent[] =
          await this.GetAssemblyComponents(queryData, assembly, nextWellbore);

        if (nextWellbore) {
          assembly.md_assembly_base = Math.min(
            assembly.md_assembly_base,
            nextWellbore.ko_md,
          );
          assembly.tvd_assembly_base = Math.min(
            assembly.tvd_assembly_base,
            nextWellbore.ko_tvd,
          );
        }

        const assemblyData: Assembly = {
          ref_id: ref_id,
          AssemblyID: assembly.assembly_id,
          LocatedInsideID: '',
          Umbilical: [],
          Jewellery: [],
          MinimumID: [],
          Retrievable: [],
          mdAssemblyTop: assembly.md_assembly_top,
          mdAssemblyBase: assembly.md_assembly_base,
          TvdAssemblyTop: assembly.tvd_assembly_top,
          TvdAssemblyBase: assembly.tvd_assembly_base,
          assemblySize: assembly.assembly_size,
          isCasing: assembly.is_casing_liner === 'Y',
          reference: null,
          name: assembly.assembly_name,
          Component: assemblyComponents,
        };

        assemblies.push(assemblyData);
      }
      return assemblies;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  /**
   * For a given assembly, returns its components
   * @param queryData
   * @param assembly
   * @returns
   */
  async GetAssemblyComponents(
    queryData: WellSchematicQueryDTO,
    assembly: any,
    nextWellbore: WellboreData,
  ): Promise<AssemblyComponent[]> {
    try {
      const rawAssemblyComponentsQuery = await this.dbConnection
        .createQueryBuilder()
        .from('CD_ASSEMBLY_COMP', 'CD_ASSEMBLY_COMP')
        .where('CD_ASSEMBLY_COMP.WELL_ID = :wellid', {
          wellid: queryData.well_id,
        })
        .andWhere('CD_ASSEMBLY_COMP.WELLBORE_ID = :wellboreid', {
          wellboreid: assembly.wellbore_id,
        })
        .andWhere('CD_ASSEMBLY_COMP.ASSEMBLY_ID = :assemblyid', {
          assemblyid: assembly.assembly_id,
        })
        .orderBy('CD_ASSEMBLY_COMP.SEQUENCE_NO', 'ASC');

      if (nextWellbore) {
        rawAssemblyComponentsQuery.andWhere(
          'CD_ASSEMBLY_COMP.MD_TOP < :mdbase',
          { mdbase: nextWellbore.ko_md },
        );
      }

      const rawAssemblyComponents =
        await rawAssemblyComponentsQuery.getRawManyNormalized<any>();
      const assemblyComponents: CasingComponent[] = [];
      for (const [index, component] of rawAssemblyComponents.entries()) {
        const refId = `CdAssemblyCompT_${component.sect_type_code.toUpperCase()}/${
          component.well_id
        }+${component.wellbore_id}+${component.assembly_id}+${
          component.assembly_comp_id
        }`;

        const barriers = await this.schematicHelper.getElementBarriers(
          queryData.well_id,
          queryData.scenario_id,
          queryData.wellbore_id,
          queryData.schematic_date,
          refId,
        );

        //TODO: Refactor this
        const WEQP_SSSV = await this.GetAssemblySSSVInformation(
          component.assembly_comp_id,
        );
        const packer = await this.GetAssemblyPackerInformation(
          component.assembly_comp_id,
        );

        if (nextWellbore) {
          component.md_top = Math.min(component.md_top, nextWellbore.ko_md);
          component.md_base = Math.min(component.md_base, nextWellbore.ko_md);
        }

        //If CompType is TH and SectType is WBEQP and Length is less than 1, then Length is 1
        const actualLength = component['length'];
        if (
          ['TH', 'FLTH'].includes(component.comp_type_code) &&
          component['length'] < 1
        ) {
          component['length'] = 1;
        }

        const assemblyComponent: AssemblyComponent = {
          ref_id: refId,
          SectType: component.sect_type_code,
          CompType: component.comp_type_code,
          assemblyName: assembly.assembly_name,
          StartMD: component.md_top,
          BottomMD: component.md_base,
          Length: component['length'],
          ActualLength: actualLength,
          OD: component.od_body,
          ID: component.id_body,
          ComponentID: component.assembly_comp_id,
          RecordOpenPress: WEQP_SSSV.recorded_opening_pressure,
          MaximunHydraulics: WEQP_SSSV.maximum_hydraulics_pressure,
          RecordClosePress: WEQP_SSSV.recorded_closing_pressure,
          NominalPress: WEQP_SSSV.nominal_opening_pressure,
          FunctionTestPass: WEQP_SSSV.function_test_pass_fail,
          PressureTestAbove: packer.pressure_test_above,
          PressureTestBelow: packer.pressure_test_below,
          Manufacturer: component.manufacturer,
          Model: component.model,
          SectionName: assembly.assembly_name,
          SectionDescription: assembly.assembly_name,
          PressRatingTop: component.press_rating_top,
          CollapsePressure: component.pressure_collapse,
          BurstPressure: component.pressure_burst,
          ItemDescription: component.catalog_key_desc,
          barrier_id: barriers.map((barrier) => barrier.barrier_name).join(','),
          barrier_from: barriers.length > 0 ? component.md_top + 0.01 : null,
          barrier_to: barriers.length > 0 ? component.md_base - 0.01 : null,
          is_barrier_closed_at_top: index == 0,
          is_barrier_closed_at_bottom:
            index == rawAssemblyComponents.length - 1,
          include_seals: true,
          reference: '',
          description: component.description,
          ApproximateWeight: component.approximate_weight,
          GradeId: component.grade,
          Joints: component.joints,
        };

        assemblyComponents.push(assemblyComponent);
      }
      return assemblyComponents;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  async GetAssemblySSSVInformation(assembly_comp_id: string) {
    const ssvInformation = await this.dbConnection
      .createQueryBuilder()
      .from('CD_ASSEMBLY_COMP', null)
      .leftJoin(
        'CD_WEQP_SSSV',
        'CD_WEQP_SSSV',
        'CD_WEQP_SSSV.assembly_comp_id = CD_ASSEMBLY_COMP.assembly_comp_id',
      )
      .where('CD_ASSEMBLY_COMP.assembly_comp_id = :assembly_comp_id', {
        assembly_comp_id: assembly_comp_id,
      })
      .select('CD_WEQP_SSSV.*')
      .getRawOneNormalized();

    return ssvInformation;
  }

  async GetAssemblyPackerInformation(assembly_comp_id: string) {
    const packerInformation = await this.dbConnection
      .createQueryBuilder()
      .from('CD_ASSEMBLY_COMP', null)
      .leftJoin(
        'CD_WEQP_PACKER',
        'CD_WEQP_PACKER',
        'CD_WEQP_PACKER.assembly_comp_id = CD_ASSEMBLY_COMP.assembly_comp_id',
      )
      .where('CD_ASSEMBLY_COMP.assembly_comp_id = :assembly_comp_id', {
        assembly_comp_id: assembly_comp_id,
      })
      .select('CD_WEQP_PACKER.*')
      .getRawOneNormalized();

    return packerInformation;
  }

  /**
   * For a given wellbore, retrieves its perforations that are above the KO_MD of the next wellbore. If no next wellbore provided
   * it will return all the open perforations assocciated with the wellbore.
   * @param queryData
   * @param wellbore
   * @param nextWellbore
   * @returns
   */
  async GetPerforations(
    queryData: WellSchematicQueryDTO,
    wellbore: WellboreData,
    nextWellbore: WellboreData,
  ) {
    try {
      const rawPerforationsQuery = this.dbConnection
        .createQueryBuilder()
        .from('CD_WELLBORE_OPENING', null)
        .innerJoin(
          'CD_OPENING_STATUS',
          'CD_OPENING_STATUS',
          'CD_OPENING_STATUS.wellbore_opening_id = CD_WELLBORE_OPENING.wellbore_opening_id',
        )
        .where('CD_WELLBORE_OPENING.well_id = :well_id', {
          well_id: queryData.well_id,
        })
        .andWhere('CD_WELLBORE_OPENING.wellbore_id = :wellbore_id', {
          wellbore_id: wellbore.wellbore_id,
        })
        .andWhere('CD_OPENING_STATUS.effective_date <= :effective_date', {
          effective_date: queryData.schematic_date,
        })
        .select('CD_WELLBORE_OPENING.*, CD_OPENING_STATUS.status');

      if (nextWellbore) {
        rawPerforationsQuery.andWhere('CD_WELLBORE_OPENING.md_top <= :md_top', {
          md_top: wellbore.ko_md,
        });
      }

      const rawPerforations = await rawPerforationsQuery.getRawManyNormalized();

      const perforations: Perforation[] = [];

      for (const perforation of rawPerforations) {
        const refId = `CdWellboreOpeningT/${queryData.well_id}+${wellbore.wellbore_id}`;

        if (nextWellbore) {
          perforation.md_base = Math.min(perforation.md_base, wellbore.ko_md);
        }

        const perforationData: Perforation = {
          ref_id: refId,
          StartMD: perforation.md_top,
          EndMD: perforation.md_base,
          Key: '00003',
          Status: perforation.status,
          name: '',
        };

        perforations.push(perforationData);
      }
      return perforations;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  async GetFluids(
    queryData: WellSchematicQueryDTO,
    wellSchematic: WellSchematic,
  ): Promise<Fluid[]> {
    try {
      const drillingFluid = await this.GetDrillingFluids(queryData);

      const fluidRawData: any[] = [];

      if (!drillingFluid) {
        let annulusFluids = await this.GetAnnulusFluids(queryData);

        if (annulusFluids.length > 0) {
          annulusFluids = annulusFluids.map((fluid) => {
            fluid['type'] = 'COMPLETION';
            return fluid;
          });
        }

        fluidRawData.push(...annulusFluids);
      } else {
        const survey = await this.GetSurveyStations(queryData);
        const wellDepth = survey[survey.length - 1].Md;

        const singleFluid: any = {
          well_id: drillingFluid['well_id'],
          wellbore_id: drillingFluid['wellbore_id'],
          install_date: drillingFluid['check_date'],
          fluid_density: drillingFluid['density'],
          fluid_type: drillingFluid['fluid_name'],
          event_id: drillingFluid['event_id'],
          type: 'DRILLING',
          fluid_id: drillingFluid['fluid_id'],
          md_base: wellDepth,
        };
        fluidRawData.push(singleFluid);
      }

      const fluidData: Fluid[] = [];

      const depths = wellSchematic.ReferenceDepths;
      const casings = wellSchematic.Casings.Casing;
      const lastCasingIndex = casings.length - 1;

      for (const fluidItem of fluidRawData) {
        let refId;
        if (fluidItem.type === 'COMPLETION') {
          refId = `CdFluidT/${fluidItem.well_id}+${fluidItem.wellbore_id}+${fluidItem.event_id}+${fluidItem.completion_fluid_id}`;
        } else {
          refId = `CdFluidT/${fluidItem.well_id}+${fluidItem.wellbore_id}+${fluidItem.event_id}+${fluidItem.fluid_id}`;
        }

        const barriers = await this.schematicHelper.getElementBarriers(
          queryData.well_id,
          queryData.scenario_id,
          queryData.wellbore_id,
          queryData.schematic_date,
          refId,
        );

        const color = 'rgb(212, 160, 49)';
        const startDepth =
          fluidItem.type == 'COMPLETION'
            ? Number(fluidItem.md_top)
            : Number(-depths.DatumElevation) + Number(depths.AirGap);

        const fluidDataItem: Fluid = {
          ref_id: refId,
          StartDepth: startDepth,
          EndDepth: fluidItem.md_base,
          RealEndDepth: fluidItem.md_base,
          InsideOpenHole: false,
          InsideCasing: fluidItem.type !== 'COMPLETION',
          InsideTubing: false,
          CasingIndex: lastCasingIndex,
          description: fluidItem.fluid_type,
          FluidDensity: fluidItem.fluid_density,
          TubingId: '',
          Color: color,
          FluidType: fluidItem.fluid_type,
          Barrier: barriers.map((barrier) => {
            return {
              barrier_id: barrier.barrier_name,
              from:
                fluidItem.type == 'COMPLETION'
                  ? fluidItem.md_top
                  : -depths.DatumElevation,
              to: fluidItem.md_base,
            };
          }),
        };

        fluidData.push(fluidDataItem);
      }

      return fluidData;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  async GetDrillingFluids(queryData: WellSchematicQueryDTO) {
    const schematicStartDate = new Date(
      new Date(queryData.schematic_date).setHours(0, 0, 0),
    );

    const schematicEndDate = new Date(
      new Date(queryData.schematic_date).setHours(23, 59, 59),
    );

    const drillingFluid = await this.dbConnection
      .createQueryBuilder()
      .from('CD_FLUID', null)
      .where('CD_FLUID.well_id = :well_id', { well_id: queryData.well_id })
      .andWhere('CD_FLUID.wellbore_id = :wellbore_id', {
        wellbore_id: queryData.wellbore_id,
      })
      .andWhere('CD_FLUID.check_date <= :check_date_max', {
        check_date_max: schematicEndDate,
      })
      .andWhere('CD_FLUID.check_date >= :check_date_min', {
        check_date_min: schematicStartDate,
      })
      .orderBy('CD_FLUID.check_date', 'DESC')
      .getRawOneNormalized();

    return drillingFluid;
  }

  async GetAnnulusFluids(queryData: WellSchematicQueryDTO) {
    const schematicStartDate = new Date(
      new Date(queryData.schematic_date).setHours(0, 0, 0),
    );

    const schematicEndDate = new Date(
      new Date(queryData.schematic_date).setHours(23, 59, 59),
    );

    const annularFluidDate = await this.dbConnection
      .createQueryBuilder()
      .from('CD_COMPLETION_FLUID', null)
      .where('CD_COMPLETION_FLUID.well_id = :well_id', {
        well_id: queryData.well_id,
      })
      .andWhere('CD_COMPLETION_FLUID.wellbore_id = :wellbore_id', {
        wellbore_id: queryData.wellbore_id,
      })
      .andWhere('CD_COMPLETION_FLUID.install_date <= :install_date', {
        install_date: schematicStartDate,
      })
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('CD_COMPLETION_FLUID.removal_date >= :removal_date', {
              removal_date: schematicEndDate,
            })
            .orWhere('CD_COMPLETION_FLUID.removal_date IS NULL'),
        ),
      )
      .orderBy('CD_COMPLETION_FLUID.install_date', 'DESC')
      .getRawOneNormalized()
      .then((data) => {
        if (data) {
          return data.install_date;
        } else {
          return null;
        }
      });

    if (!annularFluidDate) {
      return [];
    }

    const annularFluidStartDate = new Date(
      new Date(annularFluidDate).setHours(0, 0, 0),
    );

    const annularFluidEndDate = new Date(
      new Date(annularFluidDate).setHours(23, 59, 59),
    );

    const annularFluids = await this.dbConnection
      .createQueryBuilder()
      .from('CD_COMPLETION_FLUID', null)
      .where('CD_COMPLETION_FLUID.well_id = :well_id', {
        well_id: queryData.well_id,
      })
      .andWhere('CD_COMPLETION_FLUID.wellbore_id = :wellbore_id', {
        wellbore_id: queryData.wellbore_id,
      })
      .andWhere('CD_COMPLETION_FLUID.install_date <= :install_date_max', {
        install_date_max: annularFluidEndDate,
      })
      .andWhere('CD_COMPLETION_FLUID.install_date >= :install_date_min', {
        install_date_min: annularFluidStartDate,
      })
      .andWhere(
        new Brackets((qb) => {
          return qb
            .where('CD_COMPLETION_FLUID.removal_date >= :removal_date', {
              removal_date: schematicStartDate,
            })
            .orWhere('CD_COMPLETION_FLUID.removal_date IS NULL');
        }),
      )
      .orderBy('CD_COMPLETION_FLUID.install_date', 'DESC')
      .getRawManyNormalized();

    return annularFluids;
  }

  async GetLogs(body: WellSchematicQueryDTO) {
    const logsRaw = await this.dbConnection
      .createQueryBuilder()
      .from('DM_LOG_INTERVAL', null)
      .leftJoin('DM_LOG', 'DM_LOG', 'DM_LOG_INTERVAL.log_id= DM_LOG.log_id')
      .leftJoin(
        'DM_LOG_DESC',
        'DM_LOG_DESC',
        'DM_LOG.log_id =DM_LOG_DESC.log_id',
      )
      .leftJoin(
        'PL_LOG_INTERVAL_EXT',
        'PL_LOG_INTERVAL_EXT',
        'PL_LOG_INTERVAL_EXT.log_interval_id = DM_LOG_INTERVAL.log_interval_id',
      )
      .where('DM_LOG_INTERVAL.well_id = :well_id', { well_id: body.well_id })
      .andWhere('DM_LOG_INTERVAL.wellbore_id = :wellbore_id', {
        wellbore_id: body.wellbore_id,
      })
      .select(
        'DM_LOG_INTERVAL.*, DM_LOG.reason, DM_LOG_DESC.comments, PL_LOG_INTERVAL_EXT.assembly_name',
      )
      .getRawManyNormalized();

    const logs = logsRaw.map((log) => {
      return {
        log_date: log.log_date,
        service: log.service,
        md_top: log.md_top,
        md_base: log.md_base,
        reason: log.reason,
        assembly_name: log.assembly_name,
        comments: JSON.stringify(log.comments),
      } as Log;
    });

    return logs;
  }

  /**
   * Returns the derrating data for a given wellbore
   * @param body
   */
  async GetDerratingData(body: WellSchematicQueryDTO) {
    const derratingData = await this.dbConnection
      .createQueryBuilder()
      .from('CD_PRESSURE_SURVEY', 'CPS')
      .innerJoin(
        'DM_REPORT_JOURNAL',
        'DRJ',
        'CPS.report_journal_id = DRJ.report_journal_id',
      )
      .innerJoin(
        'PL_FINAL_LOAD_SIMM',
        'PFLS',
        'CPS.PRESSURE_SURVEY_ID = PFLS.PRESSURE_SURVEY_ID',
      )
      .andWhere('CPS.WELL_ID = :WELL_ID', { WELL_ID: body.well_id })
      .andWhere('CPS.wellbore_id = :wellbore_id', {
        wellbore_id: body.wellbore_id,
      })
      .andWhere('DRJ.date_report <= :date_report', {
        date_report: body.schematic_date,
      })
      .select('PFLS.*')
      .orderBy('DRJ.date_report', 'ASC')
      .orderBy('PFLS.sequence_no', 'ASC')
      .getRawManyNormalized<DerratingData>();

    return derratingData;
  }
}
