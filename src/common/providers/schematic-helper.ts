import { Injectable, Logger, Scope } from '@nestjs/common';
import { BarrierData, Design } from '../interfaces/WellSchematicData';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../interfaces/DTO/WellSchematicQueryDTO';
import { BarriersEvaluationDTO } from '../interfaces/DTO/BarriersEvaluationDTO';
import { BarrierDiagramData } from '../interfaces/BarrierDiagramData';
import * as StringUtils from '../../common/util/StringUtils';

@Injectable({ scope: Scope.REQUEST })
export class SchematicHelper {
  private readonly logger = new Logger(SchematicHelper.name);
  barriersMap: Map<string, BarrierData[]>;

  constructor(private dataSource: DataSource) {}

  /**
   * Returns information of the specific scenario based on Scenario ID, Well ID and Wellbore ID
   * @param scenario_id
   * @param well_id
   * @param wellbore_id
   * @returns
   */
  async getDesignData(
    scenario_id: string,
    well_id: string,
    wellbore_id: string,
  ): Promise<Design> {
    this.logger.log('Getting design data');

    try {
      const design = await this.dataSource
        .createQueryBuilder()
        .select('*')
        .from('CD_SCENARIO', null)
        .where(
          'SCENARIO_ID = :scenario_id AND WELL_ID = :well_id AND WELLBORE_ID = :wellbore_id',
          { scenario_id, well_id, wellbore_id },
        )
        .getRawOneNormalized();

      if (!design) {
        this.logger.error('No design data found');
        return null;
      }
      this.logger.log(
        'Design data retrieved, current design phase is ' + design.phase,
      );
      return design;
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }

  async getAllBarriersWithElements(body: WellSchematicQueryDTO) {
    const elements = await this.dataSource
      .createQueryBuilder()
      .from('CD_BARRIER_DIAGRAM_T', 'CBD')
      .innerJoin(
        'CD_BARRIER_ENVELOPE_T',
        'CBE',
        'CBD.WELL_ID = CBE.WELL_ID AND CBD.WELLBORE_ID = CBE.WELLBORE_ID AND CBD.SCENARIO_ID = CBE.SCENARIO_ID AND CBD.BARRIER_DIAGRAM_ID = CBE.BARRIER_DIAGRAM_ID',
      )
      .innerJoin(
        'CD_BARRIER_ELEMENT_T',
        'CBEL',
        'CBE.WELL_ID = CBEL.WELL_ID AND CBE.WELLBORE_ID = CBEL.WELLBORE_ID AND CBE.SCENARIO_ID = CBEL.SCENARIO_ID AND CBE.BARRIER_ENVELOPE_ID = CBEL.BARRIER_ENVELOPE_ID AND CBE.BARRIER_DIAGRAM_ID = CBEL.BARRIER_DIAGRAM_ID',
      )
      .where('CBD.WELL_ID = :well_id', { well_id: body.well_id })
      .andWhere('CBD.WELLBORE_ID = :wellbore_id', {
        wellbore_id: body.wellbore_id,
      })
      .andWhere('CBD.SCENARIO_ID = :scenario_id', {
        scenario_id: body.scenario_id,
      })
      .select([
        'CBE.name as barrier_id',
        'CBEL.ref_id',
        'CBEL.element_type as type',
        'CBEL.barrier_envelope_id',
        'CBEL.barrier_diagram_id',
        'CBEL.barrier_element_id',
        'CBEL.top_depth',
        'CBEL.base_depth',
      ])
      .andWhere('CBD.diagram_date = :diagram_date', {
        diagram_date: body.schematic_date,
      })
      .getRawManyNormalized();

    const finalElements: any[] = [];
    for (let element of elements) {
      const elementHistory = await this.dataSource
        .createQueryBuilder()
        .from('CD_BARRIER_ENV_TEST_LINK_T', 'CBETESTLINK')
        .where('CBETESTLINK.BARRIER_ENVELOPE_ID = :barrier_envelope_id', {
          barrier_envelope_id: element.barrier_envelope_id,
        })
        .andWhere('CBETESTLINK.BARRIER_DIAGRAM_ID = :barrier_diagram_id', {
          barrier_diagram_id: element.barrier_diagram_id,
        })
        .andWhere('CBETESTLINK.BARRIER_ELEMENT_ID = :barrier_element_id', {
          barrier_element_id: element.barrier_element_id,
        })
        .orderBy('CBETESTLINK.LAST_TEST_DATE', 'DESC')
        .getRawManyNormalized();

      let lastElementEvaluation;
      if (elementHistory.length === 0) lastElementEvaluation = {};
      else lastElementEvaluation = elementHistory[0];

      let lastEnvelopeEvaluation: any = {};

      if (elementHistory.length !== 0) {
        lastEnvelopeEvaluation = await this.dataSource
          .createQueryBuilder()
          .from('CD_BARRIER_ENVELOPE_TEST_T', 'CBETEST')
          .where('CBETEST.BARRIER_ENVELOPE_ID = :barrier_envelope_id', {
            barrier_envelope_id: element.barrier_envelope_id,
          })
          .andWhere('CBETEST.BARRIER_DIAGRAM_ID = :barrier_diagram_id', {
            barrier_diagram_id: element.barrier_diagram_id,
          })
          .andWhere(
            'CBETEST.BARRIER_ENVELOPE_TEST_ID = :barrier_envelope_test_id',
            {
              barrier_envelope_test_id:
                lastElementEvaluation.barrier_envelope_test_id,
            },
          )
          .orderBy('CBETEST.LAST_TEST_DATE', 'DESC')
          .getRawOneNormalized();
      }

      element = {
        ...element,
        status: lastElementEvaluation.status,
        details: lastElementEvaluation.details,
        component_ovality: lastElementEvaluation.component_ovality,
        component_wearing: lastElementEvaluation.component_wearing,
        last_test_date: lastElementEvaluation.last_test_date,
        create_user: lastEnvelopeEvaluation.create_user,
        elementHistory: [],
      };

      finalElements.push(element);
    }

    return finalElements;
  }

  /**
   * Returns all the barriers for a given diagram
   * @param body Query Params
   */
  async getAllBarriers(body: WellSchematicQueryDTO) {
    if (this.barriersMap) {
      return this.barriersMap;
    }

    this.barriersMap = new Map<string, BarrierData[]>();

    const barriersQuery = this.dataSource
      .createQueryBuilder()
      .from('CD_BARRIER_DIAGRAM_T', 'CBD')
      .innerJoin(
        'CD_BARRIER_ENVELOPE_T',
        'CBE',
        'CBD.BARRIER_DIAGRAM_ID = CBE.BARRIER_DIAGRAM_ID AND CBD.WELL_ID = CBE.WELL_ID AND CBD.WELLBORE_ID = CBE.WELLBORE_ID AND CBD.SCENARIO_ID = CBE.SCENARIO_ID',
      )
      .innerJoin(
        'CD_BARRIER_ELEMENT_T',
        'CBEL',
        'CBE.BARRIER_ENVELOPE_ID = CBEL.BARRIER_ENVELOPE_ID AND CBE.WELL_ID = CBEL.WELL_ID AND CBE.WELLBORE_ID = CBEL.WELLBORE_ID AND CBE.SCENARIO_ID = CBEL.SCENARIO_ID AND CBEL.BARRIER_DIAGRAM_ID = CBE.BARRIER_DIAGRAM_ID',
      )
      .where({
        WELL_ID: body.well_id,
        WELLBORE_ID: body.wellbore_id,
        SCENARIO_ID: body.scenario_id,
      })
      //.andWhere('CBEL.REF_ID = :ref_id', { ref_id })
      .select(['CBE.name as barrier_name', 'CBEL.*']);

    if (body.schematic_date) {
      barriersQuery.andWhere('CBD.diagram_date = :schematic_date', {
        schematic_date: body.schematic_date,
      });
    }

    const elementBarriers = await barriersQuery.getRawManyNormalized();

    // Map elements to array items
    elementBarriers.forEach((element) => {
      const mapKey = `${element.ref_id} - ${body.schematic_date}`;
      if (this.barriersMap.has(mapKey)) {
        this.barriersMap.get(mapKey).push(element);
      } else {
        this.barriersMap.set(mapKey, [element]);
      }
    });

    // Return elementBarriers
    return this.barriersMap;
  }

  async getBarrierDiagrams(body: WellSchematicQueryDTO) {
    return this.dataSource
      .createQueryBuilder()
      .from('CD_BARRIER_DIAGRAM_T', 'CBD')
      .where({
        WELL_ID: body.well_id,
        WELLBORE_ID: body.wellbore_id,
        SCENARIO_ID: body.scenario_id,
      })
      .select(['CBD.*'])
      .orderBy('CBD.diagram_date', 'ASC')
      .getRawManyNormalized();
  }

  /**
   * For a given element, returns the list of barriers that are associated with it
   * @param well_id
   * @param scenario_id
   * @param wellbore_id
   * @param schematic_date
   * @param ref_id
   * @returns
   */
  async getElementBarriers(
    well_id: string,
    scenario_id: string,
    wellbore_id: string,
    schematic_date: Date,
    ref_id: string,
  ): Promise<any[]> {
    this.logger.log('Getting element barriers data ' + ref_id);

    try {
      const mapKey = `${ref_id} - ${schematic_date}`;
      const barriersMap = await this.getAllBarriers({
        well_id,
        wellbore_id,
        scenario_id,
        schematic_date,
      });

      const elementBarriers = barriersMap.get(mapKey);

      if (!elementBarriers) {
        this.logger.warn('No element barriers data found');
        return [];
      }
      this.logger.log(
        'Element barriers data retrieved successfully for element ' +
          ref_id +
          ' with ' +
          elementBarriers.length +
          ' barriers',
      );
      return elementBarriers;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  async getMaxHoleSectionDiameter(holeSection: any): Promise<number> {
    return await this.dataSource
      .createQueryBuilder()
      .from('CD_HOLE_SECT', null)
      .where({
        well_id: holeSection.well_id,
        wellbore_id: holeSection.wellbore_id,
        hole_sect_group_id: holeSection.hole_sect_group_id,
        sect_type_code: 'OH',
      })
      .andWhere('hole_size IS NOT NULL')
      .orderBy('length', 'DESC')
      .limit(1)
      .getRawOneNormalized()
      .then((value) => {
        if (value) return value.hole_size;
        else return 0;
      });
  }

  async getCatalogs(): Promise<any> {
    return await this.dataSource
      .createQueryBuilder()
      .from('CD_CSG_CATALOG', null)
      .innerJoin(
        'CD_GRADE',
        'CD_GRADE',
        'CD_CSG_CATALOG.grade_id = CD_GRADE.grade_id',
      )
      .select([
        'od_body',
        'nominal_weight',
        'grade',
        'internal_yield_press',
        'collapse_resistance',
      ])
      .getRawManyNormalized();
  }

  async getActiveAssembliesOnDate(queryData: WellSchematicQueryDTO) {
    const query = await this.dataSource
      .createQueryBuilder()
      .from('CD_ASSEMBLY_STATUS', null)

      .innerJoin(
        (subQuery) => {
          return subQuery
            .from('CD_ASSEMBLY_STATUS', null)
            .where('date_status <= :date', { date: queryData.schematic_date })
            .select(
              'assembly_id,well_id,wellbore_id,max(date_status) as max_date',
            )
            .groupBy('assembly_id,well_id,wellbore_id');
        },
        'Q1',
        `Q1.assembly_id = CD_ASSEMBLY_STATUS.assembly_id AND 
         Q1.well_id = CD_ASSEMBLY_STATUS.well_id AND 
         Q1.wellbore_id = CD_ASSEMBLY_STATUS.wellbore_id 
         AND Q1.max_date = CD_ASSEMBLY_STATUS.date_status`,
      )
      .where('CD_ASSEMBLY_STATUS.well_id = :wellId', {
        wellId: queryData.well_id,
      })
      .andWhere('CD_ASSEMBLY_STATUS.wellbore_id = :wellboreId', {
        wellboreId: queryData.wellbore_id,
      })
      .andWhere('CD_ASSEMBLY_STATUS.status = :status', { status: 'INSTALLED' })
      .select('CD_ASSEMBLY_STATUS.assembly_id');

    return await query
      .getRawManyNormalized()
      .then((value: any) => value.map((x) => x.assembly_id));
  }

  async getLastDailyreport(queryData: WellSchematicQueryDTO) {
    return await this.dataSource
      .createQueryBuilder()
      .from('DM_DAILY', null)
      .where('well_id = :wellId', { wellId: queryData.well_id })
      .andWhere('wellbore_id = :wellboreId', {
        wellboreId: queryData.wellbore_id,
      })
      .andWhere('date_report <= :date', { date: queryData.schematic_date })
      .orderBy('date_report', 'DESC')
      .limit(1)
      .getRawOneNormalized();
  }

  getBarrierStatus(elements: BarriersEvaluationDTO[]) {
    for (const component of elements) {
      if (component.status === 'No Efectivas' || component.status == null)
        return 'No Efectivas';
    }
    for (const component of elements) {
      if (component.status === 'Parcialmente Efectivas')
        return 'Parcialmente Efectivas';
    }
    return 'Efectivas';
  }

  /**
   *
   * @param well_id
   * @param wellbore_id
   * @param schematic_date
   */
  async getOrCreatBarrierDiagram(
    well_id: string,
    wellbore_id: string,
    scenario_id: string,
    schematic_date: Date,
  ): Promise<BarrierDiagramData> {
    const barrierDiagram = await this.dataSource
      .createQueryBuilder()
      .from('CD_BARRIER_DIAGRAM_T', null)
      .where('well_id=:well_id', { well_id: well_id })
      .andWhere('wellbore_id=:wellbore_id', { wellbore_id: wellbore_id })
      .andWhere('scenario_id=:scenario_id', { scenario_id: scenario_id })
      .andWhere('diagram_date=:diagram_date', { diagram_date: schematic_date })
      .getRawOneNormalized();

    if (barrierDiagram) {
      return barrierDiagram;
    } else {
      const barrierDiagramId = StringUtils.makeId(5);
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_BARRIER_DIAGRAM_T')
        .values({
          WELL_ID: well_id,
          WELLBORE_ID: wellbore_id,
          SCENARIO_ID: scenario_id,
          DIAGRAM_DATE: schematic_date,
          BARRIER_DIAGRAM_ID: barrierDiagramId,
        })
        .execute();

        return await this.dataSource.createQueryBuilder()
        .from('CD_BARRIER_DIAGRAM_T', null)
        .where("barrier_diagram_id = :barrier_diagram_id", { barrier_diagram_id: barrierDiagramId })
        .getRawOneNormalized();
    }
  }
}
