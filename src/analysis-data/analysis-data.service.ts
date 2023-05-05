import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WellSchematicQueryDTO } from '../common/interfaces/DTO/WellSchematicQueryDTO';
import { BarriersModifyDTO } from '../common/interfaces/DTO/BarriersModifyDTO';
import { BarrierEnvelopeData } from '../common/interfaces/BarrierEnvelopeData';
import * as StringUtils from '../common/util/StringUtils';
import { BarrierElementData } from '../common/interfaces/BarrierElementData';
import { BarriersEvaluationDTO } from '../common/interfaces/DTO/BarriersEvaluationDTO';
import { SchematicHelper } from '../common/providers/schematic-helper';
import { AnnulusModifyDTO } from '../common/interfaces/DTO/AnnulusModifyDTO';
import { AnnulusEvaluationDTO } from '../common/interfaces/DTO/AnnulusEvaluationDTO';
@Injectable()
export class AnalysisDataService {
  private readonly logger = new Logger(AnalysisDataService.name);

  constructor(
    private dataSource: DataSource,
    private schematicHelper: SchematicHelper,
  ) {}

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
    const barrierDiagramId = (
      await this.schematicHelper.getOrCreatBarrierDiagram(
        body.well_id,
        body.wellbore_id,
        body.scenario_id,
        body.schematic_date,
      )
    ).barrier_diagram_id;

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
          .delete()
          .execute();
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
          top_depth: barrier.top,
          base_depth: barrier.base,
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

  async setBarrierEvaluation(body: BarriersEvaluationDTO[]): Promise<boolean> {
    //Define Common Data
    const wellId = body[0].ref_id.split('/')[1].split('+')[0];
    const wellboreId = body[0].ref_id.split('/')[1].split('+')[1];
    const scenarioId = body[0].scenario_id;
    const barrierDiagramId = body[0].barrier_diagram_id;
    const createUser = body[0].create_user;

    const currentDate = new Date();

    const barrierEnvelopeMap = new Map<string, BarriersEvaluationDTO[]>();

    for (const barrierElement of body) {
      const key = barrierElement.barrier_envelope_id;

      if (!barrierEnvelopeMap.has(key)) barrierEnvelopeMap.set(key, []);
      barrierEnvelopeMap.get(key).push(barrierElement);
    }

    for (const [key, value] of barrierEnvelopeMap) {
      //Deletes any existing Evaluation for Barrier Envelope
      await this.dataSource
        .createQueryBuilder()
        .delete()
        .from('CD_BARRIER_ENV_TEST_LINK_T')
        .where({
          barrier_envelope_id: key,
        })
        .execute();

      await this.dataSource
        .createQueryBuilder()
        .delete()
        .from('CD_BARRIER_ENVELOPE_TEST_T')
        .where({
          barrier_envelope_id: key,
        })
        .execute();

      //Creates a new Evaluation for Barrier Envelope
      const envelopeTestId = StringUtils.makeId(5);
      const envTestData = {
        WELL_ID: wellId,
        WELLBORE_ID: wellboreId,
        BARRIER_ENVELOPE_ID: key,
        BARRIER_ENVELOPE_TEST_ID: envelopeTestId,
        STATUS: this.schematicHelper.getBarrierStatus(value),
        LAST_TEST_DATE: currentDate,
        SCENARIO_ID: scenarioId,
        BARRIER_DIAGRAM_ID: barrierDiagramId,
        CREATE_USER: createUser,
      };

      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_BARRIER_ENVELOPE_TEST_T')
        .values(envTestData)
        .execute();

      //Creates a new Audit for Barrier Envelope
      try {
        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into('CD_BARRIER_ENVELOPE_TEST_AUDIT')
          .values(envTestData)
          .execute();
      } catch (ex) {
        this.logger.error(
          'An error ocurred while inserting audit info for CD BARRIER ENV TEST',
        );
      }

      this.logger.log('Inserted new Envelope Test');

      for (const element of value) {
        //Creates a new Component Evaluation Record
        const data = {
          BARRIER_ELEMENT_ID: element.barrier_element_id,
          BARRIER_ENVELOPE_ID: element.barrier_envelope_id,
          BARRIER_ENVELOPE_TEST_ID: envelopeTestId,
          BARRIER_DIAGRAM_ID: barrierDiagramId,
          LAST_TEST_DATE: currentDate,
          WELL_ID: wellId,
          WELLBORE_ID: wellboreId,
          SCENARIO_ID: scenarioId,
          STATUS: element.status,
          COMPONENT_OVALITY: element.component_ovality,
          COMPONENT_WEARING: element.component_wearing,
          DETAILS: element.details,
        };

        //Inserts the new Component Evaluation Record
        this.dataSource
          .createQueryBuilder()
          .insert()
          .into('CD_BARRIER_ENV_TEST_LINK_T')
          .values(data)
          .execute();

        //Creates an audit record
        try {
          await this.dataSource
            .createQueryBuilder()
            .insert()
            .into('CD_BARRIER_ENV_TEST_LINK_AUDIT')
            .values(data)
            .execute();
        } catch (ex) {
          this.logger.error(
            'An error ocurred while inserting audit info for CD BARRIER ENV TEST LINK',
          );
        }
      }
    }

    return true;
  }

