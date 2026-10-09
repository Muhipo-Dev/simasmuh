import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('status')
  getMaintenanceStatus() {
    return this.maintenanceService.getStatus();
  }

  @Post('admin/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'GOD')
  async toggleMaintenance(
    @Body() body: { enabled: boolean; message?: string },
  ) {
    return this.maintenanceService.setMaintenanceMode(body.enabled, body.message);
  }
}
