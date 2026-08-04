import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileSecurityUtil } from '../utils/file-security.util';
import { readFile } from 'fs/promises';

@Injectable()
export class FileHashService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if file already exists and store its hash
   */
  async processFileHash(
    filePath: string,
    userId: string,
  ): Promise<{
    isDuplicate: boolean;
    existingFileId?: string;
    hash: string;
  }> {
    const buffer = await readFile(filePath);
    const hash = FileSecurityUtil.generateFileHash(buffer);

    // Check if file with same hash already exists
    const existingFile = await this.prisma.fileHash.findUnique({
      where: { hash },
    });

    if (existingFile) {
      return {
        isDuplicate: true,
        existingFileId: existingFile.id,
        hash,
      };
    }

    // Store new file hash
    await this.prisma.fileHash.create({
      data: {
        hash,
        filePath,
        uploadedBy: userId,
        fileSize: buffer.length,
      },
    });

    return {
      isDuplicate: false,
      hash,
    };
  }

  /**
   * Get file usage statistics
   */
  async getFileStats(userId?: string) {
    const where = userId ? { uploadedBy: userId } : {};

    const [totalFiles, totalSize] = await Promise.all([
      this.prisma.fileHash.count({ where }),
      this.prisma.fileHash.aggregate({
        where,
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      totalFiles,
      totalSize: totalSize._sum.fileSize || 0,
    };
  }

  /**
   * Clean up orphaned file hashes
   */
  async cleanupOrphanedHashes(): Promise<number> {
    // Find file hashes that don't have corresponding payment proofs
    const orphanedHashes = await this.prisma.fileHash.findMany({
      where: {
        paymentProofs: {
          none: {},
        },
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
        },
      },
    });

    if (orphanedHashes.length > 0) {
      // Delete orphaned file hashes
      await this.prisma.fileHash.deleteMany({
        where: {
          id: {
            in: orphanedHashes.map((h) => h.id),
          },
        },
      });

      // Also clean up the actual files
      for (const hash of orphanedHashes) {
        await FileSecurityUtil.cleanupFile(hash.filePath);
      }
    }

    return orphanedHashes.length;
  }
}
