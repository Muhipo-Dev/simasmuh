import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProgramConfigDto {
  code: string;
  name: string;
  defaultSpp?: number;
  defaultBeasiswa?: number;
  description?: string;
}

export interface UpdateProgramConfigDto {
  code?: string;
  name?: string;
  defaultSpp?: number;
  defaultBeasiswa?: number;
  description?: string;
}

const DEFAULT_PROGRAMS = [
  { code: 'tahfidz', name: 'Tahfidz', defaultSpp: 360000, defaultBeasiswa: 0, description: 'Program Hifdzil Qur\'an' },
  { code: 'saintek', name: 'SAINSOS', defaultSpp: 450000, defaultBeasiswa: 0, description: 'Program Sains & Sosial (SAINSOS)' },
  { code: 'olahraga', name: 'Olahraga', defaultSpp: 330000, defaultBeasiswa: 0, description: 'Program Bakat Olahraga' },
  { code: 'MIC', name: 'Muhipo Internasional Class', defaultSpp: 600000, defaultBeasiswa: 0, description: 'Muhipo Internasional Class (MIC)' },
  { code: 'seni budaya', name: 'Seni Budaya', defaultSpp: 330000, defaultBeasiswa: 0, description: 'Program Seni & Kesenian' },
  { code: 'ai', name: 'Artificial Intelligence', defaultSpp: 500000, defaultBeasiswa: 0, description: 'Program Artificial Intelligence (AI)' },
  { code: 'inklusi', name: 'Inklusi', defaultSpp: 240000, defaultBeasiswa: 0, description: 'Program Pendampingan Inklusi' },
  { code: 'enterpreneur', name: 'Enterpreneur', defaultSpp: 390000, defaultBeasiswa: 0, description: 'Program Kewirausahaan (Enterpreneur)' },
];

@Injectable()
export class ProgramConfigService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultProgramsIfNeeded();
  }

  async seedDefaultProgramsIfNeeded() {
    const count = await this.prisma.programConfig.count();
    if (count === 0) {
      for (const prog of DEFAULT_PROGRAMS) {
        await this.prisma.programConfig.create({
          data: prog,
        });
      }
    }
  }

  async getAllPrograms() {
    return this.prisma.programConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getProgramByCode(code: string) {
    return this.prisma.programConfig.findUnique({
      where: { code },
    });
  }

  async createProgram(dto: CreateProgramConfigDto) {
    const code = dto.code.trim();
    const existing = await this.prisma.programConfig.findUnique({
      where: { code },
    });
    if (existing) {
      throw new Error(`Program dengan kode/identifier '${code}' sudah ada.`);
    }

    return this.prisma.programConfig.create({
      data: {
        code,
        name: dto.name,
        defaultSpp: Number(dto.defaultSpp || 0),
        defaultBeasiswa: Number(dto.defaultBeasiswa || 0),
        description: dto.description || '',
      },
    });
  }

  async updateProgram(id: string, dto: UpdateProgramConfigDto) {
    const existing = await this.prisma.programConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Program tidak ditemukan.');
    }

    return this.prisma.programConfig.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.defaultSpp !== undefined && { defaultSpp: Number(dto.defaultSpp) }),
        ...(dto.defaultBeasiswa !== undefined && { defaultBeasiswa: Number(dto.defaultBeasiswa) }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async deleteProgram(id: string) {
    const existing = await this.prisma.programConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Program tidak ditemukan.');
    }

    return this.prisma.programConfig.delete({
      where: { id },
    });
  }
}
