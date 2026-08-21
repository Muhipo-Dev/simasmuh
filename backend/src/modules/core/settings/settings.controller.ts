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
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ProgramConfigService } from './program-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole, SubRole } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly programConfigService: ProgramConfigService,
  ) { }

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
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
  getAllProgramConfigs() {
    return this.programConfigService.getAllPrograms();
  }

  @Post('program-configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
  createProgramConfig(@Body() body: any) {
    return this.programConfigService.createProgram(body);
  }

  @Put('program-configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
  updateProgramConfig(@Param('id') id: string, @Body() body: any) {
    return this.programConfigService.updateProgram(id, body);
  }

  @Delete('program-configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
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
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, 'KEPALA_SEKOLAH', UserRole.KEUANGAN, UserRole.ADMIN_TU, UserRole.BAU)
  getExecutiveStatistics() {
    return this.settingsService.getExecutiveStatistics();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN, 'KEPALA_SEKOLAH', UserRole.ADMIN_TU, UserRole.BAU, UserRole.TATA_USAHA, SubRole.ADMIN_TU, SubRole.BAU)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN, UserRole.ADMIN_TU, UserRole.BAU, UserRole.TATA_USAHA, SubRole.ADMIN_TU, SubRole.BAU)
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
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
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
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.ADMIN_TU, UserRole.BAU, UserRole.TATA_USAHA, SubRole.ADMIN_TU, SubRole.BAU)
  regenerateQrPublicToken() {
    return this.settingsService.regenerateQrPublicToken();
  }

  @Get('qr-token/validate')
  validateQrPublicToken(@Query('token') token: string) {
    return this.settingsService.validateQrPublicToken(token);
  }
}

