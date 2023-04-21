import { Injectable, Logger } from '@nestjs/common';
import { Design } from '../interfaces/WellSchematicData';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../interfaces/DTO/WellSchematicQueryDTO';

@Injectable()
export class SchematicHelper {
  private readonly logger = new Logger(SchematicHelper.name);

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
          WELL_ID: well_id,
          WELLBORE_ID: wellbore_id,
          SCENARIO_ID: scenario_id,
        })
        .andWhere('CBEL.REF_ID = :ref_id', { ref_id })
        .select(['CBE.name as barrier_name', 'CBEL.*']);

      if (schematic_date) {
        barriersQuery.andWhere('CBD.diagram_date = :schematic_date', {
          schematic_date,
        });
      }

      const elementBarriers = await barriersQuery.getRawManyNormalized();

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
}
