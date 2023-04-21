import { Logger, NotImplementedException } from '@nestjs/common';
import { WellSchematicQueryDTO } from '../interfaces/DTO/WellSchematicQueryDTO';
import { Wellhead } from '../interfaces/WellSchematicData';
import { SchematicProvider } from './SchematicProvider';

export class DesignSchematicProvider extends SchematicProvider {
  private readonly logger = new Logger(DesignSchematicProvider.name);

  getWellSchematic(body: any) {
    throw new NotImplementedException();
  }

  GetWellheads(body: WellSchematicQueryDTO): Promise<Wellhead> {
    throw new NotImplementedException();
  }
}
