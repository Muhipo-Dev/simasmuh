import { Test, TestingModule } from '@nestjs/testing';
import { StaffJournalsController } from './staff-journals.controller';

describe('StaffJournalsController', () => {
  let controller: StaffJournalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffJournalsController],
    }).compile();

    controller = module.get<StaffJournalsController>(StaffJournalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
