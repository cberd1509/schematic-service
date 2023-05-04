import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../common/interfaces/DTO/WellSchematicQueryDTO';
import { ActualSchematicProvider } from '../common/providers/actual-schematic-provider';
import { DesignSchematicProvider } from '../common/providers/design-schematic-provider';
import { SchematicHelper } from '../common/providers/schematic-helper';
import { AnnulusEvaluationDTO } from '../common/interfaces/DTO/AnnulusEvaluationDTO';

@Injectable()
export class WellSchematicService {
  private readonly logger = new Logger(WellSchematicService.name);

  constructor(
    dataSource: DataSource,
    private schematicHelper: SchematicHelper,
    private actualSchematicProvider: ActualSchematicProvider,
    private designSchematicProvider: DesignSchematicProvider,
  ) {}

  async getWellSchematic({
    scenario_id,
    well_id,
    schematic_date,
    wellbore_id,
  }: WellSchematicQueryDTO) {
    const design = await this.schematicHelper.getDesignData(
      scenario_id,
      well_id,
      wellbore_id,
    );

    if (!design) {
      return null;
    }

    if (design.phase === 'ACTUAL') {
      this.logger.log('Getting actual schematic data');
      return this.actualSchematicProvider.getWellSchematic({
        scenario_id,
        well_id,
        schematic_date,
        wellbore_id,
      });
    } else {
      this.logger.log('Getting planned design schematic data');
      return this.designSchematicProvider.getWellSchematic({
        scenario_id,
        well_id,
        schematic_date,
        wellbore_id,
      });
    }
  }

  async getBarriers(body: WellSchematicQueryDTO){
    return this.schematicHelper.getAllBarriersWithElements(body);
  }

  async getBarrierDiagrams(body: WellSchematicQueryDTO){
    return this.schematicHelper.getBarrierDiagrams(body);
  }
}
