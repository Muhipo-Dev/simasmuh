import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getSettings(): Promise<any> {
    const cacheKey = 'app_settings_full';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const settings = await this.prisma.setting.findFirst();
    if (!settings) {
      const created = await this.prisma.setting.create({
        data: {
          schoolName: 'SMA Muhammadiyah 1 Ponorogo',
          address: 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur',
          phone: '(0352) 481428',
          email: 'info@smamuh1ponorogo.sch.id',
          principalName: 'Drs. H. Sugeng, M.Pd.',
          academicYear: '2026/2027',
          semester: 'Ganjil',
          bankName: 'Bank Syariah Indonesia (BSI)',
          bankNumber: '7123456789',
          bankOwner: 'SMA MUHAMMADIYAH 1 PONOROGO',
          defaultDpp: 1500000,
          defaultUka: 500000,
          defaultUks: 100000,
          defaultInfaq: 300000,
          defaultSeragam: 2000000,
          whatsappSenderNumber: '088293733330',
          helpdeskPhone: '088293733330',
        } as any,
      });
      await this.cacheManager.set(cacheKey, created, 60000); // 60s cache
      return created;
    }
    await this.cacheManager.set(cacheKey, settings, 60000);
    return settings;
  }

  async getPublicSettings(): Promise<any> {
    const cacheKey = 'app_settings_public';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const settings = await this.prisma.setting.findFirst({
      select: {
        schoolName: true,
        address: true,
        phone: true,
        email: true,
        academicYear: true,
        semester: true,
        logoUrl: true,
        defaultDpp: true,
        defaultUka: true,
        defaultUks: true,
        defaultInfaq: true,
        defaultSeragam: true,
        helpdeskPhone: true,
      } as any,
    });
    if (!settings) {
      const defaultPublic = {
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
        address: 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur',
        phone: '(0352) 481428',
        email: 'info@smamuh1ponorogo.sch.id',
        academicYear: '2026/2027',
        semester: 'Ganjil',
        logoUrl: null,
        defaultDpp: 1500000,
        defaultUka: 500000,
        defaultUks: 100000,
        defaultInfaq: 300000,
        defaultSeragam: 2000000,
        helpdeskPhone: '088293733330',
      };
      await this.cacheManager.set(cacheKey, defaultPublic, 60000);
      return defaultPublic;
    }
    await this.cacheManager.set(cacheKey, settings, 60000);
    return settings;
  }

  async upsertSettings(data: any) {
    await this.cacheManager.del('app_settings_full');
    await this.cacheManager.del('app_settings_public');
    const settings = await this.prisma.setting.findFirst();
    if (settings) {
      return this.prisma.setting.update({
        where: { id: settings.id },
        data,
      });
    }
    return this.prisma.setting.create({
      data,
    });
  }

  async getStats() {
    const [teacherCount, studentCount, classCount] = await Promise.all([
      this.prisma.teacherProfile.count(),
      this.prisma.student.count(),
      this.prisma.class.count(),
    ]);

    return {
      teachers: teacherCount,
      students: studentCount,
      classes: classCount,
    };
  }

  async getQrPublicToken() {
    let settings: any = await this.prisma.setting.findFirst();
    if (!settings) {
      settings = await this.getSettings();
    }
    if (!settings?.qrPublicToken) {
      const token = randomBytes(16).toString('hex');
      settings = await this.prisma.setting.update({
        where: { id: settings.id },
        data: { qrPublicToken: token },
      });
    }
    return { token: settings?.qrPublicToken || '' };
  }

  async regenerateQrPublicToken() {
    const settings = await this.getSettings();
    const token = randomBytes(16).toString('hex');
    const updated = await this.prisma.setting.update({
      where: { id: settings.id },
      data: { qrPublicToken: token },
    });
    return { token: updated.qrPublicToken };
  }

  async validateQrPublicToken(token: string) {
    const settings = await this.prisma.setting.findFirst();
    return { valid: settings?.qrPublicToken === token };
  }

  async getBankAccount() {
    const settings = await this.prisma.setting.findFirst({
      select: {
        bankName: true,
        bankNumber: true,
        bankOwner: true,
      },
    });
    if (!settings) {
      return { bankName: '', bankNumber: '', bankOwner: '' };
    }
    return {
      bankName: settings.bankName || '',
      bankNumber: settings.bankNumber || '',
      bankOwner: settings.bankOwner || '',
    };
  }

  async updateBankAccount(data: any) {
    const settings = await this.prisma.setting.findFirst();
    if (!settings) {
      return this.prisma.setting.create({
        data: {
          schoolName: data.schoolName || 'Nama Sekolah',
          address: data.address || 'Alamat Sekolah',
          bankName: data.bankName || '',
          bankNumber: data.bankNumber || '',
          bankOwner: data.bankOwner || '',
        },
      });
    }
    return this.prisma.setting.update({
      where: { id: settings.id },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankNumber !== undefined && { bankNumber: data.bankNumber }),
        ...(data.bankOwner !== undefined && { bankOwner: data.bankOwner }),
      },
    });
  }
}
