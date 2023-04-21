import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisDataService } from './analysis-data.service';

describe('AnalysisDataService', () => {
  let service: AnalysisDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalysisDataService],
    }).compile();

    service = module.get<AnalysisDataService>(AnalysisDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
