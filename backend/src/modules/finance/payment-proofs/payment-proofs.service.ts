import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FileHashService } from '../../core/services/file-hash.service';
import { FileSecurityUtil } from '../../core/utils/file-security.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentProofsService {
  private readonly logger = new Logger(PaymentProofsService.name);

  constructor(
    private prisma: PrismaService,
    private fileHashService: FileHashService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create payment proof with enhanced security
   */
  async createProofSecure(data: {
    studentId?: string;
    tagihanId?: string;
    amount: number;
    proofUrl: string;
    notes?: string;
    userId?: string;
    filePath: string;
    fileMetadata?: any;
  }) {
    const {
      studentId,
      tagihanId,
      amount,
      proofUrl,
      notes,
      userId,
      filePath,
      fileMetadata,
    } = data;

    this.logger.log(
      `Creating payment proof for user: ${userId}, student: ${studentId}`,
    );

    // If studentId not provided but userId is, find student record
    let finalStudentId = studentId;
    if (!finalStudentId && userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { student: true },
        });

        if (user?.student) {
          finalStudentId = user.student.id;
          this.logger.log(
            `Found student ID: ${finalStudentId} for user: ${userId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to find student for user ${userId}: ${error.message}`,
        );
        throw new BadRequestException('Gagal menemukan data siswa');
      }
    }

    if (!finalStudentId) {
      throw new BadRequestException('Student ID tidak ditemukan');
    }

    // Validate tagihan if provided
    if (tagihanId) {
      try {
        const tagihan = await this.prisma.tagihan.findUnique({
          where: { id: tagihanId },
        });

        if (!tagihan) {
          throw new BadRequestException('Tagihan tidak ditemukan');
        }

        if (tagihan.studentId !== finalStudentId) {
          throw new BadRequestException('Tagihan tidak sesuai dengan siswa');
        }

        if (tagihan.status === 'LUNAS') {
          throw new BadRequestException('Tagihan sudah lunas');
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error(
          `Failed to validate tagihan ${tagihanId}: ${error.message}`,
        );
        throw new BadRequestException('Gagal memvalidasi tagihan');
      }
    }

    try {
      // Process file hash and check for duplicates
      const hashResult = await this.fileHashService.processFileHash(
        filePath,
        userId || 'system',
      );

      if (hashResult.isDuplicate) {
        // Clean up the newly uploaded file since it's a duplicate
        await this.safeCleanupFile(filePath);

        // Check if duplicate is from same student
        const existingProof = await this.prisma.paymentProof.findFirst({
          where: {
            fileHash: hashResult.hash,
            studentId: finalStudentId,
          },
        });

        if (existingProof) {
          throw new BadRequestException(
            'File ini sudah pernah diupload sebelumnya oleh Anda',
          );
        } else {
          throw new BadRequestException('File ini sudah ada di sistem');
        }
      }

      // Create payment proof with file hash
      const proof = await this.prisma.paymentProof.create({
        data: {
          studentId: finalStudentId,
          tagihanId: tagihanId || null,
          amount,
          proofUrl,
          fileHash: hashResult.hash,
          notes,
        },
        include: {
          student: {
            include: {
              class: { select: { name: true } },
              user: { select: { id: true, name: true } },
            },
          },
          tagihan: true,
        },
      });

      this.logger.log(`Payment proof created successfully: ${proof.id}`);

      // Emit event for notification
      try {
        this.eventEmitter.emit('payment-proof.uploaded', {
          proofId: proof.id,
          studentId: finalStudentId,
          uploadedBy: userId,
        });
      } catch (eventError) {
        this.logger.warn(
          `Failed to emit payment-proof.uploaded event: ${eventError.message}`,
        );
        // Don't fail the whole operation for event emission failure
      }

      // Log the file upload activity
      await this.logFileActivity(userId, 'UPLOAD', proof.id, fileMetadata);

      return proof;
    } catch (error) {
      this.logger.error(`Failed to create payment proof: ${error.message}`);

      // Clean up file on error
      await this.safeCleanupFile(filePath);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Gagal membuat bukti pembayaran');
    }
  }

  /**
   * Log file activity for audit purposes
   */
  private async logFileActivity(
    userId: string | undefined,
    action: string,
    proofId: string,
    metadata?: any,
  ) {
    try {
      // This would be expanded in the audit trail implementation
      this.logger.log(
        `File activity: ${action} by user ${userId || 'system'} for proof ${proofId}`,
        {
          userId,
          action,
          proofId,
          metadata,
          timestamp: new Date().toISOString(),
        },
      );

      // You could also store this in database for audit trail
      // await this.prisma.auditLog.create({ ... })
    } catch (error) {
      this.logger.warn(`Failed to log file activity: ${error.message}`);
    }
  }

  /**
   * Safe cleanup file with error handling
   */
  private async safeCleanupFile(filePath: string): Promise<void> {
    try {
      await FileSecurityUtil.cleanupFile(filePath);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(userId?: string) {
    return this.fileHashService.getFileStats(userId);
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles() {
    return this.fileHashService.cleanupOrphanedHashes();
  }

  async getMyProofs(userId?: string) {
    if (!userId) {
      this.logger.warn('getMyProofs called without userId');
      return [];
    }

    try {
      // Get user's student record
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { student: true },
      });

      if (!user?.student) {
        this.logger.warn(`User ${userId} has no associated student record`);
        return [];
      }

      const proofs = await this.prisma.paymentProof.findMany({
        where: { studentId: user.student.id },
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              class: { select: { name: true } },
              user: { select: { id: true, name: true } },
            },
          },
          tagihan: true,
          verifiedUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(
        `Retrieved ${proofs.length} payment proofs for user ${userId}`,
      );
      return proofs;
    } catch (error) {
      this.logger.error(
        `Failed to get payment proofs for user ${userId}: ${error.message}`,
      );
      throw new BadRequestException('Gagal mengambil data bukti pembayaran');
    }
  }

  async getAllProofs(status?: string, page?: number, limit?: number) {
    try {
      const pageNumber = page || 1;
      const pageSize = limit || 50;
      const skip = (pageNumber - 1) * pageSize;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [proofs, total] = await Promise.all([
        this.prisma.paymentProof.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: {
                class: { select: { name: true } },
                user: { select: { id: true, name: true } },
              },
            },
            tagihan: true,
            verifiedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.paymentProof.count({ where }),
      ]);

      this.logger.log(
        `Retrieved ${proofs.length} payment proofs (page ${pageNumber}, total: ${total})`,
      );

      return {
        data: proofs,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get all payment proofs: ${error.message}`);
      throw new BadRequestException('Gagal mengambil data bukti pembayaran');
    }
  }

  async verifyProof(data: {
    paymentProofId: string;
    status: 'DIVERIFIKASI' | 'DITOLAK';
    notes?: string;
    verifiedBy: string;
  }) {
    const { paymentProofId, status, notes, verifiedBy } = data;

    this.logger.log(
      `Verifying payment proof ${paymentProofId} with status ${status} by user ${verifiedBy}`,
    );

    try {
      // First, check if payment proof exists and is in correct state
      const existingProof = await this.prisma.paymentProof.findUnique({
        where: { id: paymentProofId },
        include: {
          student: {
            include: {
              class: { select: { name: true } },
              user: { select: { id: true, name: true } },
            },
          },
          tagihan: true,
        },
      });

      if (!existingProof) {
        throw new NotFoundException('Bukti pembayaran tidak ditemukan');
      }

      if (existingProof.status !== 'MENUNGGU_VERIFIKASI') {
        throw new BadRequestException(
          `Bukti pembayaran sudah ${existingProof.status.toLowerCase()}`,
        );
      }

      // Verify the verifier exists and has permission
      const verifier = await this.prisma.user.findUnique({
        where: { id: verifiedBy },
      });

      if (!verifier) {
        throw new BadRequestException('User verifier tidak ditemukan');
      }

      // Update payment proof status using transaction
      const updatedProof = await this.prisma.$transaction(async (tx) => {
        // Update payment proof
        const proof = await tx.paymentProof.update({
          where: { id: paymentProofId },
          data: {
            status,
            notes,
            verifiedBy,
            updatedAt: new Date(),
          },
          include: {
            student: {
              include: {
                class: { select: { name: true } },
                user: { select: { id: true, name: true } },
              },
            },
            tagihan: true,
            verifiedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // If proof is verified and linked to a tagihan, mark tagihan as paid
        if (status === 'DIVERIFIKASI' && proof.tagihanId) {
          await tx.tagihan.update({
            where: { id: proof.tagihanId },
            data: {
              status: 'LUNAS',
              paidDate: new Date(),
            },
          });

          this.logger.log(`Tagihan ${proof.tagihanId} marked as LUNAS`);
        } else if (status === 'DITOLAK' && proof.tagihanId) {
          await tx.tagihan.update({
            where: { id: proof.tagihanId },
            data: {
              status: 'BELUM_LUNAS',
              paidDate: null,
            },
          });

          this.logger.log(
            `Tagihan ${proof.tagihanId} marked as BELUM_LUNAS (payment rejected)`,
          );
        }

        return proof;
      });

      this.logger.log(
        `Payment proof ${paymentProofId} verified successfully with status ${status}`,
      );

      // Emit event for notification
      try {
        this.eventEmitter.emit('payment-proof.verified', {
          proofId: updatedProof.id,
          status: status,
          verifiedBy,
          notes,
        });
      } catch (eventError) {
        this.logger.warn(
          `Failed to emit payment-proof.verified event: ${eventError.message}`,
        );
        // Don't fail the whole operation for event emission failure
      }

      return updatedProof;
    } catch (error) {
      this.logger.error(
        `Failed to verify payment proof ${paymentProofId}: ${error.message}`,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Gagal memverifikasi bukti pembayaran');
    }
  }
}
