import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== MEMULAI MIGRASI VEKTOR NUMPY KE POSTGRESQL ===');
  
  const jsonPath = path.join(__dirname, 'temp_vectors.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('File temp_vectors.json tidak ditemukan.');
    return;
  }
  const vectorMap = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const uids = Object.keys(vectorMap);
  console.log(`Ditemukan ${uids.length} vektor pengguna dari cache lokal npz.`);

  let successCount = 0;
  for (const uid of uids) {
    const embedding = vectorMap[uid];
    try {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, name: true, role: true },
      });

      if (!user) {
        console.log(`[SKIP] User ID ${uid} tidak ada di database User.`);
        continue;
      }

      await prisma.userFaceBiometric.upsert({
        where: { userId: uid },
        create: {
          userId: uid,
          embedding,
          vectorDimension: embedding.length,
          modelName: 'Inception-ResNet-v1 (Bio-Fusion AI)',
          isActive: true,
        },
        update: {
          embedding,
          vectorDimension: embedding.length,
          modelName: 'Inception-ResNet-v1 (Bio-Fusion AI)',
          isActive: true,
          updatedAt: new Date(),
        },
      });

      successCount++;
      console.log(`[OK] Vektor 512-D tersimpan utuh di PostgreSQL: ${user.name} (${user.role})`);
    } catch (e: any) {
      console.error(`[ERR] Gagal menyimpan vektor untuk user ${uid}:`, e.message);
    }
  }

  console.log(`\n=== RINGKASAN MIGRASI VEKTOR KE POSTGRESQL ===`);
  console.log(`Vektor Berhasil Disimpan ke PostgreSQL: ${successCount}`);

  const totalVectorsInDb = await prisma.userFaceBiometric.count({
    where: { embedding: { isEmpty: false } },
  });
  console.log(`Total Vektor Aktif di PostgreSQL      : ${totalVectorsInDb}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
