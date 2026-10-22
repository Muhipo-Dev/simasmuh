import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const STORAGE_ROOT = 'D:/simasmuh/storage';

async function main() {
  console.log('=== MEMULAI MIGRASI FOTO & VEKTOR KE POSTGRESQL ===');
  console.log('Target Database:', connectionString);

  // 1. Ambil seluruh pengguna yang memiliki avatarUrl
  const users = await prisma.user.findMany({
    where: {
      avatarUrl: { not: null },
    },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      faceBiometric: true,
    },
  });

  console.log(`Ditemukan ${users.length} pengguna dengan avatarUrl terdaftar.`);

  let migratedPhotoCount = 0;
  let alreadyHasPhotoCount = 0;
  let notFoundDiskCount = 0;

  for (const user of users) {
    if (!user.avatarUrl || user.avatarUrl.trim() === '') continue;

    // Cek apakah foto profil sudah tersimpan di UserFaceBiometric
    if (user.faceBiometric?.photoDataUrl) {
      alreadyHasPhotoCount++;
      continue;
    }

    const cleanRel = user.avatarUrl.replace(/^\/uploads\//, '').replace(/^[\\\/]/, '');
    const possiblePaths = [
      path.join(STORAGE_ROOT, cleanRel),
      path.join(STORAGE_ROOT, 'profiles', cleanRel),
      path.join(STORAGE_ROOT, 'students', cleanRel),
      path.join(STORAGE_ROOT, path.basename(cleanRel)),
      path.join(STORAGE_ROOT, 'profiles', path.basename(cleanRel)),
      path.join(STORAGE_ROOT, 'students', path.basename(cleanRel)),
      path.join(__dirname, '../../storage', cleanRel),
      path.join(__dirname, '../../storage/profiles', cleanRel),
    ];

    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      notFoundDiskCount++;
      continue;
    }

    try {
      const rawBuffer = fs.readFileSync(foundPath);
      // Kompresi optimal ke 320x320 JPEG
      let compressedBuffer: Buffer;
      try {
        compressedBuffer = await sharp(rawBuffer)
          .resize(320, 320, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
      } catch {
        compressedBuffer = rawBuffer;
      }

      const photoDataUrl = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

      // Periksa apakah user memiliki rekaman 5 arah di face_samples/<userId>/
      const sampleAngles = ['front', 'right', 'left', 'up', 'down', 'blink', 'mouth_open'];
      const sampleDir = path.join(STORAGE_ROOT, 'face_samples', user.id);
      const samplePhotos: Record<string, string> = {};

      if (fs.existsSync(sampleDir)) {
        for (const angle of sampleAngles) {
          const sampleFile = path.join(sampleDir, `${angle}.jpg`);
          if (fs.existsSync(sampleFile)) {
            try {
              const sBuf = fs.readFileSync(sampleFile);
              samplePhotos[angle] = `data:image/jpeg;base64,${sBuf.toString('base64')}`;
            } catch {}
          }
        }
      }

      await prisma.userFaceBiometric.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          photoDataUrl,
          samplePhotos: Object.keys(samplePhotos).length > 0 ? samplePhotos : undefined,
          sampleCount: Object.keys(samplePhotos).length,
          modelName: 'Inception-ResNet-v1 (Bio-Fusion AI)',
          embedding: [],
          vectorDimension: 512,
        },
        update: {
          photoDataUrl,
          samplePhotos: Object.keys(samplePhotos).length > 0 ? samplePhotos : undefined,
          sampleCount: Object.keys(samplePhotos).length,
          updatedAt: new Date(),
        },
      });

      migratedPhotoCount++;
      console.log(`[OK] Foto dimigrasikan ke PostgreSQL: ${user.name} (${user.role})`);
    } catch (err: any) {
      console.error(`[ERR] Gagal migrasi foto ${user.name}:`, err.message);
    }
  }

  console.log(`\n=== RINGKASAN MIGRASI FOTO KE POSTGRESQL ===`);
  console.log(`Foto Berhasil Dimigrasikan : ${migratedPhotoCount}`);
  console.log(`Foto Sudah Ada di Database : ${alreadyHasPhotoCount}`);
  console.log(`File Tidak Ditemukan di Disk: ${notFoundDiskCount}`);

  const totalInDb = await prisma.userFaceBiometric.count();
  const totalWithPhotos = await prisma.userFaceBiometric.count({
    where: { photoDataUrl: { not: null } },
  });
  console.log(`Total Record UserFaceBiometric : ${totalInDb}`);
  console.log(`Total Foto Utuh di PostgreSQL  : ${totalWithPhotos}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
