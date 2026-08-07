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
  ) {}

  @Get('public')
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.KEUANGAN, SubRole.KEUANGAN)
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
  @Roles('SUPERADMIN', UserRole.ADMIN_IT)
  regenerateQrPublicToken() {
    return this.settingsService.regenerateQrPublicToken();
  }

  @Get('qr-token/validate')
  validateQrPublicToken(@Query('token') token: string) {
    return this.settingsService.validateQrPublicToken(token);
  }
}

