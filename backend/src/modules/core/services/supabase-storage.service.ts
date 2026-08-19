import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { STORAGE_DIRS } from '../config/storage.config';

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  private readonly serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  async onModuleInit() {
    await this.ensureBucketExists('system-logs', false);
  }

  /**
   * Memastikan bucket di Supabase Storage tersedia
   */
  async ensureBucketExists(bucketName: string, isPublic: boolean = false): Promise<boolean> {
    try {
      const checkRes = await fetch(`${this.supabaseUrl}/storage/v1/bucket/${bucketName}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
        },
      });

      if (checkRes.ok) {
        return true;
      }

      // Jika belum ada, buat bucket baru
      const createRes = await fetch(`${this.supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
        },
        body: JSON.stringify({
          id: bucketName,
          name: bucketName,
          public: isPublic,
          file_size_limit: 52428800, // 50MB
        }),
      });

      if (createRes.ok) {
        this.logger.log(`✅ Supabase Storage bucket '${bucketName}' created successfully.`);
        return true;
      } else {
        const errText = await createRes.text();
        this.logger.warn(`Failed to create bucket '${bucketName}': ${errText}`);
        return false;
      }
    } catch (error: any) {
      this.logger.warn(`Supabase Storage check/create error (${bucketName}): ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Upload berkas buffer terkompresi langsung ke Supabase Storage
   */
  async uploadCompressedBuffer(
    bucketName: string,
    storageFilePath: string,
    buffer: Buffer,
    contentType: string = 'application/gzip',
  ): Promise<{ success: boolean; url: string; error?: string }> {
    try {
      await this.ensureBucketExists(bucketName);

      // Normalisasi path
      const cleanPath = storageFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${bucketName}/${cleanPath}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
          'x-upsert': 'true',
        },
        body: buffer as any,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase Storage upload failed (${res.status}): ${errText}`);
      }

      // Juga simpan salinan lokal terkompresi di STORAGE_DIRS untuk redundancy offline
      const localBackupDir = path.join(STORAGE_DIRS.root, 'compressed-logs', path.dirname(cleanPath));
      if (!fs.existsSync(localBackupDir)) {
        fs.mkdirSync(localBackupDir, { recursive: true });
      }
      fs.writeFileSync(path.join(STORAGE_DIRS.root, 'compressed-logs', cleanPath), buffer);

      const downloadUrl = `${this.supabaseUrl}/storage/v1/object/authenticated/${bucketName}/${cleanPath}`;
      return {
        success: true,
        url: downloadUrl,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload to Supabase storage: ${error?.message || error}`);
      return {
        success: false,
        url: '',
        error: error?.message || String(error),
      };
    }
  }

  /**
   * Mengunduh buffer terkompresi dari Supabase Storage
   */
  async downloadBuffer(bucketName: string, storageFilePath: string): Promise<Buffer | null> {
    try {
      const cleanPath = storageFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const downloadUrl = `${this.supabaseUrl}/storage/v1/object/authenticated/${bucketName}/${cleanPath}`;

      const res = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
        },
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }

      // Fallback ke local backup jika ada
      const localPath = path.join(STORAGE_DIRS.root, 'compressed-logs', cleanPath);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Failed to download from Supabase storage: ${error?.message || error}`);
      // Fallback lokal
      const cleanPath = storageFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const localPath = path.join(STORAGE_DIRS.root, 'compressed-logs', cleanPath);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      return null;
    }
  }

  /**
   * List file di bucket Supabase
   */
  async listFiles(bucketName: string, prefix: string = ''): Promise<any[]> {
    try {
      const res = await fetch(`${this.supabaseUrl}/storage/v1/object/list/${bucketName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.serviceKey}`,
          apikey: this.serviceKey,
        },
        body: JSON.stringify({
          prefix: prefix.replace(/\\/g, '/'),
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      });

      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (error: any) {
      this.logger.warn(`Failed to list Supabase storage files: ${error?.message || error}`);
      return [];
    }
  }
}
