import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
