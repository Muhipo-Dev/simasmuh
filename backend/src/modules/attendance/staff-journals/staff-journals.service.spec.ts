import { Test, TestingModule } from '@nestjs/testing';
import { StaffJournalsService } from './staff-journals.service';

describe('StaffJournalsService', () => {
  let service: StaffJournalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffJournalsService],
    }).compile();

    service = module.get<StaffJournalsService>(StaffJournalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
