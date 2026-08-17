import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_DIRS, STORAGE_ROOT } from '../config/storage.config';

@Injectable()
export class UploadService {
  async saveBase64Image(base64Str: string, folder?: 'thumbnails' | 'profiles' | 'journals' | string): Promise<string> {
    const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid input string');
    }

    const type = matches[1];
    let extension = 'jpg';
    if (type === 'image/jpeg') extension = 'jpg';
    if (type === 'image/png') extension = 'png';
    if (type === 'image/webp') extension = 'webp';

    const buffer = Buffer.from(matches[2], 'base64');
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
    await fs.promises.writeFile(filePath, buffer);

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

    const type = matches[1];
    let extension = 'jpg';
    if (type === 'image/jpeg') extension = 'jpg';
    if (type === 'image/png') extension = 'png';
    if (type === 'image/webp') extension = 'webp';

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `banner-${Date.now()}.${extension}`;
    const uploadPath = STORAGE_DIRS.carousel;

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, filename);
    await fs.promises.writeFile(filePath, buffer);

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
    const filePath = path.join(
      STORAGE_DIRS.carousel,
      safeFilename,
    );

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}
