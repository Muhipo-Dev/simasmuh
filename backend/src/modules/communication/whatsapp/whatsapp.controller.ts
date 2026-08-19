import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { Roles } from '../../core/auth/roles.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('status')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'BENDAHARA', 'KEPALA_SEKOLAH')
  async getStatus() {
    return this.whatsAppService.getGatewayStatus();
  }

  @Get('config')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'BENDAHARA', 'KEPALA_SEKOLAH')
  async getConfig() {
    return this.whatsAppService.getWhatsAppConfig();
  }

  @Put('config')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU')
  async updateConfig(
    @Body() body: {
      whatsappSenderNumber?: string;
      whatsappApiUrl?: string;
      whatsappApiKey?: string;
    },
  ) {
    return this.whatsAppService.updateWhatsAppConfig(body);
  }

  @Get('logs')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'BENDAHARA', 'KEPALA_SEKOLAH')
  async getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.whatsAppService.getLogs(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
      category,
      status,
    );
  }

  @Post('send-test')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'BENDAHARA')
  async sendTestMessage(
    @Body() body: { to: string; message: string; recipientName?: string },
  ) {
    return this.whatsAppService.sendDirectMessage({
      to: body.to,
      message: body.message || 'Ini adalah uji coba notifikasi WhatsApp SIMASMUH.',
      recipientName: body.recipientName || 'Uji Coba Pengguna',
      category: 'SISTEM',
      title: 'Uji Coba Notifikasi WhatsApp',
    });
  }

  @Post('broadcast')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU')
  async broadcastMessage(
    @Body() body: {
      target: 'SEMUA' | 'GURU' | 'SISWA' | 'ORANG_TUA' | 'PEGAWAI';
      title: string;
      message: string;
    },
  ) {
    return this.whatsAppService.broadcastManual(body);
  }

  @Post('retry/:id')
  @Roles('SUPERADMIN', 'ADMIN', 'ADMIN_IT', 'ADMIN_TU')
  async retryMessage(@Param('id') id: string) {
    return this.whatsAppService.retryLog(id);
  }

  @Delete('logs/clear')
  @Roles('SUPERADMIN', 'ADMIN_IT')
  async clearLogs() {
    return this.whatsAppService.clearLogs();
  }
}
