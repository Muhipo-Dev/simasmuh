import { Controller, Get, Put, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getStats() {
    return this.settingsService.getStats();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  regenerateQrPublicToken() {
    return this.settingsService.regenerateQrPublicToken();
  }

  @Get('qr-token/validate')
  validateQrPublicToken(@Query('token') token: string) {
    return this.settingsService.validateQrPublicToken(token);
  }
}
