import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { STORAGE_DIRS, STORAGE_ROOT } from '../config/storage.config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /**
   * Menyimpan berkas Base64 (Gambar WebP/JPEG/PNG atau Dokumen PDF) dengan penyimpanan aman
   */
  async saveBase64Image(
    base64Str: string,
    folder?: 'thumbnails' | 'profiles' | 'journals' | 'sdm_docs' | string,
  ): Promise<string> {
    const matches = base64Str.match(/^data:([A-Za-z0-9-+./]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Format berkas tidak valid');
    }

    const mimeType = matches[1].toLowerCase();
    const buffer = Buffer.from(matches[2], 'base64');

    // Validasi batas ukuran file maksimal 20 MB (20 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('Ukuran file melebihi batas maksimal 20 MB');
    }
    
    let extension = 'bin';
    const isPdf = mimeType.includes('pdf');
    const isImage = mimeType.includes('image');
    const isDocx = mimeType.includes('wordprocessingml') || mimeType.includes('docx');
    const isDoc = mimeType.includes('msword') || mimeType.includes('doc');

    if (isPdf) {
      extension = 'pdf';
    } else if (isDocx) {
      extension = 'docx';
    } else if (isDoc) {
      extension = 'doc';
    } else if (isImage) {
      extension = 'webp';
    } else {
      // Fallback ekstensi dari mimeType
      const subType = mimeType.split('/')[1]?.split(';')[0]?.replace(/[^a-z0-9]/g, '');
      extension = subType || 'dat';
    }

    const filename = `${uuidv4()}-${Date.now()}.${extension}`;

    // Tentukan direktori penyimpanan target
    let targetDir = STORAGE_ROOT;
    let urlPrefix = '/uploads';

    if (folder && folder in STORAGE_DIRS) {
      targetDir = STORAGE_DIRS[folder as keyof typeof STORAGE_DIRS];
      urlPrefix = `/uploads/${folder}`;
    } else if (folder) {
      const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
      targetDir = path.join(STORAGE_ROOT, sanitizedFolder);
      urlPrefix = `/uploads/${sanitizedFolder}`;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);

    if (isImage) {
      try {
        // Multi-pass auto compression strictly <= 1MB (1024 * 1024 bytes)
        const MAX_IMAGE_BYTES = 1024 * 1024; // 1MB
        let quality = 82;
        let targetWidth = 1600;
        let targetHeight = 1600;
        let outputBuffer: Buffer | null = null;
        let pass = 0;
        const maxPasses = 4;

        while (pass < maxPasses) {
          outputBuffer = await sharp(buffer)
            .rotate() // Menyesuaikan orientasi EXIF kamera HP
            .resize({ width: targetWidth, height: targetHeight, fit: 'inside', withoutEnlargement: true })
            .webp({ quality, effort: 4 })
            .toBuffer();

          if (outputBuffer.length <= MAX_IMAGE_BYTES) {
            break;
          }

          pass++;
          quality = Math.max(40, Math.floor(quality * 0.75));
          targetWidth = Math.floor(targetWidth * 0.8);
          targetHeight = Math.floor(targetHeight * 0.8);
        }

        if (outputBuffer) {
          await fs.promises.writeFile(filePath, outputBuffer);
          this.logger.log(`Image compressed & saved (<= 1MB): ${filename} (${Math.round(outputBuffer.length / 1024)} KB, pass ${pass})`);
        } else {
          await fs.promises.writeFile(filePath, buffer);
        }
      } catch (sharpError) {
        this.logger.warn(`Sharp conversion fallback: ${sharpError}`);
        await fs.promises.writeFile(filePath, buffer);
      }
    } else {
      // Dokumen PDF, Word, atau berkas arsip lainnya disimpan utuh dan aman
      await fs.promises.writeFile(filePath, buffer);
    }

    return `${urlPrefix}/${filename}`;
  }

  // ==========================================
  // CAROUSEL MANAGEMENT
  // ==========================================
  async saveCarouselImage(base64Str: string): Promise<string> {
    const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid input string');
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `banner-${Date.now()}.webp`;
    const uploadPath = STORAGE_DIRS.carousel;

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, filename);

    try {
      // Multi-pass auto compression strictly <= 1MB
      const MAX_IMAGE_BYTES = 1024 * 1024;
      let quality = 82;
      let targetWidth = 1920;
      let targetHeight = 1080;
      let outputBuffer: Buffer | null = null;
      let pass = 0;

      while (pass < 4) {
        outputBuffer = await sharp(buffer)
          .rotate()
          .resize({ width: targetWidth, height: targetHeight, fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 4 })
          .toBuffer();

        if (outputBuffer.length <= MAX_IMAGE_BYTES) break;

        pass++;
        quality = Math.max(40, Math.floor(quality * 0.75));
        targetWidth = Math.floor(targetWidth * 0.8);
        targetHeight = Math.floor(targetHeight * 0.8);
      }

      if (outputBuffer) {
        await fs.promises.writeFile(filePath, outputBuffer);
      } else {
        await fs.promises.writeFile(filePath, buffer);
      }
    } catch {
      await fs.promises.writeFile(filePath, buffer);
    }

    return `/uploads/carousel/${filename}`;
  }

  async listCarouselImages(): Promise<string[]> {
    const uploadPath = STORAGE_DIRS.carousel;
    if (!fs.existsSync(uploadPath)) {
      return [];
    }

    const files = await fs.promises.readdir(uploadPath);
    // Filter only images
    const images = files.filter(
      (f) =>
        f.endsWith('.jpg') ||
        f.endsWith('.png') ||
        f.endsWith('.webp') ||
        f.endsWith('.jpeg'),
    );
    return images.map((f) => `/uploads/carousel/${f}`);
  }

  async deleteCarouselImage(filename: string): Promise<boolean> {
    // Only allow deleting files in carousel dir
    const safeFilename = path.basename(filename);
    const filePath = path.join(STORAGE_DIRS.carousel, safeFilename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}
