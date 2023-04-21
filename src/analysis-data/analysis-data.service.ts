import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../common/interfaces/DTO/WellSchematicQueryDTO';

@Injectable()
export class AnalysisDataService {
  private readonly logger = new Logger(AnalysisDataService.name);

  constructor(private dataSource: DataSource) {}

  getExistingReports(body: WellSchematicQueryDTO) {
    return this.dataSource
      .createQueryBuilder()
      .from('WF_ANALYSIS_REPORT', null)
      .where('WELL_ID = :well_id', { well_id: body.well_id })
      .andWhere('WELLBORE_ID = :wellbore_id', { wellbore_id: body.wellbore_id })
      .getRawManyNormalized();
  }

  getWellEvents(wellId: string) {
    return this.dataSource
      .createQueryBuilder()
      .from('DM_EVENT', null)
      .where('WELL_ID = :wellId', { wellId: wellId })
      .andWhere('date_ops_start IS NOT NULL')
      .andWhere('date_ops_end IS NOT NULL')
      .orderBy('date_ops_start', 'DESC')
      .getRawManyNormalized();
  }

  getWellData(wellId: string) {
    return this.dataSource
      .createQueryBuilder()
      .from('CD_WELL_SOURCE', 'CWS')
      .where('CWS.WELL_ID = :wellId', { wellId: wellId })
      .innerJoin('CD_SITE_SOURCE', 'CS', 'CS.SITE_ID = CWS.SITE_ID')
      .innerJoin('CD_PROJECT_SOURCE', 'CP', 'CP.PROJECT_ID = CS.PROJECT_ID')
      .getRawOneNormalized()
      .then(async (well) => {
        return {
          ...well,
          field_name: well.project_name,
          datums: await this.dataSource
            .createQueryBuilder()
            .from('CD_DATUM', null)
            .where('WELL_ID = :wellId', { wellId: wellId })
            .getRawManyNormalized(),
        };
      });
  }

  getWellboreData(wellId: string, wellboreId: string) {
    return this.dataSource
      .createQueryBuilder()
      .from('CD_WELLBORE', null)
      .where('WELL_ID = :wellId', { wellId: wellId })
      .andWhere('WELLBORE_ID = :wellboreId', { wellboreId: wellboreId })
      .getRawOneNormalized();
  }

  getAttachments(body: WellSchematicQueryDTO) {
    return this.dataSource
      .createQueryBuilder()
      .from('VIEW_REPORT_ATTACHMENTS', null)
      .where('WELL_ID = :well_id', { well_id: body.well_id })
      .andWhere('WELLBORE_ID = :wellbore_id', { wellbore_id: body.wellbore_id })
      .andWhere('date_report <= :date', { date: body.schematic_date })
      .getRawManyNormalized();
  }

  getScenarioData(wellId: string, wellboreId: string, scenarioId: string) {
    return this.dataSource
      .createQueryBuilder()
      .from('CD_SCENARIO', null)
      .where('WELL_ID = :wellId', { wellId: wellId })
      .andWhere('WELLBORE_ID = :wellboreId', { wellboreId: wellboreId })
      .andWhere('SCENARIO_ID = :scenarioId', { scenarioId: scenarioId })
      .getRawOneNormalized();
  }
}
