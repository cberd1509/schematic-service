import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { WellSchematicQueryDTO } from 'src/common/interfaces/DTO/WellSchematicQueryDTO';
import { WellSchematicService } from './well-schematic.service';
import * as moment from 'moment';

@Controller('well-schematic')
export class WellSchematicController {
  private readonly logger = new Logger(WellSchematicController.name);

  constructor(private schematicService: WellSchematicService) {}

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
}
