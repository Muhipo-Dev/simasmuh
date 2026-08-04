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

const programs = ['REGULER', 'TAHFIDZ', 'TADBIR', 'OLIMPIADE'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🚀 Generating & Seeding 500 Students into Supabase PostgreSQL...');

  const studentPasswordHash = await bcrypt.hash('123', 10);

  // 1. Create 15 Classes
  const classNames = [
    { name: 'X-1', grade: 10 }, { name: 'X-2', grade: 10 }, { name: 'X-3', grade: 10 }, { name: 'X-4', grade: 10 }, { name: 'X-5', grade: 10 },
    { name: 'XI-1', grade: 11 }, { name: 'XI-2', grade: 11 }, { name: 'XI-3', grade: 11 }, { name: 'XI-4', grade: 11 }, { name: 'XI-5', grade: 11 },
    { name: 'XII-1', grade: 12 }, { name: 'XII-2', grade: 12 }, { name: 'XII-3', grade: 12 }, { name: 'XII-4', grade: 12 }, { name: 'XII-5', grade: 12 },
  ];

  const createdClasses: any[] = [];
  for (const item of classNames) {
    let cls = await prisma.class.findFirst({ where: { name: item.name } });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name: item.name,
          gradeLevel: item.grade,
          academicYear: '2025/2026',
        },
      });
    }
    createdClasses.push(cls);
  }
  console.log(`✅ ${createdClasses.length} Classes ready in database.`);

  // 2. Generate 500 Students
  let count = 0;
  for (let i = 1; i <= 500; i++) {
    const isMale = i % 2 === 0;
    const gender = isMale ? 'L' : 'P';
    const firstName = isMale ? getRandomItem(firstNamesMale) : getRandomItem(firstNamesFemale);
    const lastName = getRandomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    const nis = `${20261000 + i}`;
    const nisn = `0081${String(i).padStart(6, '0')}`;
    const targetClass = createdClasses[i % createdClasses.length];
    const program = getRandomItem(programs);
    const username = nis;

    // Check if user or student already exists
    const existingStudent = await prisma.student.findUnique({ where: { nis } });
    if (existingStudent) {
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: username,
        email: `${nis}@siswa.sekolah.id`,
        name: fullName,
        password: studentPasswordHash,
        role: 'SISWA',
        nipNbm: nis,
        student: {
          create: {
            nis: nis,
            nisn: nisn,
            name: fullName,
            gender: gender,
            classId: targetClass.id,
            program: program,
          },
        },
      },
    });

    count++;
    if (count % 50 === 0 || count === 500) {
      console.log(`⏳ Progress: ${count}/500 students created...`);
    }
  }

  const totalStudents = await prisma.student.count();
  console.log(`🎉 Done! Total students in Supabase database: ${totalStudents}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to seed 500 students:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
