import { Test, TestingModule } from '@nestjs/testing';
import { StaffJournalsController } from './staff-journals.controller';
import { StaffJournalsService } from './staff-journals.service';

describe('StaffJournalsController', () => {
  let controller: StaffJournalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffJournalsController],
      providers: [
        {
          provide: StaffJournalsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StaffJournalsController>(StaffJournalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