  async modifyAnnulus(body: AnnulusModifyDTO) {
    const barrierDiagramId = (
      await this.schematicHelper.getOrCreatBarrierDiagram(
        body.well_id,
        body.wellbore_id,
        body.scenario_id,
        body.schematic_date,
      )
    ).barrier_diagram_id;

    this.dataSource
      .createQueryBuilder()
      .delete()
      .from('CD_ANNULUS_ELEMENT_T')
      .where('well_id=:well_id', { well_id: body.well_id })
      .andWhere('wellbore_id=:wellbore_id', { wellbore_id: body.wellbore_id })
      .andWhere('scenario_id=:scenario_id', { scenario_id: body.scenario_id })
      .andWhere('barrier_diagram_id=:barrier_diagram_id', {
        barrier_diagram_id: barrierDiagramId,
      })
      .andWhere('name=:name', { name: body.name })
      .execute();

    this.dataSource
      .createQueryBuilder()
      .insert()
      .into('CD_ANNULUS_ELEMENT_T')
      .values({
        WELL_ID: body.well_id,
        WELLBORE_ID: body.wellbore_id,
        SCENARIO_ID: body.scenario_id,
        BARRIER_DIAGRAM_ID: barrierDiagramId,
        NAME: body.name,
        PRESSURE: body.pressure,
        DENSITY: body.density,
        ANNULUS_ELEMENT_ID: StringUtils.makeId(5),
      })
      .execute();

    return true;
  }

  async setAnnulusEvaluation(body: AnnulusEvaluationDTO[]) {
    for (const evaluationData of body) {
      this.dataSource
        .createQueryBuilder()
        .delete()
        .from('CD_ANNULUS_TEST_T')
        .where({
          WELL_ID: evaluationData.well_id,
          WELLBORE_ID: evaluationData.wellbore_id,
          SCENARIO_ID: evaluationData.scenario_id,
          BARRIER_DIAGRAM_ID: evaluationData.barrier_diagram_id,
          ANNULUS_ELEMENT_ID: evaluationData.annulus_element_id,
        })
        .execute();

      this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_ANNULUS_TEST_T')
        .values({
          WELL_ID: evaluationData.well_id,
          WELLBORE_ID: evaluationData.wellbore_id,
          SCENARIO_ID: evaluationData.scenario_id,
          BARRIER_DIAGRAM_ID: evaluationData.barrier_diagram_id,
          ANNULUS_ELEMENT_ID: evaluationData.annulus_element_id,
          PRESSURE: evaluationData.MAWOP,
          TEST_TYPE: 'MAWOP',
          LOCATION: evaluationData.mawop_point,
          LAST_TEST_DATE: new Date(),
          CREATE_USER: evaluationData.create_user,
          ANNULUS_TEST_ID: StringUtils.makeId(5)
        })
        .execute();

      this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_ANNULUS_TEST_T')
        .values({
          WELL_ID: evaluationData.well_id,
          WELLBORE_ID: evaluationData.wellbore_id,
          SCENARIO_ID: evaluationData.scenario_id,
          BARRIER_DIAGRAM_ID: evaluationData.barrier_diagram_id,
          ANNULUS_ELEMENT_ID: evaluationData.annulus_element_id,
          PRESSURE: evaluationData.MOP,
          TEST_TYPE: 'MOP',
          LOCATION: evaluationData.mawop_point,
          LAST_TEST_DATE: new Date(),
          CREATE_USER: evaluationData.create_user,
          ANNULUS_TEST_ID: StringUtils.makeId(5)
        })
        .execute();

      this.dataSource
        .createQueryBuilder()
        .insert()
        .into('CD_ANNULUS_TEST_T')
        .values({
          WELL_ID: evaluationData.well_id,
          WELLBORE_ID: evaluationData.wellbore_id,
          SCENARIO_ID: evaluationData.scenario_id,
          BARRIER_DIAGRAM_ID: evaluationData.barrier_diagram_id,
          ANNULUS_ELEMENT_ID: evaluationData.annulus_element_id,
          PRESSURE: evaluationData.MAASP,
          TEST_TYPE: 'MAASP',
          LOCATION: evaluationData.maasp_point,
          LAST_TEST_DATE: new Date(),
          CREATE_USER: evaluationData.create_user,
          ANNULUS_TEST_ID: StringUtils.makeId(5)
        })
        .execute();
    }

    return true;
  }
}
