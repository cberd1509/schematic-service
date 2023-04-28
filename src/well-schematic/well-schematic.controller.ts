import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Get,
  Param,
} from '@nestjs/common';
import { WellSchematicQueryDTO } from 'src/common/interfaces/DTO/WellSchematicQueryDTO';
import { BarriersModifyDTO } from 'src/common/interfaces/DTO/BarriersModifyDTO';
import { WellSchematicService } from './well-schematic.service';
import * as moment from 'moment';
import { AnalysisDataService } from '../analysis-data/analysis-data.service';
import { AnnulusModifyDTO } from '../common/interfaces/DTO/AnnulusModifyDTO';

@Controller('well-schematic-data')
export class WellSchematicController {
  private readonly logger = new Logger(WellSchematicController.name);

  constructor(
    private schematicService: WellSchematicService,
    private analysisDataService: AnalysisDataService,
  ) {}

  @Post('getWellSchematic')
  @HttpCode(200)
  getWellSchematic(@Body() body: WellSchematicQueryDTO) {
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

    //Converts date to start of day
    body.schematic_date = moment(body.schematic_date).startOf('day').toDate();
    return this.schematicService.getWellSchematic(body);
  }

  @Post('existing-reports')
  @HttpCode(200)
  getExistingReports(@Body() body: WellSchematicQueryDTO) {
    this.logger.log(
      `Getting all existing reports for well ${body.well_id} wellbore id ${body.wellbore_id}`,
    );
    return this.analysisDataService.getExistingReports(body);
  }

  @Get('events/:well_id')
  @HttpCode(200)
  getWellEvents(@Param('well_id') wellId: string) {
    this.logger.log(`Getting all events for well ${wellId}`);
    return this.analysisDataService.getWellEvents(wellId);
  }

  @Get('well/:well_id')
  @HttpCode(200)
  getWell(@Param('well_id') wellId: string) {
    this.logger.log(`Getting well data for well ${wellId}`);
    return this.analysisDataService.getWellData(wellId);
  }

  @Get('wellbore/:well_id/:wellbore_id')
  @HttpCode(200)
  getWellbore(
    @Param('well_id') wellId: string,
    @Param('wellbore_id') wellboreId: string,
  ) {
    this.logger.log(
      `Getting wellbore data for well ${wellId}, wellbore ${wellboreId}`,
    );
    return this.analysisDataService.getWellboreData(wellId, wellboreId);
  }

  @Get('design/:well_id/:wellbore_id/:scenario_id')
  @HttpCode(200)
  getDesignData(
    @Param('well_id') wellId: string,
    @Param('wellbore_id') wellboreId: string,
    @Param('scenario_id') scenarioId: string,
  ) {
    this.logger.log(
      `Getting design data for well ${wellId}, wellbore ${wellboreId}, scenario ${scenarioId}`,
    );
    return this.analysisDataService.getScenarioData(
      wellId,
      wellboreId,
      scenarioId,
    );
  }

  @Post('attachments')
  @HttpCode(200)
  getAttachments(@Body() body: WellSchematicQueryDTO) {
    this.logger.log(
      `Getting all attachments for well ${body.well_id} wellbore id ${body.wellbore_id}`,
    );
    body.schematic_date = moment(body.schematic_date).startOf('day').toDate();
    return this.analysisDataService.getAttachments(body);
  }

  @Post('barriers')
  @HttpCode(200)
  getBarriers(@Body() body: WellSchematicQueryDTO) {
    this.logger.log(
      `Getting all barriers for well ${body.well_id} wellbore id ${body.wellbore_id}`,
    );
    body.schematic_date = moment(body.schematic_date).startOf('day').toDate();
    return this.schematicService.getBarriers(body);
  }

  @Post('barrier-diagrams')
  @HttpCode(200)
  getBarrierDiagrams(@Body() body: WellSchematicQueryDTO) {
    this.logger.log(
      `Getting all barriers diagrams for well ${body.well_id} wellbore id ${body.wellbore_id}`,
    );
    body.schematic_date = moment(body.schematic_date).startOf('day').toDate();
    return this.schematicService.getBarrierDiagrams(body);
  }

  @Post('barrier-modify')
  @HttpCode(200)
  modifyBarriers(@Body() body: BarriersModifyDTO) {
    this.logger.log(
      `Modifying barrier for well ${body.well_id} wellbore id ${body.wellbore_id}`,
    );
    body.schematic_date = moment(body.schematic_date).startOf('day').toDate();
    return this.analysisDataService.modifyBarriers(body);
  }

  @Post('annulus-modify')
  @HttpCode(200)
  modifyAnnulus(@Body() body: AnnulusModifyDTO) {
    return 200;
  }
}
