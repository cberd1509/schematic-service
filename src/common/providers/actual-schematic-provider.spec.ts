import { Test, TestingModule } from '@nestjs/testing';
import { ActualSchematicProvider } from './actual-schematic-provider';
import { DataSource } from 'typeorm';
import { SchematicHelper } from './schematic-helper';
import { Logger } from '@nestjs/common';
import { WellboreData } from '../interfaces/WellboreData';
import {
  AnnulusComponentData,
  AnnulustestComponentData,
  WellboreGradient,
  WellheadAnnularPressure,
  WellheadPressureRelief,
} from '../interfaces/WellSchematicData';

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
        useValue: {
          getDesignData: jest.fn().mockResolvedValue({}),
          getElementBarriers: jest.fn().mockResolvedValue([
            {
              barrier_id: 'test',
              barrier_type: 'test',
              barrier_name: 'test',
              barrier_status: 'test',
              barrier_status_date: new Date(),
              barrier_status_reason: 'test',
            },
          ]),
          getWellboreData: jest.fn().mockResolvedValue({} as WellboreData),
        },
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
    afterEach(async () => {
      jest.clearAllMocks();
    });

    it('should return null on error', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetWellheadComponents')
        .mockRejectedValueOnce(new Error('test'));

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
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetWellheadComponents')
        .mockResolvedValueOnce([
          {
            barrier_id: 'test',
            CompType: 'test',
            description: 'test',
            include_seals: false,
            is_barrier_closed: false,
            Color: 'test',
            comments: 'test',
            Hanger: [],
            installDate: '',
            Manufacturer: 'test',
            Model: 'test',
            Outlet: [],
            ref_id: '',
            reference: '',
            removalDate: '',
            SectType: '',
            test_duration: 0,
            test_pressure: 0,
            test_result: '',
            TopPresRating: 0,
            wellhead_section: '',
            wellheadReference: '',
          },
        ]);

      jest
        .spyOn(
          ActualSchematicProvider.prototype,
          'GetWellheadAnnulusPressureData',
        )
        .mockResolvedValueOnce([
          {
            annulus: '',
            comments: '',
            pressure: 0,
            PressureRelief: [
              {
                comments: '',
                annulus: '',
                drain_date: new Date(),
                drained_fluid_type: '',
                drained_press_from: 0,
                drained_press_to: 0,
                drained_volume: 0,
                estimated_fluid_level: '',
                fluid_density: 0,
                fluid_level: 0,
                max_press: 0,
                sequence_no: '0',
              },
            ],
          },
        ]);

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

  describe('GetWellheadAnnulusPressureData Tests', () => {
    it('should return an empty array on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue(null),
        getRawOneNormalized: jest.fn().mockRejectedValue(null),
        getRawMany: jest.fn().mockRejectedValue(null),
        getRawManyNormalized: jest.fn().mockRejectedValue(null),
      });

      expect(
        await provider.GetWellheadAnnulusPressureData({
          scenario_id: 'Error',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toEqual([]);

      expect(errorSpy).toBeCalled();
    });

    it('should return values on successful query', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetPressureReliefData')
        .mockResolvedValueOnce([
          {
            annulus: 'Anular A',
            comments: 'test',
            sequence_no: '1',
          },
        ]);

      const sampleData: WellheadAnnularPressure[] = [
        {
          annulus: 'Anular A',
          comments: 'test',
          pressure: 0,
          sequence_no: '1',
        },
      ];

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawOneNormalized: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue(sampleData),
        getRawManyNormalized: jest.fn().mockResolvedValue(sampleData),
      });

      const value = await provider.GetWellheadAnnulusPressureData({
        scenario_id: 'success',
        schematic_date: new Date(),
        well_id: '',
        wellbore_id: '',
      });

      expect(value).toHaveLength(1);
      expect(value[0].PressureRelief).toHaveLength(1);
    });
  });

  describe('GetPressureReliefData Tests', () => {
    it('should return an empty array on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue(null),
        getRawOneNormalized: jest.fn().mockRejectedValue(null),
        getRawMany: jest.fn().mockRejectedValue(null),
        getRawManyNormalized: jest.fn().mockRejectedValue(null),
      });

      expect(
        await provider.GetPressureReliefData('well_id', {
          wellhead_id: '',
          wellhead_ann_press_id: '',
        }),
      ).toEqual([]);

      expect(errorSpy).toBeCalled();
    });

    it('should return an array with an object when successful', async () => {
      const sampleData: WellheadPressureRelief[] = [
        {
          annulus: 'Anular A',
          comments: 'test',
          sequence_no: '1',
        },
      ];

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawOneNormalized: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue(sampleData),
        getRawManyNormalized: jest.fn().mockResolvedValue(sampleData),
      });

      const value = await provider.GetPressureReliefData('well_id', {
        wellhead_id: '',
        wellhead_ann_press_id: '',
      });

      expect(value).toHaveLength(1);
    });
  });

  describe('GetWellheadComponents Tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue(null),
        getRawOneNormalized: jest.fn().mockRejectedValue(null),
        getRawMany: jest.fn().mockRejectedValue(null),
        getRawManyNormalized: jest.fn().mockRejectedValue(null),
      });

      expect(
        await provider.GetWellheadComponents({
          scenario_id: 'Error',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toBeUndefined();
    });

    it('should return values on successful query', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetWellheadCompOutlets')
        .mockResolvedValueOnce([
          {
            barrier_id: 'test',
            CompType: 'test',
            description: 'test',
            include_seals: false,
            is_barrier_closed: false,
            Location: 'test',
            Manufacturer: 'test',
            Model: 'test',
            OutletWorkingPress: '0',
            ref_id: '',
            reference: '',
            SectType: '',
            test_duration: 0,
            test_pressure: 0,
            test_result: '',
            wellhead_section: '',
          },
        ]);

      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetWellheadHangers')
        .mockResolvedValueOnce([
          {
            barrier_id: 'test',
            CompType: 'test',
            description: 'test',
            include_seals: false,
            is_barrier_closed: false,
            Model: 'test',
            ref_id: '',
            reference: '',
            SectType: '',
            Size: 0,
          },
        ]);

      const mockWellheadComponents = [
        {
          well_id: '',
          event_id: '',
          wellhead_id: '',
          wellhead_comp_id: '',
          sect_type_code: '',
          comp_type_code: '',
          make: '',
          model: '',
          wellhead_section: '',
          test_result: '',
          working_press_rating: '',
          comments: '',
          install_date: '',
          removal_date: '',
          barrier_name: '',
          manufacture_method: '',
          connection_top_press_rating: '',
        },
      ];

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(mockWellheadComponents),
        getRawOneNormalized: jest
          .fn()
          .mockResolvedValue(mockWellheadComponents),
        getRawMany: jest.fn().mockResolvedValue(mockWellheadComponents),
        getRawManyNormalized: jest
          .fn()
          .mockResolvedValue(mockWellheadComponents),
      });

      expect(
        await provider.GetWellheadComponents({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).not.toBeNull();
    });
  });

  describe('GetWellheadCompOutlets Tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue(null),
        getRawOneNormalized: jest.fn().mockRejectedValue(null),
        getRawMany: jest.fn().mockRejectedValue(null),
        getRawManyNormalized: jest.fn().mockRejectedValue(null),
      });

      expect(errorSpy).toBeCalled();
      expect(
        await provider.GetWellheadCompOutlets(
          new Date(),
          'Error',
          'wellbore_id',
          {
            well_id: 'well_id',
            wellhead_id: 'wellhead_id',
            wellhead_comp_id: 'wellhead_comp_id',
          },
        ),
      ).toEqual([]);
    });

    it('should return values on successful query', async () => {
      const mockWellheadOutlets = [
        {
          barrier_id: 'test',
          CompType: 'test',
          description: 'test',
          include_seals: false,
          is_barrier_closed: false,
          Location: 'test',
          Manufacturer: 'test',
          Model: 'test',
          OutletWorkingPress: '0',
          ref_id: '',
          reference: '',
          SectType: '',
          test_duration: 0,
          test_pressure: 0,
          test_result: '',
          wellhead_section: '',
        },
      ];

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(mockWellheadOutlets),
        getRawOneNormalized: jest.fn().mockResolvedValue(mockWellheadOutlets),
        getRawMany: jest.fn().mockResolvedValue(mockWellheadOutlets),
        getRawManyNormalized: jest.fn().mockResolvedValue(mockWellheadOutlets),
      });

      expect(
        await provider.GetWellheadCompOutlets(
          new Date(),
          'test',
          'wellbore_id',
          {
            well_id: 'well_id',
            wellhead_id: 'wellhead_id',
            wellhead_comp_id: 'wellhead_comp_id',
          },
        ),
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

  describe('GetWellheadHangers Tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider.GetWellheadHangers(
          {
            well_id: 'well_id',
            wellhead_id: 'wellhead_id',
            wellhead_comp_id: 'wellhead_comp_id',
          },
          'well_id',
          'Error',
          'wellbore_id',
          new Date(),
        ),
      ).toEqual([]);

      expect(errorSpy).toBeCalled();
    });

    it('should return values on successful query', async () => {
      const mockWellheadHangers = [
        {
          barrier_id: 'test',
          CompType: 'test',
          description: 'test',
          include_seals: false,
          is_barrier_closed: false,
          Location: 'test',
          Manufacturer: 'test',
          Model: 'test',
          OutletWorkingPress: '0',
          ref_id: '',
          reference: '',
          SectType: '',
          test_duration: 0,
          test_pressure: 0,
          test_result: '',
          wellhead_section: '',
          assembly_id: 'TEST',
        },
      ];

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(mockWellheadHangers),
        getRawOneNormalized: jest.fn().mockResolvedValue(mockWellheadHangers),
        getRawMany: jest.fn().mockResolvedValue(mockWellheadHangers),
        getRawManyNormalized: jest.fn().mockResolvedValue(mockWellheadHangers),
      });

      expect(
        await provider.GetWellheadHangers(
          {
            well_id: 'well_id',
            wellhead_id: 'wellhead_id',
            wellhead_comp_id: 'wellhead_comp_id',
          },
          'well_id',
          'Error',
          'wellbore_id',
          new Date(),
        ),
      ).not.toBeNull();
    });
  });
  describe('getWellSchematic tests', () => {
    it('should return a valid schematic', () => {
      //To be implemented
    });
  });

  describe('GetReferenceDepths tests', () => {
    it('should return empty reference depth on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider
          .GetReferenceDepths({
            well_id: 'well_id',
            wellbore_id: 'wellbore_id',
            scenario_id: 'scenario_id',
            schematic_date: new Date(),
          })
          .then((x) => x.SystemDatum),
      ).toEqual('None');

      expect(errorSpy).toBeCalled();
    });

    it('should return empty reference depth when nothing found on database', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawOneNormalized: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue(null),
        getRawManyNormalized: jest.fn().mockResolvedValue(null),
      });

      expect(
        await provider
          .GetReferenceDepths({
            well_id: 'well_id',
            wellbore_id: 'wellbore_id',
            scenario_id: 'scenario_id',
            schematic_date: new Date(),
          })
          .then((x) => x.SystemDatum),
      ).toEqual('None');
    });

    it('should return a valid value when query return results', async () => {
      const exampleDatum = {
        is_offshore: 'Y',
        datum_elevation: 1000,
        water_depth: 0,
        wellhead_depth: 0,
      };
      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(exampleDatum),
        getRawOneNormalized: jest.fn().mockResolvedValue(exampleDatum),
        getRawMany: jest.fn().mockResolvedValue([exampleDatum]),
        getRawManyNormalized: jest.fn().mockResolvedValue([exampleDatum]),
      });

      expect(
        await provider
          .GetReferenceDepths({
            well_id: 'well_id',
            wellbore_id: 'wellbore_id',
            scenario_id: 'scenario_id',
            schematic_date: new Date(),
          })
          .then((x) => x.SystemDatum),
      ).toEqual('Mean Sea Level');
    });
  });

  describe('GetWellboreGradient tests', () => {
    it('should return empty array on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider.GetWellboreGradient(
          {
            well_id: 'well_id',
            wellbore_id: 'wellbore_id',
            scenario_id: 'scenario_id',
            schematic_date: new Date(),
          },
          'PL_WELLBORE_TEMP_GRAD',
        ),
      ).toEqual([]);

      expect(errorSpy).toBeCalled();
    });

    it('should return an array with items when call succeeds', async () => {
      const dummyItem: WellboreGradient = {
        depth_md: 0,
        depth_tvd: 0,
        formationname: 'TEST_FORMATION',
        value: 0,
      };

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(dummyItem),
        getRawOneNormalized: jest.fn().mockResolvedValue(dummyItem),
        getRawMany: jest.fn().mockResolvedValue([dummyItem]),
        getRawManyNormalized: jest.fn().mockResolvedValue([dummyItem]),
      });

      expect(
        await provider.GetWellboreGradient(
          {
            well_id: 'well_id',
            wellbore_id: 'wellbore_id',
            scenario_id: 'scenario_id',
            schematic_date: new Date(),
          },
          'PL_WELLBORE_TEMP_GRAD',
        ),
      ).toEqual([dummyItem]);
    });
  });

  describe('GetLatestBarrierDiagram tests', () => {
    it('should return null on error', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider.GetLatestBarrierDiagram({
          well_id: 'well_id',
          wellbore_id: 'wellbore_id',
          scenario_id: 'scenario_id',
          schematic_date: new Date(),
        }),
      ).toBeNull();

      expect(errorSpy).toBeCalled();
    });

    it('should return null when nothing found on database', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawOneNormalized: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue(null),
        getRawManyNormalized: jest.fn().mockResolvedValue(null),
      });

      expect(
        await provider.GetLatestBarrierDiagram({
          well_id: 'well_id',
          wellbore_id: 'wellbore_id',
          scenario_id: 'scenario_id',
          schematic_date: new Date(),
        }),
      ).toBeNull();
    });

    it('should return an object with values when call succeeds', async () => {
      const responseData = {
        barrier_diagram_id: '0000',
      };

      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(responseData),
        getRawOneNormalized: jest.fn().mockResolvedValue(responseData),
      });

      expect(
        await provider.GetLatestBarrierDiagram({
          well_id: 'well_id',
          wellbore_id: 'wellbore_id',
          scenario_id: 'scenario_id',
          schematic_date: new Date(),
        }),
      ).toEqual(responseData);
    });
  });

  describe('GetAnnulusData tests', () => {
    it('should return an empty array on error', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetLatestBarrierDiagram')
        .mockResolvedValueOnce({ barrier_diagram_id: '0000' });

      provider = await getProvider({
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(
        await provider.GetAnnulusData({
          well_id: 'well_id',
          wellbore_id: 'wellbore_id',
          scenario_id: 'scenario_id',
          schematic_date: new Date(),
        }),
      ).toEqual([]);
    });

    it('should return an empty array if GetLatestBarrierDiagram call returns null', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetLatestBarrierDiagram')
        .mockResolvedValueOnce(null);

      provider = await getProvider({
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawManyNormalized: jest.fn().mockResolvedValue([]),
      });

      expect(
        await provider.GetAnnulusData({
          well_id: 'well_id',
          wellbore_id: 'wellbore_id',
          scenario_id: 'scenario_id',
          schematic_date: new Date(),
        }),
      ).toEqual([]);
    });

    it('should return valid values on success call', async () => {
      jest
        .spyOn(ActualSchematicProvider.prototype, 'GetLatestBarrierDiagram')
        .mockResolvedValueOnce({
          barrier_diagram_id: '0000',
        });

      const getAnnulusTestMock = jest
        .spyOn(ActualSchematicProvider.prototype, 'GetAnnulusTests')
        .mockResolvedValue({
          maasp_location: '1',
          maasp_value: 1000,
          mawop_location: '1B',
          mawop_value: 2000,
          mop_value: 1000,
        });

      const sampleAnnulusesAnnulusComponentData: AnnulusComponentData[] = [
        {
          annulus_element_id: '0000',
          barrier_diagram_id: '0000',
          density: 1000,
          name: 'Anular A',
        },

        {
          annulus_element_id: '0000',
          barrier_diagram_id: '0000',
          density: 1000,
          name: 'Anular B',
        },
      ];

      provider = await getProvider({
        getRawMany: jest
          .fn()
          .mockResolvedValue(sampleAnnulusesAnnulusComponentData),
        getRawManyNormalized: jest
          .fn()
          .mockResolvedValue(sampleAnnulusesAnnulusComponentData),
      });

      const result = await provider.GetAnnulusData({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        schematic_date: new Date(),
      });

      expect(result[0].name).toEqual('Anular A');
      expect(result[0].maasp_value).toEqual(1000);

      expect(result[1].name).toEqual('Anular B');
      expect(result[1].maasp_value).toEqual(1000);

      expect(getAnnulusTestMock).toBeCalledTimes(2);

      getAnnulusTestMock.mockReset();
      getAnnulusTestMock.mockRestore();
    });
  });
  describe('GetAnnulusTests tests', () => {
    it('should return a valid object on success request', async () => {
      const mockTestData: AnnulustestComponentData[] = [
        {
          annulus_element_id: '0000',
          pressure: 1000,
          test_type: 'MOP',
        },
        {
          annulus_element_id: '0000',
          pressure: 2000,
          test_type: 'MAWOP',
          location: '1',
        },
        {
          annulus_element_id: '0000',
          pressure: 3000,
          test_type: 'MAASP',
          location: '2',
        },
      ];

      provider = await getProvider({
        getRawMany: jest.fn().mockResolvedValue(mockTestData),
        getRawManyNormalized: jest.fn().mockResolvedValue(mockTestData),
      });

      const result = await provider.GetAnnulusTests({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        barrier_diagram_id: '0000',
        annulus_element_id: '0000',
      });

      expect(result.maasp_location).toEqual('2');
      expect(result.mawop_location).toEqual('1');
    });

    it('should return an empty object when no data is found', async () => {
      provider = await getProvider({
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawManyNormalized: jest.fn().mockResolvedValue([]),
      });

      const result = await provider.GetAnnulusTests({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        barrier_diagram_id: '0000',
        annulus_element_id: '0000',
      });

      expect(result.maasp_location).toBeNull();
      expect(result.mawop_location).toBeNull();
    });

    it('should return an empty object when an error ocurs', async () => {
      provider = await getProvider({
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      const result = await provider.GetAnnulusTests({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        barrier_diagram_id: '0000',
        annulus_element_id: '0000',
      });

      expect(result.maasp_location).toBeNull();
      expect(result.mawop_location).toBeNull();
    });
  });

  describe('GetSurveyStations tests', () => {
    it('should return an empty array when no data is found', async () => {
      provider = await getProvider({
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawManyNormalized: jest.fn().mockResolvedValue([]),
      });

      const result = await provider.GetSurveyStations({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        schematic_date: new Date(),
      });

      expect(result).toEqual([]);
    });

    it('should return an empty array on error', async () => {
      provider = await getProvider({
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      const result = await provider.GetSurveyStations({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        schematic_date: new Date(),
      });

      expect(result).toEqual([]);
      expect(errorSpy).toBeCalled();
    });

    it('should return data when everything succeeds', async () => {
      const mockTestData: any[] = [
        {
          md: 0,
          inclination: 0,
          azimuth: 0,
          tvd: 0,
          offset_north: 0,
          offset_east: 0,
        },
      ];

      provider = await getProvider({
        getRawMany: jest.fn().mockResolvedValue(mockTestData),
        getRawManyNormalized: jest.fn().mockResolvedValue(mockTestData),
      });

      const result = await provider.GetSurveyStations({
        well_id: 'well_id',
        wellbore_id: 'wellbore_id',
        scenario_id: 'scenario_id',
        schematic_date: new Date(),
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('getLithology tests', () => {
    it('should return a valid lithology array when data is correct', async () => {
      const dummyLithology: any[] = [
        {
          wellbore_formation_id: 'TEST',
          lithology_name: 'TEST',
          lithology_id: 'TEST',
          actual_md_top: 0,
          actual_md_base: 0,
          actual_tvd_top: 0,
          actual_tvd_base: 0,
          formation_name: 'TEST',
          comments: 'TEST',
          actual_phase: 'TEST',
        },
      ];
      provider = await getProvider({
        getRawOne: jest.fn().mockResolvedValue(dummyLithology),
        getRawOneNormalized: jest.fn().mockResolvedValue(dummyLithology),
        getRawMany: jest.fn().mockResolvedValue(dummyLithology),
        getRawManyNormalized: jest.fn().mockResolvedValue(dummyLithology),
      });

      expect(
        await provider.GetLithology({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toHaveLength(1);
    });

    it('should return an error when data is incorrect', async () => {
      provider = await getProvider({
        getRawOne: jest.fn().mockRejectedValue([]),
        getRawOneNormalized: jest.fn().mockRejectedValue([]),
        getRawMany: jest.fn().mockRejectedValue([]),
        getRawManyNormalized: jest.fn().mockRejectedValue([]),
      });

      expect(errorSpy).toBeCalled();
      expect(
        await provider.GetLithology({
          scenario_id: 'test',
          schematic_date: new Date(),
          well_id: '',
          wellbore_id: '',
        }),
      ).toEqual([]);
    });
  });
});
