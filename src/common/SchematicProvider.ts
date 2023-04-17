import { WellSchematicQueryDTO } from "./interfaces/DTO/WellSchematicQueryDTO";
import { Wellhead } from "./interfaces/WellSchematicData";
import { DataSource } from 'typeorm';
import { Injectable } from "@nestjs/common";
import { SchematicHelper } from "./providers/schematic-helper";

@Injectable()
export abstract class SchematicProvider {
    constructor(protected dbConnection:DataSource, protected schematicHelper:SchematicHelper) { }
    abstract GetWellheads(body: WellSchematicQueryDTO):Promise<Wellhead>;
}