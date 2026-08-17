import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Param,
  Req,
} from '@nestjs/common';
import { PaymentProofsService } from './payment-proofs.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import {
  RequirePermissions,
  PaymentPermission,
} from '../../core/auth/roles.decorator';
import { paymentProofMulterConfig } from '../../core/config/multer.config';
import { FileProcessingInterceptor } from '../../core/interceptors/file-processing.interceptor';
import { CreatePaymentProofDto } from './dto/create-payment-proof.dto';
import { VerifyPaymentProofDto } from './dto/verify-payment-proof.dto';
import { join } from 'path';
import * as fs from 'fs';

import { STORAGE_DIRS } from '../../core/config/storage.config';

@Controller('payment-proofs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentProofsController {
  constructor(private readonly paymentProofsService: PaymentProofsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', paymentProofMulterConfig),
    FileProcessingInterceptor,
  )
  @RequirePermissions(PaymentPermission.UPLOAD_PAYMENT_PROOF)
  async uploadProof(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreatePaymentProofDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const proofUrl = `/uploads/payment-proofs/${file.filename}`;
    const finalPath = join(STORAGE_DIRS.paymentProofs, file.filename);
    try {
      await fs.promises.rename(file.path, finalPath);
      file.path = finalPath;
    } catch (moveError) {
      // Fallback in case rename fails across different filesystems
      await fs.promises.copyFile(file.path, finalPath);
      await fs.promises.unlink(file.path);
      file.path = finalPath;
    }

    return this.paymentProofsService.createProofSecure({
      ...data,
      proofUrl,
      userId: req.user?.id,
      filePath: file.path,
      fileMetadata: req.fileMetadata,
    });
  }

  @Get('my')
  @RequirePermissions(PaymentPermission.VIEW_OWN_PAYMENT_HISTORY)
  getMyProofs(@Req() req: any) {
    return this.paymentProofsService.getMyProofs(req.user?.id);
  }

  @Get()
  @RequirePermissions(PaymentPermission.VERIFY_PAYMENTS)
  getAllProofs(@Query('status') status?: string) {
    return this.paymentProofsService.getAllProofs(status);
  }

  @Post(':id/verify')
  verifyProof(
    @Param('id') id: string,
    @Body() data: VerifyPaymentProofDto,
    @Req() req: any,
  ) {
    return this.paymentProofsService.verifyProof({
      paymentProofId: id,
      ...data,
      verifiedBy: req.user?.id,
    });
  }

  @Get('file-stats')
  @RequirePermissions(PaymentPermission.VIEW_AUDIT_LOGS)
  getFileStats(@Req() req: any) {
    // Admin IT can see all stats, others only their own
    const userId = req.user?.role === 'ADMIN_IT' ? undefined : req.user?.id;
    return this.paymentProofsService.getFileStats(userId);
  }

  @Post('cleanup-orphaned')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  cleanupOrphanedFiles() {
    return this.paymentProofsService.cleanupOrphanedFiles();
  }
}
