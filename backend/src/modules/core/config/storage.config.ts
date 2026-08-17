import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * SIMASMUH External Storage Architecture
 * Lokasi penyimpanan berkas foto & konten terisolasi di luar repositori proyek.
 * Mendukung multi-platform: Windows, Ubuntu, Debian, dan environment server lainnya.
 */
function resolveStorageRoot(): string {
  if (process.env.STORAGE_PATH && process.env.STORAGE_PATH.trim() !== '') {
    return path.resolve(process.env.STORAGE_PATH.trim());
  }

  // Windows Environment
  if (process.platform === 'win32') {
    try {
      const driveRoot = path.parse(process.cwd()).root; // e.g. "D:\" atau "C:\"
      return path.join(driveRoot, 'simasmuh_storage');
    } catch {
      return path.resolve(process.cwd(), '..', '..', 'simasmuh_storage');
    }
  }

  // Linux (Debian / Ubuntu / Docker / Cloud)
  return path.join(os.homedir(), 'simasmuh_storage');
}

export const STORAGE_ROOT = resolveStorageRoot();

export const STORAGE_DIRS = {
  root: STORAGE_ROOT,
  carousel: path.join(STORAGE_ROOT, 'carousel'),
  thumbnails: path.join(STORAGE_ROOT, 'thumbnails'),
  profiles: path.join(STORAGE_ROOT, 'profiles'),
  paymentProofs: path.join(STORAGE_ROOT, 'payment-proofs'),
  journals: path.join(STORAGE_ROOT, 'journals'),
  temp: path.join(STORAGE_ROOT, 'temp'),
  quarantine: path.join(STORAGE_ROOT, 'quarantine'),
};

/**
 * Inisialisasi struktur direktori storage eksternal
 */
export function initStorageDirectories(): void {
  try {
    Object.values(STORAGE_DIRS).forEach((dirPath) => {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  } catch (err: any) {
    console.error('Failed to initialize storage directories:', err?.message || err);
  }
}

// Inisialisasi otomatis saat modul dimuat
initStorageDirectories();
