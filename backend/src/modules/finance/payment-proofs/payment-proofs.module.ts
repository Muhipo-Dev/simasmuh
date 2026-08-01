import { Module } from '@nestjs/common';
import { PaymentProofsController } from './payment-proofs.controller';
import { PaymentProofsService } from './payment-proofs.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';
import { FileHashService } from '../../core/services/file-hash.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, AuthModule, EventEmitterModule],
  controllers: [PaymentProofsController],
  providers: [PaymentProofsService, FileHashService],
  exports: [PaymentProofsService, FileHashService],
})
export class PaymentProofsModule {}
