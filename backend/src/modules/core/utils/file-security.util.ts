import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { VirusScannerUtil } from './virus-scanner.util';

export class FileSecurityUtil {
  // Maximum file sizes per type
  private static readonly MAX_SIZES = {
    'image/jpeg': 5 * 1024 * 1024, // 5MB for JPEG
    'image/png': 5 * 1024 * 1024, // 5MB for PNG
    'image/gif': 2 * 1024 * 1024, // 2MB for GIF
    'image/webp': 3 * 1024 * 1024, // 3MB for WebP
    'application/pdf': 10 * 1024 * 1024, // 10MB for PDF
  };

  // Allowed MIME types
  private static readonly ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  // Dangerous file extensions to reject
  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe',
    '.bat',
    '.cmd',
    '.scr',
    '.pif',
    '.com',
    '.jar',
    '.js',
    '.vbs',
    '.ps1',
    '.sh',
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.py',
    '.rb',
    '.pl',
  ];

  /**
   * Validate file before processing
   */
  static async validateFile(file: Express.Multer.File): Promise<{
    isValid: boolean;
    error?: string;
    metadata?: any;
  }> {
    try {
      // Basic validation
      if (!file) {
        return { isValid: false, error: 'No file provided' };
      }

      // Check file size
      const maxSize = this.MAX_SIZES[file.mimetype];
      if (!maxSize || file.size > maxSize) {
        return {
          isValid: false,
          error: `File too large. Maximum size: ${maxSize ? Math.round(maxSize / 1024 / 1024) : 5}MB`,
        };
      }

      // Check MIME type
      if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
        return {
          isValid: false,
          error: `Invalid file type. Allowed types: ${this.ALLOWED_MIMES.join(', ')}`,
        };
      }

      // Check dangerous extensions
      const ext = path.extname(file.originalname).toLowerCase();
      if (this.DANGEROUS_EXTENSIONS.includes(ext)) {
        return {
          isValid: false,
          error: 'Dangerous file extension detected',
        };
      }

      // Read file buffer for deeper validation
      const buffer = await fs.readFile(file.path);

      // Verify actual file type matches MIME type
      const detectedType = await fileTypeFromBuffer(buffer);
      if (detectedType && detectedType.mime !== file.mimetype) {
        return {
          isValid: false,
          error: 'File type mismatch detected (possible file spoofing)',
        };
      }

      // Additional validation based on file type
      let metadata = {};

      if (file.mimetype.startsWith('image/')) {
        metadata = await this.validateImage(buffer);
      } else if (file.mimetype === 'application/pdf') {
        metadata = await this.validatePDF(buffer);
      }

      // Virus scan
      const scanResult = await VirusScannerUtil.scanFile(file.path);
      if (!scanResult.isClean) {
        // Quarantine the suspicious file
        await VirusScannerUtil.quarantineFile(
          file.path,
          scanResult.threats?.join(', ') || 'Suspicious content',
        );
        return {
          isValid: false,
          error: `Security scan failed: ${scanResult.threats?.join(', ')}`,
        };
      }

      // Add scan result to metadata
      (metadata as any).scanResult = scanResult;

      return { isValid: true, metadata };
    } catch (error) {
      return {
        isValid: false,
        error: `File validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate and process image files
   */
  private static async validateImage(buffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check image dimensions (reasonable limits)
      const maxWidth = 5000;
      const maxHeight = 5000;
      const minWidth = 50;
      const minHeight = 50;

      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          throw new Error(
            `Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}`,
          );
        }
        if (metadata.width < minWidth || metadata.height < minHeight) {
          throw new Error(
            `Image too small. Minimum dimensions: ${minWidth}x${minHeight}`,
          );
        }
      }

      // Check for suspicious metadata that might indicate malicious content
      if (
        metadata.exif &&
        Buffer.byteLength(JSON.stringify(metadata.exif)) > 10000
      ) {
        throw new Error('Suspicious EXIF data detected');
      }

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  /**
   * Validate PDF files
   */
  private static async validatePDF(buffer: Buffer): Promise<any> {
    // Basic PDF signature check
    const pdfHeader = buffer.slice(0, 4);
    if (pdfHeader.toString() !== '%PDF') {
      throw new Error('Invalid PDF file signature');
    }

    // Check for suspicious content in PDF
    const content = buffer.toString('binary');
    const suspiciousPatterns = [
      '/JavaScript',
      '/JS',
      '/OpenAction',
      '/Launch',
      '/EmbeddedFile',
      '/XFA',
    ];

    for (const pattern of suspiciousPatterns) {
      if (content.includes(pattern)) {
        throw new Error(
          `Potentially dangerous PDF content detected: ${pattern}`,
        );
      }
    }

    return {
      size: buffer.length,
      hasSuspiciousContent: false,
    };
  }

  /**
   * Sanitize and optimize image files
   */
  static async processAndOptimizeImage(
    inputPath: string,
    outputPath: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      removeMetadata?: boolean;
    } = {},
  ): Promise<void> {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1080,
      removeMetadata = true,
    } = options;

    try {
      let processor = sharp(inputPath);

      // Remove metadata for privacy/security
      if (removeMetadata) {
        processor = processor.withMetadata({});
      }

      // Resize if too large
      processor = processor.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Optimize based on format
      const metadata = await sharp(inputPath).metadata();

      if (metadata.format === 'jpeg') {
        processor = processor.jpeg({ quality, mozjpeg: true });
      } else if (metadata.format === 'png') {
        processor = processor.png({ compressionLevel: 9 });
      } else if (metadata.format === 'webp') {
        processor = processor.webp({ quality });
      }

      await processor.toFile(outputPath);
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Generate file hash for duplicate detection
   */
  static generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if file is a duplicate
   */
  static async isDuplicateFile(
    filePath: string,
    existingHashes: string[],
  ): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      const hash = this.generateFileHash(buffer);
      return existingHashes.includes(hash);
    } catch {
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
