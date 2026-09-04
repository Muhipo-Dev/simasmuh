import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 1. Restore nailar as SUPERADMIN
  const nailarHash = await bcrypt.hash('nailar', 10);
  const nailar = await prisma.user.upsert({
    where: { username: 'nailar' },
    update: { password: nailarHash, role: 'SUPERADMIN' },
    create: {
      username: 'nailar',
      email: 'nailar@sekolah.com',
      name: 'Nailar (Superadmin)',
      password: nailarHash,
      role: 'SUPERADMIN',
    },
  });
  console.log('✅ nailar superadmin restored successfully!');

  // 2. Check if student 13327 user exists, if not create them
  const studentUsername = '13327';
  let studentUser = await prisma.user.findUnique({
    where: { username: studentUsername },
    include: { student: true },
  });

  const studentHash = await bcrypt.hash('password123', 10);

  if (!studentUser) {
    // Get first available class
    const firstClass = await prisma.class.findFirst();
    if (!firstClass) {
      throw new Error('No classes available in database to assign the student.');
    }

    studentUser = await prisma.user.create({
      data: {
        username: studentUsername,
        email: 'student13327@sekolah.com',
        name: 'Siswa 13327',
        password: studentHash,
        role: 'SISWA',
        student: {
          create: {
            nis: studentUsername,
            nisn: studentUsername,
            name: 'Siswa 13327',
            gender: 'LAKI_LAKI',
            classId: firstClass.id,
            program: 'reguler',
          },
        },
      },
      include: { student: true },
    });
    console.log('✅ Student 13327 created successfully!');
  } else {
    // Update role and password if already exists
    await prisma.user.update({
      where: { id: studentUser.id },
      data: {
        role: 'SISWA',
      },
    });

    if (!studentUser.student) {
      const firstClass = await prisma.class.findFirst();
      if (firstClass) {
        await prisma.student.create({
          data: {
            userId: studentUser.id,
            nis: studentUsername,
            nisn: studentUsername,
            name: 'Siswa 13327',
            gender: 'LAKI_LAKI',
            classId: firstClass.id,
            program: 'reguler',
          },
        });
      }
    }
    console.log('✅ Student 13327 already exists, verified references.');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
