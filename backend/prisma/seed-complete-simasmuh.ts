import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const firstNamesMale = [
  'Ahmad', 'Muhammad', 'Rizky', 'Fajar', 'Bagus', 'Aditya', 'Dimas', 'Bagas',
  'Bayu', 'Gilang', 'Daffa', 'Farhan', 'Hafiz', 'Irfan', 'Kevin', 'Lutfi',
  'Naufal', 'Rafi', 'Rehan', 'Satria', 'Tri', 'Wahyu', 'Yusuf', 'Zack'
];

const firstNamesFemale = [
  'Aisyah', 'Anisa', 'Aulia', 'Bella', 'Citra', 'Dina', 'Eka', 'Fitri',
  'Gita', 'Indah', 'Intan', 'Laras', 'Nabila', 'Nur', 'Putri', 'Rani',
  'Rina', 'Siti', 'Suci', 'Tania', 'Utami', 'Wulan', 'Yulia', 'Zahra'
];

const lastNames = [
  'Pratama', 'Saputra', 'Wibowo', 'Kusuma', 'Hidayat', 'Ramadhan', 'Nugroho',
  'Santoso', 'Setiawan', 'Firmansyah', 'Kurniawan', 'Laksana', 'Pangestu',
  'Subagyo', 'Utomo', 'Wicaksono', 'Ardianto', 'Budiarto', 'Fauzi', 'Hakim'
];

const programList = [
  'reguler',
  'kader',
  'tahfidz',
  'olahraga',
  'MIC',
  'enterpreneur',
  'seni budaya',
  'soshum saintek',
  'inklusi',
];

