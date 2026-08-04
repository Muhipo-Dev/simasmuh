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
  console.log('🌱 Starting Supabase database seeding...');

  // 1. Password Hashes
  const superadminPassword = await bcrypt.hash('admin123', 10);
  const nailarPassword = await bcrypt.hash('password123', 10);
  const guruPassword = await bcrypt.hash('guru123', 10);
  const agungPassword = await bcrypt.hash('agung', 10);
  const siswaPassword = await bcrypt.hash('123', 10);

  // 2. Class
  let defaultClass = await prisma.class.findFirst({ where: { name: 'X-1' } });
  if (!defaultClass) {
    defaultClass = await prisma.class.create({
      data: {
        name: 'X-1',
        gradeLevel: 10,
        academicYear: '2025/2026',
      },
    });
    console.log('✅ Created Class X-1');
  }

  // 3. Super Admin Users
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password: superadminPassword },
    create: {
      username: 'superadmin',
      email: 'superadmin@sekolah.com',
      name: 'Super Admin',
      password: superadminPassword,
      role: 'ADMIN_IT',
    },
  });
  console.log('✅ Superadmin user ready:', superAdmin.username);

  const nailarUser = await prisma.user.upsert({
    where: { username: 'nailar' },
    update: { password: nailarPassword },
    create: {
      username: 'nailar',
      email: 'nailar@sekolah.com',
      name: 'Nailar',
      password: nailarPassword,
      role: 'SUPERADMIN',
    },
  });
  console.log('✅ User nailar ready:', nailarUser.username);

  // 4. Guru Users & Profiles
  const guruUser = await prisma.user.upsert({
    where: { username: 'guru' },
    update: { password: guruPassword },
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
  console.log('✅ Guru user ready:', guruUser.username);

  const agungUser = await prisma.user.upsert({
    where: { username: 'agung' },
    update: { password: agungPassword, role: 'GURU', subRole: 'KEUANGAN' },
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
  console.log('✅ Agung (Keuangan) user ready:', agungUser.username);

  // 5. Siswa User & Student Record
  let siswaUser = await prisma.user.findUnique({ where: { username: '123' } });
  if (!siswaUser) {
    siswaUser = await prisma.user.create({
      data: {
        username: '123',
        email: 'siswa123@sekolah.com',
        name: 'Muhipo Dev',
        password: siswaPassword,
        role: 'SISWA',
        nipNbm: '123',
        student: {
          create: {
            nis: '123',
            nisn: '12345678',
            name: 'Muhipo Dev',
            gender: 'L',
            classId: defaultClass.id,
            program: 'REGULER',
          },
        },
      },
    });
    console.log('✅ Siswa user 123 ready');
  }

  // 6. Subjects
  const subjects = [
    { code: 'MTK-101', name: 'Matematika' },
    { code: 'BIO-101', name: 'Biologi' },
    { code: 'BIN-101', name: 'Bahasa Indonesia' },
    { code: 'ENG-101', name: 'Bahasa Inggris' },
    { code: 'AIK-101', name: 'Al-Islam dan Kemuhammadiyahan' },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
  }
  console.log('✅ Subjects ready');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
