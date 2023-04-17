import { Injectable, Logger } from '@nestjs/common';
import { Design } from '../interfaces/WellSchematicData';
import { DataSource } from 'typeorm';
//import '../extensions/extensions'

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
  ) {
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
        .andWhere('CBEL.REF_ID = ref_id', { ref_id })
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
}
