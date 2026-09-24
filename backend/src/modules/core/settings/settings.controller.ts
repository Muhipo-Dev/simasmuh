import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ProgramConfigService } from './program-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole, SubRole } from '../auth/roles.decorator';
import { extractClientRealIp } from '../utils/client-ip.util';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly programConfigService: ProgramConfigService,
  ) {}

  @Get('public')
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('server-time')
  getServerTime() {
    return this.settingsService.getServerTime();
  }

  @Get('time-sync')
  getTimeSync(@Query('t') clientTime?: string) {
    const timestamp = clientTime ? parseInt(clientTime, 10) : undefined;
    return this.settingsService.getTimeSync(timestamp);
  }

  @Get('program-configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
  )
  getAllProgramConfigs() {
    return this.programConfigService.getAllPrograms();
  }

  @Post('program-configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
  )
  createProgramConfig(@Body() body: any) {
    return this.programConfigService.createProgram(body);
  }

  @Put('program-configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
  )
  updateProgramConfig(@Param('id') id: string, @Body() body: any) {
    return this.programConfigService.updateProgram(id, body);
  }

  @Delete('program-configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
  )
  deleteProgramConfig(@Param('id') id: string) {
    return this.programConfigService.deleteProgram(id);
  }

  @Get('public/stats')
  getPublicStats() {
    return this.settingsService.getStats();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getStats() {
    return this.settingsService.getStats();
  }

  @Get('executive-statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    'KEPALA_SEKOLAH',
    UserRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
    UserRole.ADMIN_TU,
    UserRole.BAU,
  )
  getExecutiveStatistics() {
    return this.settingsService.getExecutiveStatistics();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
    'KEPALA_SEKOLAH',
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
    SubRole.KURIKULUM,
    'KURIKULUM',
    'KESISWAAN',
    'ADMIN',
  )
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
    'KEPALA_SEKOLAH',
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
    SubRole.KURIKULUM,
    'KURIKULUM',
    'KESISWAAN',
    'ADMIN',
  )
  upsertSettings(@Body() data: any) {
    return this.settingsService.upsertSettings(data);
  }

  @Get('bank-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getBankAccount() {
    return this.settingsService.getBankAccount();
  }

  @Put('bank-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.KEUANGAN,
    SubRole.KEUANGAN,
    'KEUANGAN_ALL',
    'KEUANGAN_MASUK',
    'KEUANGAN_KELUAR',
  )
  updateBankAccount(@Body() data: any) {
    return this.settingsService.updateBankAccount(data);
  }

  @Get('qr-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getQrPublicToken() {
    return this.settingsService.getQrPublicToken();
  }

  @Post('qr-token/regenerate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  regenerateQrPublicToken() {
    return this.settingsService.regenerateQrPublicToken();
  }

  @Get('qr-token/validate')
  validateQrPublicToken(@Query('token') token: string) {
    return this.settingsService.validateQrPublicToken(token);
  }

  @Get('supervisor-metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  getSystemSupervisorMetrics(@Req() req: any) {
    const clientIp = extractClientRealIp(req);
    const host = req.headers['host'] || 'localhost:3001';
    return this.settingsService.getSystemSupervisorMetrics(clientIp, host);
  }

  @Get('network-benchmark/ping')
  @UseGuards(JwtAuthGuard)
  benchmarkPing(@Req() req: any, @Query('t') clientTimestamp?: string) {
    const clientTime = clientTimestamp
      ? parseInt(clientTimestamp, 10)
      : Date.now();
    const serverTime = Date.now();
    const clientIp = extractClientRealIp(req);
    const serverHost = req.headers['host'] || 'localhost:3001';
    return {
      clientIp,
      serverHost,
      clientSentAt: clientTime,
      serverReceivedAt: serverTime,
      serverSentAt: Date.now(),
      status: 'OK',
    };
  }

  @Get('network-benchmark/download')
  @UseGuards(JwtAuthGuard)
  benchmarkDownload(@Query('size') size?: string) {
    const kb = Math.min(Math.max(parseInt(size || '1024', 10), 64), 5120); // 64KB - 5MB chunk
    const buffer = Buffer.alloc(kb * 1024, 'A');
    return {
      sizeKb: kb,
      sizeBytes: buffer.length,
      payload: buffer.toString('base64'),
      timestamp: Date.now(),
    };
  }

  @Post('network-benchmark/upload')
  @UseGuards(JwtAuthGuard)
  benchmarkUpload(
    @Body() body: { data?: string; sizeBytes?: number },
    @Req() req: any,
  ) {
    const receivedBytes = body.data
      ? Buffer.byteLength(body.data, 'utf8')
      : body.sizeBytes || 0;
    const clientIp = extractClientRealIp(req);
    const serverHost = req.headers['host'] || 'localhost:3001';
    return {
      clientIp,
      serverHost,
      receivedBytes,
      receivedAt: Date.now(),
      status: 'SUCCESS',
    };
  }
}
