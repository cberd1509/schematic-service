import { Test, TestingModule } from '@nestjs/testing';
import { ActualSchematicProvider } from './actual-schematic-provider';
import { DataSource } from 'typeorm';
import { SchematicHelper } from './schematic-helper';
import { Logger } from '@nestjs/common';
import { WellboreData } from '../interfaces/WellboreData';

async function getProvider(customQueryBuilderMocks) {
  const createQueryBuilderMocks = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    ...customQueryBuilderMocks,
  };

  const schematicHelperMock = jest.mock('./schematic-helper');
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      {
        provide: DataSource,
        useValue: {
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(createQueryBuilderMocks),
        },
      },
      {
        provide: SchematicHelper,
        useValue: schematicHelperMock,
      },
      ActualSchematicProvider,
    ],
  }).compile();

  return module.get<ActualSchematicProvider>(ActualSchematicProvider);
}

describe('WellSchematicService', () => {
  let provider: ActualSchematicProvider;

  let logSpy;
  let errorSpy;

  beforeAll(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', async () => {
    provider = await getProvider({});
    expect(provider).toBeDefined();
  });

  describe('GetWellhead Tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue(null),
        getRawOneNormalized: jest.fn().mockRejectedValue(null),
        getRawMany: jest.fn().mockRejectedValue(null),
        getRawManyNormalized: jest.fn().mockRejectedValue(null),
      });

      expect(
        await provider.GetWellheads({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toBeNull();

      expect(errorSpy).toBeCalled();
    });

    it('should return values on successful query', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue([]),
        getRawOneNormalized: jest.fn().mockResolvedValue([]),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawManyNormalized: jest.fn().mockResolvedValue([]),
      });

      expect(
        await provider.GetWellheads({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).not.toBeNull();
    });
  });

  describe('GetWellboreSequence Tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider.GetWellboreSequence({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toEqual([]);

      expect(errorSpy).toBeCalled();
    });

    it('should return values on successful query', async () => {
      const dummyWellbore: WellboreData = {
        wellbore_id: 'TEST',
        wellbore_name: 'TEST WELLBORE',
        well_id: '',
        tight_group_id: '',
        ko_date: '',
        authorized_md: 0,
        phase: '',
        authorized_tvd: 0,
        bh_md: 0,
        bh_tvd: 0,
        is_deviated: '',
        budgeted_md: 0,
        geo_offset_east_bh: 0,
        budgeted_tvd: 0,
        geo_offset_north_bh: 0,
        geo_latitude_bh: 0,
        geo_longitude_bh: 0,
        geo_offset_east_ko: 0,
        reason: '',
        geo_offset_north_ko: 0,
        geo_latitude_ko: 0,
        ko_md: 0,
        ko_tvd: 0,
        geo_longitude_ko: 0,
        end_status: '',
        well_legal_name: '',
        plugback_md: 0,
        plugback_tvd: 0,
        is_readonly: '',
        wellbore_no: '',
        create_date: '',
        create_user_id: '',
        create_app_id: '',
        update_date: '',
        update_user_id: '',
        update_app_id: '',
        ow_well_uwi: '',
        external_well_id: '',
        api_no: '',
        wellbore_uwi: '',
      };

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue([dummyWellbore]),
        getRawOneNormalized: jest.fn().mockResolvedValue([dummyWellbore]),
        getRawMany: jest.fn().mockResolvedValue([dummyWellbore]),
        getRawManyNormalized: jest.fn().mockResolvedValue([dummyWellbore]),
      });

      expect(
        await provider.GetWellboreSequence({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).not.toBeNull();

      expect(logSpy).toBeCalled();
    });
  });

  describe('getWellSchematic tests', () => {
    it('should return a valid schematic', () => {
      //To be implemented
    });
  });
});
