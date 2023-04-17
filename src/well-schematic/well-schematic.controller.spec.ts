import { Test, TestingModule } from '@nestjs/testing';
import { WellSchematicController } from './well-schematic.controller';
import { WellSchematicService } from './well-schematic.service';

describe('WellSchematicController', () => {
  let controller: WellSchematicController;

  beforeEach(async () => {
    const service: Partial<WellSchematicService> = {
      getWellSchematic: async ({ well_id }) => {
        if (well_id == 'VALID') return { Casings: {}, Assemblies: {} };
        if (well_id == 'INVALID') return null;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WellSchematicController],
      providers: [WellSchematicService],
    })
      .overrideProvider(WellSchematicService)
      .useValue(service)
      .compile();

    controller = module.get<WellSchematicController>(WellSchematicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a valid schematic for valid data', async () => {
    expect(
      await controller.getWellSchematic({
        scenario_id: 'VALID',
        schematic_date: new Date(),
        well_id: 'VALID',
        wellbore_id: 'VALID',
      }),
    ).not.toBeNull();
  });

  it('should return null for invalid data', async () => {
    expect(
      await controller.getWellSchematic({
        scenario_id: 'INVALID',
        schematic_date: new Date(),
        well_id: 'INVALID',
        wellbore_id: 'INVALID',
      }),
    ).toBeNull();
  });
});
