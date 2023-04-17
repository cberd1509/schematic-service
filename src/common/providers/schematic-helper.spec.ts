import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SchematicHelper } from './schematic-helper';

describe('SchematicHelper', () => {
  let schematicHelper: SchematicHelper;

  let logSpy;
  let errorSpy;

  beforeAll(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('Get Design Data Tests', () => {
    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: DataSource,
            useValue: {
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest
                  .fn()
                  .mockResolvedValueOnce({ phase: 'ACTUAL' })
                  .mockRejectedValueOnce(null),
                getRawOneNormalized: jest
                  .fn()
                  .mockResolvedValueOnce({ phase: 'ACTUAL' })
                  .mockRejectedValueOnce(null),
              }),
            },
          },
          SchematicHelper,
        ],
      }).compile();

      schematicHelper = module.get<SchematicHelper>(SchematicHelper);
    });
    it('should return design data', async () => {
      expect(
        await schematicHelper.getDesignData(
          'scenario_id',
          'well_id',
          'wellbore_id',
        ),
      ).not.toBeNull();

      expect(logSpy).toBeCalled();
    });

    it('should return null', async () => {
      expect(
        await schematicHelper.getDesignData(
          'scenario_id',
          'well_id',
          'wellbore_id',
        ),
      ).toBeNull();

      expect(errorSpy).toBeCalled();
    });
  });

  describe('Get Element Barriers Tests', () => {
    const queryBuilderMocks = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    };

    it('should return element barriers', async () => {
      //Set up test

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: DataSource,
            useValue: {
              createQueryBuilder: jest.fn().mockReturnValue({
                ...queryBuilderMocks,
                getRawManyNormalized: jest
                  .fn()
                  .mockResolvedValueOnce([{ barrier_id: 'barrier_id' }]),
              }),
            },
          },
          SchematicHelper,
        ],
      }).compile();
      schematicHelper = module.get<SchematicHelper>(SchematicHelper);

      //Run test
      expect(
        await schematicHelper.getElementBarriers(
          'well_id',
          'scenario_id',
          'wellbore_id',
          new Date(),
          'ref_id',
        ),
      ).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: DataSource,
            useValue: {
              createQueryBuilder: jest.fn().mockReturnValue({
                ...queryBuilderMocks,
                getRawManyNormalized: jest.fn().mockRejectedValueOnce(null),
              }),
            },
          },
          SchematicHelper,
        ],
      }).compile();
      schematicHelper = module.get<SchematicHelper>(SchematicHelper);

      expect(
        await schematicHelper.getElementBarriers(
          'well_id',
          'scenario_id',
          'wellbore_id',
          new Date(),
          'ref_id',
        ),
      ).toHaveLength(0);
    });
  });
});
