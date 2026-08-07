import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ProgramConfigService } from './program-config.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, ProgramConfigService],
  exports: [ProgramConfigService],
})
export class SettingsModule {}

