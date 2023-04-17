import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActualSchematicProvider } from './common/providers/actual-schematic-provider';
import { DesignSchematicProvider } from './common/providers/design-schematic-provider';
import { SchematicHelper } from './common/providers/schematic-helper';
import { WellSchematicController } from './well-schematic/well-schematic.controller';
import { WellSchematicService } from './well-schematic/well-schematic.service';
import './common/extensions/SelectQueryBuilderExtension'  

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'oracle',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      serviceName: process.env.DB_DATABASE,
      database: process.env.DB_DATABASE,
      entities: [],
      synchronize: false
    }),
  ],
  controllers: [WellSchematicController],
  providers: [WellSchematicService,

//Logic providers
ActualSchematicProvider,
DesignSchematicProvider,
SchematicHelper,
],
})
export class AppModule {}
