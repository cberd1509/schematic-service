import { Logger } from "@nestjs/common";
import { WellSchematicQueryDTO } from "../interfaces/DTO/WellSchematicQueryDTO";
import { Wellhead } from "../interfaces/WellSchematicData";
import { SchematicProvider } from "../SchematicProvider";

export class DesignSchematicProvider extends SchematicProvider {
    private readonly logger = new Logger(DesignSchematicProvider.name);

    getWellSchematic(body: any) {
        this.logger.log("Getting Well Schematic for well_id: " + body.well_id + " wellbore_id: " + body.wellbore_id + " scenario_id: " + body.scenario_id + " schematic_date: " + body.schematic_date );
        return 'Hello World';
    }

    GetWellheads(body: WellSchematicQueryDTO): Promise<Wellhead> {
        throw new Error("Method not implemented.");
    }
}