import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

export interface CompressionResult {
  compressedBuffer: Buffer;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number; // e.g. 92.4%
  savedBytes: number;
  algorithm: 'GZIP_LEVEL_9' | 'BROTLI_MAX';
  checksumSha256: string;
}

@Injectable()
export class LogCompressionService {
  private readonly logger = new Logger(LogCompressionService.name);

  /**
   * Mengompresi data string atau JSON payload ke format Gzip level 9 (terkompresi maksimal dan sekecil-kecilnya)
   */
  compressGzip(data: string | Buffer | object): CompressionResult {
    let inputBuffer: Buffer;

    if (typeof data === 'string') {
      inputBuffer = Buffer.from(data, 'utf-8');
    } else if (Buffer.isBuffer(data)) {
      inputBuffer = data;
    } else {
      // Minified JSON string (tanpa whitespace tidak perlu agar sekecil mungkin)
      inputBuffer = Buffer.from(JSON.stringify(data), 'utf-8');
    }

    const originalSizeBytes = inputBuffer.length;

    // Gzip dengan level kompresi 9 (maksimum) dan memLevel 9
    const compressedBuffer = zlib.gzipSync(inputBuffer, {
      level: 9,
      memLevel: 9,
      strategy: zlib.constants.Z_DEFAULT_STRATEGY,
    });

    const compressedSizeBytes = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
    const compressionRatioPercent =
      originalSizeBytes > 0
        ? parseFloat((((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100).toFixed(2))
        : 0;

    const checksumSha256 = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

    return {
      compressedBuffer,
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
      savedBytes,
      algorithm: 'GZIP_LEVEL_9',
      checksumSha256,
    };
  }

  /**
   * Mengompresi data dengan Brotli kualitas maksimal
   */
  compressBrotli(data: string | Buffer | object): CompressionResult {
    let inputBuffer: Buffer;

    if (typeof data === 'string') {
      inputBuffer = Buffer.from(data, 'utf-8');
    } else if (Buffer.isBuffer(data)) {
      inputBuffer = data;
    } else {
      inputBuffer = Buffer.from(JSON.stringify(data), 'utf-8');
    }

    const originalSizeBytes = inputBuffer.length;

    const compressedBuffer = zlib.brotliCompressSync(inputBuffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY, // Level 11
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: originalSizeBytes,
      },
    });

    const compressedSizeBytes = compressedBuffer.length;
    const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
    const compressionRatioPercent =
      originalSizeBytes > 0
        ? parseFloat((((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100).toFixed(2))
        : 0;

    const checksumSha256 = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

    return {
      compressedBuffer,
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
      savedBytes,
      algorithm: 'BROTLI_MAX',
      checksumSha256,
    };
  }

  /**
   * Mendekompresi buffer Gzip kembali menjadi string teks/JSON
   */
  decompressGzip(compressedBuffer: Buffer): string {
    try {
      const decompressed = zlib.gunzipSync(compressedBuffer);
      return decompressed.toString('utf-8');
    } catch (error: any) {
      this.logger.error(`Failed to decompress Gzip buffer: ${error?.message || error}`);
      throw new Error(`Decompression error: ${error?.message || error}`);
    }
  }

  /**
   * Mendekompresi buffer Brotli kembali menjadi string teks/JSON
   */
  decompressBrotli(compressedBuffer: Buffer): string {
    try {
      const decompressed = zlib.brotliDecompressSync(compressedBuffer);
      return decompressed.toString('utf-8');
    } catch (error: any) {
      this.logger.error(`Failed to decompress Brotli buffer: ${error?.message || error}`);
      throw new Error(`Decompression error: ${error?.message || error}`);
    }
  }

  /**
   * Membantu format ukuran bytes ke string terbaca manusia (B, KB, MB)
   */
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
