import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.user.count();
  console.log('✅ Koneksi DB Supabase Lokal BERHASIL');
  console.log('📊 Total users:', count);

  const settings = await prisma.setting.findFirst();
  console.log('🏫 Sekolah:', settings?.schoolName || '(belum ada setting)');
}

main()
  .catch((e) => console.error('❌ Gagal:', e.message))
  .finally(() => prisma.$disconnect());
