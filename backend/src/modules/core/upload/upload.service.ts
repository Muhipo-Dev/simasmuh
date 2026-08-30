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
   * Menyimpan gambar Base64 dengan kompresi otomatis WebP untuk efisiensi penyimpanan & bandwidth
   */
  async saveBase64Image(
    base64Str: string,
    folder?: 'thumbnails' | 'profiles' | 'journals' | string,
  ): Promise<string> {
    const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid input string');
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${uuidv4()}-${Date.now()}.webp`;

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

    try {
      // Optimasi kompresi WebP dengan mempertahankan kualitas visual tinggi & ukuran file ringan
      await sharp(buffer)
        .rotate() // Menyesuaikan orientasi EXIF
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(filePath);
    } catch (sharpError) {
      // Fallback jika sharp gagal memproses format tertentu
      this.logger.warn(`Sharp conversion fallback: ${sharpError}`);
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
      await sharp(buffer)
        .rotate()
        .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(filePath);
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
