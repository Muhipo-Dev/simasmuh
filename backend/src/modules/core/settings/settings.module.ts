import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ProgramConfigService } from './program-config.service';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [WaitingRoomModule, MaintenanceModule],
  controllers: [SettingsController],
  providers: [SettingsService, ProgramConfigService],
  exports: [SettingsService, ProgramConfigService],
})
export class SettingsModule {}
