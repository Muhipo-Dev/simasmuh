import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';
import { BadRequestException } from '@nestjs/common';
import { FileSecurityUtil } from '../utils/file-security.util';
import { STORAGE_DIRS } from './storage.config';

const tempDir = STORAGE_DIRS.temp;


export const multerConfig = {
  storage: diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      // Store in temp directory first for validation
      cb(null, tempDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      // Sanitize filename
      const sanitizedOriginalName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_');

      const uniqueId = uuid();
      const timestamp = Date.now();
      const fileExtension = extname(sanitizedOriginalName);
      const filename = `${timestamp}_${uniqueId}${fileExtension}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1, // Only 1 file at a time
    fieldSize: 1024 * 1024, // 1MB field size
    fieldNameSize: 100, // Field name size limit
  },
  fileFilter: async (req: Request, file: Express.Multer.File, cb) => {
    try {
      // Basic MIME type check
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      if (!allowedMimes.includes(file.mimetype)) {
        return cb(
          new BadRequestException(
            'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.',
          ),
          false,
        );
      }

      // Check file extension
      const ext = extname(file.originalname).toLowerCase();
      const allowedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.pdf',
      ];

      if (!allowedExtensions.includes(ext)) {
        return cb(new BadRequestException('Invalid file extension.'), false);
      }

      // Check filename for suspicious patterns
      const suspiciousPatterns = [
        /\.{2,}/, // Multiple dots
        /[<>:"|?*]/, // Windows forbidden characters
        /^\s|\s$/, // Leading/trailing spaces
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(file.originalname)) {
          return cb(
            new BadRequestException('Invalid filename detected.'),
            false,
          );
        }
      }

      cb(null, true);
    } catch (error) {
      cb(
        new BadRequestException(`File validation error: ${error.message}`),
        false,
      );
    }
  },
};

// Enhanced configuration for payment proofs with stricter validation
export const paymentProofMulterConfig = {
  ...multerConfig,
  limits: {
    ...multerConfig.limits,
    fileSize: 5 * 1024 * 1024, // 5MB for payment proofs
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb) => {
    // Payment proofs should be images or PDFs only
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Payment proofs must be JPEG, PNG images or PDF files only.',
        ),
        false,
      );
    }

    // Additional filename validation for payment proofs
    if (file.originalname.length > 255) {
      return cb(new BadRequestException('Filename too long.'), false);
    }

    cb(null, true);
  },
};
