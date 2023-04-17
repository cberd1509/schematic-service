import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ActualSchematicProvider } from '../common/providers/actual-schematic-provider';
import { DesignSchematicProvider } from '../common/providers/design-schematic-provider';
import { SchematicHelper } from '../common/providers/schematic-helper';
import { WellSchematicService } from './well-schematic.service';

describe('WellSchematicService', () => {
  let service: WellSchematicService;
  const designSchematicProviderMock = {
    getWellSchematic: jest.fn().mockReturnValue({}),
  };

  const actualSchematicProviderMock = {
    getWellSchematic: jest.fn().mockReturnValue({}),
  };

  jest.mock('../common/providers/actual-schematic-provider');
  jest.mock('../common/providers/design-schematic-provider');
  jest.mock('../common/providers/schematic-helper');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WellSchematicService,
        SchematicHelper,
        {
          provide: ActualSchematicProvider,
          useValue: actualSchematicProviderMock,
        },
        {
          provide: DesignSchematicProvider,
          useValue: designSchematicProviderMock,
        },
        {
          provide: DataSource,
          useValue: {
            getRawOne: jest.fn().mockResolvedValue('your_mocked_object_here'),
          },
        },
      ],
    }).compile();

    service = module.get<WellSchematicService>(WellSchematicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return null with invalid well_id and wellbore_id', async () => {
    jest
      .spyOn(SchematicHelper.prototype, 'getDesignData')
      .mockResolvedValue(null);
    const result = await service.getWellSchematic({
      scenario_id: 'scenario_id',
      well_id: 'well_id',
      schematic_date: new Date(),
      wellbore_id: 'wellbore_id',
    });

    expect(result).toBeNull();
  });

  it('should call the actual design provider if phase is ACTUAL', async () => {
    jest
      .spyOn(SchematicHelper.prototype, 'getDesignData')
      .mockResolvedValue({ phase: 'ACTUAL' });

    const getWellSchematicSpy = jest.spyOn(
      actualSchematicProviderMock,
      'getWellSchematic',
    );
    const result = await service.getWellSchematic({
      scenario_id: 'scenario_id',
      well_id: 'well_id',
      schematic_date: new Date(),
      wellbore_id: 'wellbore_id',
    });

    expect(result).not.toBeNull();
    expect(getWellSchematicSpy).toBeCalled();
  });

  it('should call the planned design provider if phase is not ACTUAL', async () => {
    jest
      .spyOn(SchematicHelper.prototype, 'getDesignData')
      .mockResolvedValue({ phase: 'PLAN' });

    const getWellSchematicSpy = jest.spyOn(
      designSchematicProviderMock,
      'getWellSchematic',
    );

    const result = await service.getWellSchematic({
      scenario_id: 'scenario_id',
      well_id: 'well_id',
      schematic_date: new Date(),
      wellbore_id: 'wellbore_id',
    });

    expect(result).not.toBeNull();
    expect(getWellSchematicSpy).toBeCalled();
  });
});