const sppBaseRate = 150000;
const programMultipliers: Record<string, number> = {
  kader: 1.0,
  reguler: 1.0,
  tahfidz: 1.2,
  olahraga: 1.1,
  MIC: 2.0,
  enterpreneur: 1.3,
  'seni budaya': 1.1,
  'soshum saintek': 1.5,
  inklusi: 0.8,
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🚀 Starting Complete SIMASMUH Synchronization (33 Classes, Teachers/Staff, 500 Students + Program Labeling & Finance)...');

  const defaultPasswordHash = await bcrypt.hash('123', 10);
  const guruPasswordHash = await bcrypt.hash('guru123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  // 1. Generate 33 Classes
  console.log('🏫 Generating 33 Classes...');
  const classList: { name: string; gradeLevel: number }[] = [];
  
  for (let g = 10; g <= 12; g++) {
    const prefix = g === 10 ? 'X' : g === 11 ? 'XI' : 'XII';
    for (let c = 1; c <= 11; c++) {
      classList.push({ name: `${prefix}-${c}`, gradeLevel: g });
    }
  }

  const createdClasses: any[] = [];
  for (const item of classList) {
    let cls = await prisma.class.findFirst({ where: { name: item.name } });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: item.name,
          gradeLevel: item.gradeLevel,
          academicYear: '2025/2026',
        },
      });
    }
    createdClasses.push(cls);
  }
  console.log(`✅ ${createdClasses.length} Classes created/synchronized.`);

  // 2. Generate Staff & Teachers (Wali Kelas for each class + Admin/Staff)
  console.log('👨‍🏫 Generating Teachers & Staff...');
  
  // Superadmin User
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password: adminPasswordHash },
    create: {
      username: 'superadmin',
      email: 'superadmin@sekolah.com',
      name: 'Super Admin IT',
      password: adminPasswordHash,
      role: 'ADMIN_IT',
    },
  });

  // Agung (Bendahara Keuangan)
  await prisma.user.upsert({
    where: { username: 'agung' },
    update: { password: await bcrypt.hash('agung', 10), role: 'GURU', subRole: 'KEUANGAN' },
    create: {
      username: 'agung',
      email: 'agung@sekolah.com',
      name: 'Agung (Bendahara Keuangan)',
      password: await bcrypt.hash('agung', 10),
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

  // 33 Homeroom Teachers
  for (let i = 0; i < createdClasses.length; i++) {
    const cls = createdClasses[i];
    const username = `wali_${cls.name.toLowerCase().replace('-', '_')}`;
    const teacherName = `Guru Wali ${cls.name}`;
    const nip = `1980${String(i + 1).padStart(4, '0')}2005011${String(i + 1).padStart(3, '0')}`;

    let teacherUser = await prisma.user.findUnique({
      where: { username },
      include: { teacherProfile: true },
    });

    if (!teacherUser) {
      teacherUser = await prisma.user.create({
        data: {
          username,
          email: `${username}@sekolah.id`,
          name: teacherName,
          password: guruPasswordHash,
          role: 'GURU',
          subRole: 'WALI_KELAS',
          nipNbm: nip,
          teacherProfile: {
            create: {
              nip,
              phone: `08123456${String(i + 1).padStart(4, '0')}`,
            },
          },
        },
        include: { teacherProfile: true },
      });
    }

    // Link homeroom teacher to class if profile exists
    if (teacherUser.teacherProfile) {
      await prisma.class.update({
        where: { id: cls.id },
        data: { homeroomTeacherId: teacherUser.teacherProfile.id },
      });
    }
  }
  console.log('✅ 33 Homeroom Teachers created and linked to Classes.');

  // 3. Generate & Label 500 Students across 33 Classes
  console.log('🎓 Generating & Labeling 500 Students across 33 Classes...');
  const createdStudents: any[] = [];
  
  for (let i = 1; i <= 500; i++) {
    const isMale = i % 2 === 0;
    const gender = isMale ? 'L' : 'P';
    const firstName = isMale ? getRandomItem(firstNamesMale) : getRandomItem(firstNamesFemale);
    const lastName = getRandomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    const nis = `${20261000 + i}`;
    const nisn = `0081${String(i).padStart(6, '0')}`;
    const targetClass = createdClasses[(i - 1) % createdClasses.length]; // Evenly distributed across 33 classes
    const program = programList[(i - 1) % programList.length]; // Evenly distributed program labels
    const username = nis;

    let student = await prisma.student.findUnique({ where: { nis } });
    if (!student) {
      const user = await prisma.user.create({
        data: {
          username,
          email: `${nis}@siswa.sekolah.id`,
          name: fullName,
          password: defaultPasswordHash,
          role: 'SISWA',
          nipNbm: nis,
          student: {
            create: {
              nis,
              nisn,
              name: fullName,
              gender,
              classId: targetClass.id,
              program,
            },
          },
        },
        include: { student: true },
      });
      student = user.student;
    } else {
      // Ensure program is updated for existing students
      student = await prisma.student.update({
        where: { id: student.id },
        data: { program, classId: targetClass.id },
      });
    }
    if (student) {
      createdStudents.push(student);
    }
  }
  console.log(`✅ ${createdStudents.length} Students registered & labeled with programs.`);

  // 4. Generate Financial Tagihan (SPP & DPP) using program rate calculation
  console.log('💰 Generating Financial Bills (Tagihan SPP & DPP)...');
  let tagihanCount = 0;

  for (let i = 0; i < createdStudents.length; i++) {
    const std = createdStudents[i];
    const prog = std.program || 'reguler';
    const multiplier = programMultipliers[prog] || 1.0;
    const sppAmount = Math.round(sppBaseRate * multiplier);
    const dppAmount = std.classId ? 2500000 : 3000000;

    // Check if SPP tagihan exists for August 2026
    const existingSpp = await prisma.tagihan.findFirst({
      where: { studentId: std.id, type: 'SPP', month: 8, year: 2026 },
    });

    if (!existingSpp) {
      const isPaid = i % 3 === 0; // ~33% paid for demo financial summary
      await prisma.tagihan.create({
        data: {
          studentId: std.id,
          type: 'SPP',
          amount: sppAmount,
          month: 8,
          year: 2026,
          status: isPaid ? 'LUNAS' : 'BELUM_LUNAS',
          notes: `SPP Bulan Agustus 2026 - Program ${prog.toUpperCase()}`,
        },
      });
      tagihanCount++;
    }

    // Check if DPP tagihan exists
    const existingDpp = await prisma.tagihan.findFirst({
      where: { studentId: std.id, type: 'DPP' },
    });

    if (!existingDpp) {
      const isPaid = i % 4 === 0;
      await prisma.tagihan.create({
        data: {
          studentId: std.id,
          type: 'DPP',
          amount: dppAmount,
          month: 7,
          year: 2026,
          status: isPaid ? 'LUNAS' : 'BELUM_LUNAS',
          notes: `DPP (Dana Pengembangan Pendidikan) - Program ${prog.toUpperCase()}`,
        },
      });
      tagihanCount++;
    }
  }

  console.log(`✅ Generated ${tagihanCount} financial bills.`);

  // 5. Generate Announcements / Berita & Informasi Sekolah
  console.log('📢 Generating Announcements (Berita & Informasi)...');
  const superadminUser = await prisma.user.findFirst({ where: { username: 'superadmin' } });
  if (superadminUser) {
    const announcements = [
      {
        title: 'Pendaftaran Peserta Didik Baru (PPDB) SMA MUHIPO TA 2026/2027 Resmi Dibuka',
        content: 'SMA Muhammadiyah 1 Ponorogo (MUHIPO) resmi membuka Pendaftaran Peserta Didik Baru (PPDB) untuk Tahun Ajaran 2026/2027. Sekolah menawarkan berbagai program unggulan unggulan seperti Tahfidz Al-Qur\'an, Muhipo International Class (MIC), Kelas Olahraga, Seni Budaya, dan Entrepreneurship. Pendaftaran dapat dilakukan secara online melalui portal siakad resmi atau datang langsung ke sekretariat PPDB.',
        target: 'SEMUA',
        type: 'BERITA',
        image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
      },
      {
        title: 'Prestasi Gemilang! Tim Seni & Robottik SMA MUHIPO Raih Juara Nasional 2026',
        content: 'Keluarga Besar SMA MUHIPO mengucapkan selamat atas pencapaian luar biasa tim siswa dalam Kompetisi Teknologi & Seni Muhammadiyah Tingkat Nasional 2026. Prestasi ini membuktikan keunggulan pembinaan minat dan bakat siswa di SMA MUHIPO.',
        target: 'SEMUA',
        type: 'BERITA',
        image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop',
      },
      {
        title: 'Pengumuman Jadwal Ujian Tengah Semester (UTS) & Pertemuan Wali Murid',
        content: 'Diberitahukan kepada seluruh siswa dan bapak/ibu wali murid SMA MUHIPO bahwa Ujian Tengah Semester (UTS) Semester Ganjil TA 2026/2027 akan dilaksanakan mulai tanggal 15 September 2026. Pertemuan koordinasi wali murid akan dilaksanakan pada Sabtu pekan ini.',
        target: 'WALI_MURID',
        type: 'PENGUMUMAN',
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop',
      },
      {
        title: 'Pelaksanaan Kegiatan Ekstrakurikuler & Pembinaan Kader Tahfidz',
        content: 'Seluruh kegiatan ekstrakurikuler serta pembinaan rutin program kader Muhammadiyah dan Tahfidz Qur\'an kembali berjalan efektif sesuai jadwal. Siswa diharapkan hadir tepat waktu dengan seragam yang ditentukan.',
        target: 'SISWA',
        type: 'PENGUMUMAN',
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
      }
    ];

    for (const ann of announcements) {
      const existing = await prisma.announcement.findFirst({ where: { title: ann.title } });
      if (!existing) {
        await prisma.announcement.create({
          data: {
            title: ann.title,
            content: ann.content,
            target: ann.target,
            type: ann.type,
            image: ann.image,
            authorId: superadminUser.id,
          }
        });
      }
    }
    console.log('✅ Announcements generated successfully.');
  }

  console.log('🎉 COMPLETE 33 CLASSES, TEACHERS, STUDENTS, FINANCE & ANNOUNCEMENTS SYNCHRONIZATION SUCCESSFUL!');
}

main()
  .catch((e) => {
    console.error('❌ Sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
