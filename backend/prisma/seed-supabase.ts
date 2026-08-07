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
  // 7. Seed ProgramConfigs
  const DEFAULT_PROGRAMS = [
    { code: 'kader', name: 'Kader', defaultSpp: 300000, defaultDiscount: 100, description: 'Program Beasiswa Kader' },
    { code: 'reguler', name: 'Reguler', defaultSpp: 300000, defaultDiscount: 0, description: 'Program Siswa Reguler' },
    { code: 'tahfidz', name: 'Tahfidz', defaultSpp: 360000, defaultDiscount: 0, description: 'Program Hifdzil Qur\'an' },
    { code: 'olahraga', name: 'Olahraga', defaultSpp: 330000, defaultDiscount: 0, description: 'Program Bakat Olahraga' },
    { code: 'MIC', name: 'Muhipo Internasional', defaultSpp: 600000, defaultDiscount: 0, description: 'Program Class Internasional' },
    { code: 'enterpreneur', name: 'Entrepreneur', defaultSpp: 390000, defaultDiscount: 0, description: 'Program Kewirausahaan' },
    { code: 'seni budaya', name: 'Seni Budaya', defaultSpp: 330000, defaultDiscount: 0, description: 'Program Seni & Kesenian' },
    { code: 'soshum saintek', name: 'Soshum Saintek', defaultSpp: 450000, defaultDiscount: 0, description: 'Program Bimbingan Soshum & Saintek' },
    { code: 'inklusi', name: 'Inklusi', defaultSpp: 240000, defaultDiscount: 0, description: 'Program Pendampingan Inklusi' },
  ];

  for (const prog of DEFAULT_PROGRAMS) {
    await prisma.programConfig.upsert({
      where: { code: prog.code },
      update: {
        name: prog.name,
        defaultSpp: prog.defaultSpp,
        defaultDiscount: prog.defaultDiscount,
        description: prog.description,
      },
      create: prog,
    });
  }
  // 8. Seed Default Settings
  const existingSetting = await prisma.setting.findFirst();
  if (!existingSetting) {
    await prisma.setting.create({
      data: {
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
        address: 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur',
        phone: '(0352) 481428',
        email: 'info@smamuh1ponorogo.sch.id',
        principalName: 'Drs. H. Sugeng, M.Pd.',
        academicYear: '2026/2027',
        semester: 'Ganjil',
        bankName: 'Bank Syariah Indonesia (BSI)',
        bankNumber: '7123456789',
        bankOwner: 'SMA MUHAMMADIYAH 1 PONOROGO',
        defaultDpp: 1500000,
        defaultUka: 500000,
        defaultUks: 100000,
      },
    });
  } else {
    await prisma.setting.update({
      where: { id: existingSetting.id },
      data: {
        schoolName: existingSetting.schoolName === 'Nama Sekolah' ? 'SMA Muhammadiyah 1 Ponorogo' : existingSetting.schoolName,
        address: existingSetting.address === 'Alamat Sekolah' ? 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur' : existingSetting.address,
        academicYear: existingSetting.academicYear || '2026/2027',
        semester: existingSetting.semester || 'Ganjil',
        defaultDpp: existingSetting.defaultDpp || 1500000,
        defaultUka: existingSetting.defaultUka || 500000,
        defaultUks: existingSetting.defaultUks || 100000,
      },
    });
  }
  console.log('✅ Settings synced');

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
