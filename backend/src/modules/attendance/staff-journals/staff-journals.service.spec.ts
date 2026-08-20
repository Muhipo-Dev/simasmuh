import { Test, TestingModule } from '@nestjs/testing';
import { StaffJournalsService } from './staff-journals.service';
import { PrismaService } from '../../core/prisma/prisma.service';

describe('StaffJournalsService', () => {
  let service: StaffJournalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffJournalsService,
        {
          provide: PrismaService,
          useValue: {
            staffJournal: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StaffJournalsService>(StaffJournalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
