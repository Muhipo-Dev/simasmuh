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

  // Windows Environment: Di dalam root repositori aplikasi D:\simasmuh\storage
  if (process.platform === 'win32') {
    try {
      // Prioritaskan folder storage di dalam root aplikasi (D:\simasmuh\storage)
      const projectAppStorage = path.resolve(process.cwd(), '..', 'storage');
      if (fs.existsSync(projectAppStorage)) {
        return projectAppStorage;
      }
      const directAppStorage = path.resolve(process.cwd(), 'storage');
      if (fs.existsSync(directAppStorage)) {
        return directAppStorage;
      }
      return projectAppStorage;
    } catch {
      return path.resolve(process.cwd(), 'storage');
    }
  }

  // Linux (Debian / Ubuntu / Docker / Cloud)
  return path.resolve(process.cwd(), '..', 'storage');
}

export const STORAGE_ROOT = resolveStorageRoot();

export const STORAGE_DIRS = {
  root: STORAGE_ROOT,
  carousel: path.join(STORAGE_ROOT, 'carousel'),
  thumbnails: path.join(STORAGE_ROOT, 'thumbnails'),
  profiles: path.join(STORAGE_ROOT, 'profiles'),
  students: path.join(STORAGE_ROOT, 'students'),
  paymentProofs: path.join(STORAGE_ROOT, 'payment-proofs'),
  journals: path.join(STORAGE_ROOT, 'journals'),
  sdm_docs: path.join(STORAGE_ROOT, 'sdm_docs'),
  supervisi: path.join(STORAGE_ROOT, 'supervisi'),
  suratMasuk: path.join(STORAGE_ROOT, 'surat-masuk'),
  suratKeluar: path.join(STORAGE_ROOT, 'surat-keluar'),
  notulensi: path.join(STORAGE_ROOT, 'notulensi'),
  arsip: path.join(STORAGE_ROOT, 'arsip'),
  ijazah: path.join(STORAGE_ROOT, 'ijazah'),
  backups: path.join(STORAGE_ROOT, 'backups'),
  temp: path.join(STORAGE_ROOT, 'temp'),
  quarantine: path.join(STORAGE_ROOT, 'quarantine'),
  faceSamples: path.join(STORAGE_ROOT, 'face_samples'),
  logos: path.join(STORAGE_ROOT, 'logos'),
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
    console.error(
      'Failed to initialize storage directories:',
      err?.message || err,
    );
  }
}

// Inisialisasi otomatis saat modul dimuat
initStorageDirectories();
