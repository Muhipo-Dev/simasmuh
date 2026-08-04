import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔄 Restoring primary accounts (nailar, superadmin, guru, manchu, agung) to Supabase...');

  const nailarPassword = await bcrypt.hash('password123', 10);
  const superadminPassword = await bcrypt.hash('admin123', 10);
  const guruPassword = await bcrypt.hash('guru123', 10);
  const manchuPassword = await bcrypt.hash('manchu', 10);
  const agungPassword = await bcrypt.hash('agung', 10);

  // 1. Nailar (SUPERADMIN)
  const nailar = await prisma.user.upsert({
    where: { username: 'nailar' },
    update: {
      name: 'Nailar',
      role: 'SUPERADMIN',
      password: nailarPassword,
      email: 'nailar@sekolah.com',
    },
    create: {
      username: 'nailar',
      email: 'nailar@sekolah.com',
      name: 'Nailar',
      password: nailarPassword,
      role: 'SUPERADMIN',
    },
  });
  console.log('✅ Akun nailar dikembalikan sebagai SUPERADMIN:', nailar.username);

  // 2. Superadmin (ADMIN_IT / SUPERADMIN)
  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      name: 'Super Admin',
      role: 'ADMIN_IT',
      password: superadminPassword,
      email: 'superadmin@sekolah.com',
    },
    create: {
      username: 'superadmin',
      email: 'superadmin@sekolah.com',
      name: 'Super Admin',
      password: superadminPassword,
      role: 'ADMIN_IT',
    },
  });
  console.log('✅ Akun superadmin dikembalikan:', superadmin.username);

  // 3. Guru Wali
  const guru = await prisma.user.upsert({
    where: { username: 'guru' },
    update: {
      name: 'Guru Wali',
      role: 'GURU',
      password: guruPassword,
      email: 'guru@sekolah.com',
    },
    create: {
      username: 'guru',
      email: 'guru@sekolah.com',
      name: 'Guru Wali',
      password: guruPassword,
      role: 'GURU',
      teacherProfile: {
        create: {
          nip: '198001012005011001',
          phone: '081234567890',
        },
      },
    },
  });
  console.log('✅ Akun guru dikembalikan:', guru.username);

  // 4. Manchu (Niam M.Kom)
  const manchu = await prisma.user.upsert({
    where: { username: 'manchu' },
    update: {
      name: 'Niam M.Kom',
      role: 'GURU',
      password: manchuPassword,
      email: 'manchuart@gmail.com',
    },
    create: {
      username: 'manchu',
      email: 'manchuart@gmail.com',
      name: 'Niam M.Kom',
      password: manchuPassword,
      role: 'GURU',
      teacherProfile: {
        create: {
          nip: '198203032008011003',
          phone: '081333444555',
        },
      },
    },
  });
  console.log('✅ Akun manchu dikembalikan:', manchu.username);

  // 5. Agung (Keuangan)
  const agung = await prisma.user.upsert({
    where: { username: 'agung' },
    update: {
      name: 'Agung (Keuangan)',
      role: 'GURU',
      subRole: 'KEUANGAN',
      password: agungPassword,
      email: 'agung@sekolah.com',
    },
    create: {
      username: 'agung',
      email: 'agung@sekolah.com',
      name: 'Agung (Keuangan)',
      password: agungPassword,
      role: 'GURU',
      subRole: 'KEUANGAN',
      teacherProfile: {
        create: {
          nip: '198505052010011002',
          phone: '081987654321',
        },
      },
    },
  });
  console.log('✅ Akun agung dikembalikan:', agung.username);

  console.log('🎉 Restorasi akun utama berhasil!');
}

main()
  .catch((e) => {
    console.error('❌ gagal restorasi akun:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
