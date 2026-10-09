import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceService.name);

  public maintenanceMode = false;
  public maintenanceMessage = 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.';

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async onModuleInit() {
    await this.loadPersistedConfig();
  }

  public async loadPersistedConfig() {
    if (!this.prisma) return;
    try {
      const setting: any = await this.prisma.setting.findFirst({
        select: { id: true, principalName: true },
      });
      if (setting?.principalName && setting.principalName.startsWith('MAINT_CFG:')) {
        const jsonStr = setting.principalName.replace(/^MAINT_CFG:/, '');
        const cfg = JSON.parse(jsonStr);
        if (typeof cfg.maintenanceMode === 'boolean') this.maintenanceMode = cfg.maintenanceMode;
        if (typeof cfg.maintenanceMessage === 'string') this.maintenanceMessage = cfg.maintenanceMessage;
        this.logger.log(`🔧 [Maintenance] Konfigurasi dimuat dari database: maintenanceMode=${this.maintenanceMode}`);
      }
    } catch (err: any) {
      this.logger.warn(`Gagal memuat konfigurasi maintenance dari database: ${err.message}`);
    }
  }

  public async savePersistedConfig() {
    if (!this.prisma) return;
    try {
      const payload = JSON.stringify({
        maintenanceMode: this.maintenanceMode,
        maintenanceMessage: this.maintenanceMessage,
      });
      const setting: any = await this.prisma.setting.findFirst({
        select: { id: true },
      });
      if (setting?.id) {
        await this.prisma.setting.update({
          where: { id: setting.id },
          data: { principalName: `MAINT_CFG:${payload}` },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Gagal menyimpan konfigurasi maintenance ke database: ${err.message}`);
    }
  }

  public isMaintenanceActive(): boolean {
    return this.maintenanceMode;
  }

  public isRoleAllowedDuringMaintenance(user: {
    username?: string | null;
    role?: string | null;
    subRole?: string | null;
    subRole2?: string | null;
    subRole3?: string | null;
    subRole4?: string | null;
    subRole5?: string | null;
  }): boolean {
    if (!user) return false;

    const username = (user.username || '').toLowerCase();
    if (username === 'supermuhipo') return true;

    const roles = [
      user.role,
      user.subRole,
      user.subRole2,
      user.subRole3,
      user.subRole4,
      user.subRole5,
    ]
      .filter(Boolean)
      .map((r) => String(r).toUpperCase());

    const privilegedRoles = [
      'GOD',
      'GOD_USER',
      'SUPERADMIN',
      'ADMIN_IT',
      'ADMIN_TU',
      'BAU',
      'TATA_USAHA',
      'ADMIN',
    ];

    return roles.some(
      (r) =>
        privilegedRoles.includes(r) ||
        r.includes('ADMIN_TU') ||
        r.includes('ADMIN_IT') ||
        r.includes('SUPERADMIN'),
    );
  }

  public async setMaintenanceMode(enabled: boolean, message?: string) {
    this.maintenanceMode = enabled;
    if (typeof message === 'string' && message.trim()) {
      this.maintenanceMessage = message.trim();
    }
    await this.savePersistedConfig();
    return {
      success: true,
      maintenanceMode: this.maintenanceMode,
      maintenanceMessage: this.maintenanceMessage,
    };
  }

  public getStatus() {
    return {
      maintenanceMode: this.maintenanceMode,
      maintenanceMessage: this.maintenanceMessage,
    };
  }
}
