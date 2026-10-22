import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProgramConfigDto {
  code: string;
  name: string;
  defaultSpp?: number;
  defaultBeasiswa?: number;
  description?: string;
  subtitle?: string;
  fullContent?: string;
  features?: string;
  fasilitasList?: string;
  keunggulanList?: string;
  iconName?: string;
  logoUrl?: string;
  badgeColor?: string;
  order?: number;
  isVisible?: boolean;
}

export interface UpdateProgramConfigDto {
  code?: string;
  name?: string;
  defaultSpp?: number;
  defaultBeasiswa?: number;
  description?: string;
  subtitle?: string;
  fullContent?: string;
  features?: string;
  fasilitasList?: string;
  keunggulanList?: string;
  iconName?: string;
  logoUrl?: string;
  badgeColor?: string;
  order?: number;
  isVisible?: boolean;
}

const DEFAULT_PROGRAMS = [
  {
    code: 'tahfidz',
    name: 'Tahfidz',
    defaultSpp: 360000,
    defaultBeasiswa: 0,
    description: "Program Hifdzil Qur'an",
  },
  {
    code: 'saintek',
    name: 'SAINSOS',
    defaultSpp: 450000,
    defaultBeasiswa: 0,
    description: 'Program Sains & Sosial (SAINSOS)',
  },
  {
    code: 'olahraga',
    name: 'Olahraga',
    defaultSpp: 330000,
    defaultBeasiswa: 0,
    description: 'Program Bakat Olahraga',
  },
  {
    code: 'MIC',
    name: 'Muhipo Internasional Class',
    defaultSpp: 600000,
    defaultBeasiswa: 0,
    description: 'Muhipo Internasional Class (MIC)',
  },
  {
    code: 'seni budaya',
    name: 'Seni Budaya',
    defaultSpp: 330000,
    defaultBeasiswa: 0,
    description: 'Program Seni & Kesenian',
  },
  {
    code: 'ai',
    name: 'Artificial Intelligence',
    defaultSpp: 500000,
    defaultBeasiswa: 0,
    description: 'Program Artificial Intelligence (AI)',
  },
  {
    code: 'inklusi',
    name: 'Inklusi',
    defaultSpp: 240000,
    defaultBeasiswa: 0,
    description: 'Program Pendampingan Inklusi',
  },
  {
    code: 'enterpreneur',
    name: 'Enterpreneur',
    defaultSpp: 390000,
    defaultBeasiswa: 0,
    description: 'Program Kewirausahaan (Enterpreneur)',
  },
];

@Injectable()
export class ProgramConfigService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultProgramsIfNeeded();
  }

  async seedDefaultProgramsIfNeeded() {
    try {
      const count = await this.prisma.programConfig.count();
      if (count === 0) {
        for (const prog of DEFAULT_PROGRAMS) {
          await this.prisma.programConfig.create({
            data: prog,
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat ProgramConfig default:', err?.message || err);
    }
  }

  async getAllPrograms() {
    return this.prisma.programConfig.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getPublicPrograms() {
    return this.prisma.programConfig.findMany({
      where: { isVisible: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        subtitle: true,
        description: true,
        fullContent: true,
        features: true,
        fasilitasList: true,
        keunggulanList: true,
        iconName: true,
        logoUrl: true,
        badgeColor: true,
        order: true,
        isVisible: true,
      },
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
        subtitle: dto.subtitle ?? null,
        fullContent: dto.fullContent ?? null,
        features: dto.features ?? null,
        fasilitasList: dto.fasilitasList ?? null,
        keunggulanList: dto.keunggulanList ?? null,
        iconName: dto.iconName ?? 'BookOpen',
        logoUrl: dto.logoUrl ?? null,
        badgeColor: dto.badgeColor ?? 'blue',
        order: dto.order !== undefined ? Number(dto.order) : 0,
        isVisible: dto.isVisible !== undefined ? Boolean(dto.isVisible) : true,
      },
    });
  }

  async updateProgram(id: string, dto: UpdateProgramConfigDto) {
    const existing = await this.prisma.programConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Program tidak ditemukan.');
    }

    return this.prisma.programConfig.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.defaultSpp !== undefined && {
          defaultSpp: Number(dto.defaultSpp),
        }),
        ...(dto.defaultBeasiswa !== undefined && {
          defaultBeasiswa: Number(dto.defaultBeasiswa),
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subtitle !== undefined && { subtitle: dto.subtitle }),
        ...(dto.fullContent !== undefined && { fullContent: dto.fullContent }),
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.fasilitasList !== undefined && { fasilitasList: dto.fasilitasList }),
        ...(dto.keunggulanList !== undefined && { keunggulanList: dto.keunggulanList }),
        ...(dto.iconName !== undefined && { iconName: dto.iconName }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.badgeColor !== undefined && { badgeColor: dto.badgeColor }),
        ...(dto.order !== undefined && { order: Number(dto.order) }),
        ...(dto.isVisible !== undefined && { isVisible: Boolean(dto.isVisible) }),
      },
    });
  }

  async reorderPrograms(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.programConfig.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return { success: true, count: items.length };
  }

  async deleteProgram(id: string) {
    const existing = await this.prisma.programConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Program tidak ditemukan.');
    }

    return this.prisma.programConfig.delete({
      where: { id },
    });
  }
}
