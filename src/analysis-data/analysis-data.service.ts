import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../common/interfaces/DTO/WellSchematicQueryDTO';
import { BarriersModifyDTO } from '../common/interfaces/DTO/BarriersModifyDTO';
import { BarrierDiagramData } from '../common/interfaces/WellSchematicData';
import { BarrierEnvelopeData } from '../common/interfaces/BarrierEnvelopeData';
import * as StringUtils from '../common/util/StringUtils';
import { BarrierElementData } from '../common/interfaces/BarrierElementData';
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

  async modifyBarriers(body: BarriersModifyDTO) {
    let currentBarrierDiagram = await this.dataSource
      .createQueryBuilder()
      .from('CD_BARRIER_DIAGRAM_T', null)
      .where('WELL_ID = :well_id', { well_id: body.well_id })
      .andWhere('WELLBORE_ID = :wellbore_id', { wellbore_id: body.wellbore_id })
      .andWhere('SCENARIO_ID = :scenario_id', { scenario_id: body.scenario_id })
      .andWhere('DIAGRAM_DATE = :diagram_date', {
        diagram_date: body.schematic_date,
      })
      .getRawOneNormalized<BarrierDiagramData>();

    let barrierDiagramId: string = currentBarrierDiagram?.barrier_diagram_id;

    if (!currentBarrierDiagram) {
      //If there's no current barrier diagram, we should create a new one.
      barrierDiagramId = StringUtils.makeId(5);

      currentBarrierDiagram = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_BARRIER_DIAGRAM_T')
        .values({
          BARRIER_DIAGRAM_ID: barrierDiagramId,
          WELL_ID: body.well_id,
          SCENARIO_ID: body.scenario_id,
          WELLBORE_ID: body.wellbore_id,
          DIAGRAM_DATE: body.schematic_date,
        })
        .execute()
        .then((res) => res.raw[0] as BarrierDiagramData);
    }

    for (const barrier of body.barrier_modify_data) {
      let envelopeData = await this.dataSource
        .createQueryBuilder()
        .from('CD_BARRIER_ENVELOPE_T', null)
        .where('NAME = :name', { name: barrier.barrier })
        .andWhere('WELLBORE_ID = :wellbore_id', {
          wellbore_id: body.wellbore_id,
        })
        .andWhere('WELL_ID = :well_id', { well_id: body.well_id })
        .andWhere('SCENARIO_ID = :scenario_id', {
          scenario_id: body.scenario_id,
        })
        .andWhere('BARRIER_DIAGRAM_ID = :barrier_diagram_id', {
          barrier_diagram_id: barrierDiagramId,
        })
        .getRawOneNormalized<BarrierEnvelopeData>();

      let barrierEnvelopeId: string = envelopeData?.barrier_envelope_id;

      if (!envelopeData) {
        //If there's no current barrier diagram, we should create a new one.
        barrierEnvelopeId = StringUtils.makeId(5);
        envelopeData = await this.dataSource
          .createQueryBuilder()
          .insert()
          .into('CD_BARRIER_ENVELOPE_T')
          .values({
            BARRIER_ENVELOPE_ID: barrierEnvelopeId,
            BARRIER_DIAGRAM_ID: barrierDiagramId,
            NAME: barrier.barrier,
            WELL_ID: body.well_id,
            SCENARIO_ID: body.scenario_id,
            WELLBORE_ID: body.wellbore_id,
          })
          .execute()
          .then((res) => res.raw[0] as BarrierEnvelopeData);
      }

      const barrierElementExists = await this.dataSource
        .createQueryBuilder()
        .from('CD_BARRIER_ELEMENT_T', null)
        .where({
          ref_id: barrier.eventRefId,
          barrier_envelope_id: barrierEnvelopeId,
          barrier_diagram_id: barrierDiagramId,
          well_id: body.well_id,
          wellbore_id: body.wellbore_id,
          scenario_id: body.scenario_id,
        })
        .getExists();

      if (barrierElementExists) {
        //Deletes element
        await this.dataSource
          .createQueryBuilder()
          .from('CD_BARRIER_ELEMENT_T', null)
          .where({
            ref_id: barrier.eventRefId,
            barrier_envelope_id: barrierEnvelopeId,
            barrier_diagram_id: barrierDiagramId,
            well_id: body.well_id,
            wellbore_id: body.wellbore_id,
            scenario_id: body.scenario_id,
          })
          .delete();
      } else {
        //Creates a new Element
        const barrierElementId = StringUtils.makeId(5);

        //Gets ID Component of the Composite ID
        const ids = barrier.eventRefId.split('/')[1].split('+');
        const lastId = ids[ids.length - 1];

        const barrierElement: BarrierElementData = {
          barrier_element_id: barrierElementId,
          ref_id: barrier.eventRefId,
          barrier_envelope_id: barrierEnvelopeId,
          barrier_diagram_id: barrierDiagramId,
          well_id: body.well_id,
          wellbore_id: body.wellbore_id,
          scenario_id: body.scenario_id,
          element_type: barrier.elementType,
          wellhead_hanger_id:
            barrier.elementType === 'LINER_HANGER' ? lastId : null,
          wellbore_formation_id:
            barrier.elementType === 'FORMATION' ? lastId : null,
          cement_job_id:
            barrier.elementType === 'CEMENT' ? ids[ids.length - 2] : null,
          cement_stage_id: barrier.elementType === 'CEMENT' ? lastId : null,
          wellhead_outlet_id: barrier.elementType === 'OUTLET' ? lastId : null,
          wellhead_comp_id:
            barrier.elementType === 'WELLHEAD_COMP' ? lastId : null,
          assembly_id:
            barrier.elementType === 'CASING'
              ? ids[2]
              : barrier.elementType === 'ASSEMBLY_COMP'
              ? ids[2]
              : null,
          assembly_comp_id: barrier.elementType === 'CASING' ? lastId : null,
          component_wearing: 0,
          component_ovality: 0,
        };

        const insertObject = {};

        //Converts all keys to uppercase
        Object.keys(barrierElement).forEach(
          (key) => (insertObject[key.toUpperCase()] = barrierElement[key]),
        );

        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into('CD_BARRIER_ELEMENT_T')
          .values(insertObject)
          .execute();
      }
    }

    return true;
  }
}
