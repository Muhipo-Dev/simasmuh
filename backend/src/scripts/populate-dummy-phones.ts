import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Mulai Sinkronisasi Nomor WhatsApp Dummy untuk Pengembangan ---');
  const DEFAULT_PHONE = '088293733330';

  // 1. Update Users without phone
  const usersWithoutPhone = await prisma.user.findMany({
    where: {
      OR: [
        { phone: null },
        { phone: '' }
      ]
    },
    include: { teacherProfile: true }
  });

  console.log(`Ditemukan ${usersWithoutPhone.length} User yang belum memiliki nomor WhatsApp.`);
  let userUpdatedCount = 0;
  for (const user of usersWithoutPhone) {
    const existingTeacherPhone = user.teacherProfile?.phone;
    const phoneToSet = (existingTeacherPhone && existingTeacherPhone.trim() !== '') 
      ? existingTeacherPhone 
      : DEFAULT_PHONE;

    await prisma.user.update({
      where: { id: user.id },
      data: { phone: phoneToSet },
    });
    userUpdatedCount++;
  }
  console.log(`Berhasil memperbarui ${userUpdatedCount} akun pengguna dengan nomor WhatsApp.`);

  // 2. Update TeacherProfiles without phone
  const teachersWithoutPhone = await prisma.teacherProfile.findMany({
    where: {
      OR: [
        { phone: null },
        { phone: '' }
      ]
    }
  });

  console.log(`Ditemukan ${teachersWithoutPhone.length} Guru yang belum memiliki nomor WhatsApp.`);
  for (const teacher of teachersWithoutPhone) {
    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: { phone: DEFAULT_PHONE },
    });
  }

  // 3. Update Students without phone or parentPhone
  const studentsWithoutPhone = await prisma.student.findMany({
    where: {
      OR: [
        { phone: null },
        { phone: '' },
        { parentPhone: null },
        { parentPhone: '' }
      ]
    }
  });

  console.log(`Ditemukan ${studentsWithoutPhone.length} Siswa yang belum memiliki nomor WhatsApp pribadi / orang tua.`);
  let studentUpdatedCount = 0;
  for (const student of studentsWithoutPhone) {
    let studentPhone = student.phone;
    let parentPhone = student.parentPhone;

    // Try extracting from bioData if exists
    if (student.bioData) {
      try {
        const bio = JSON.parse(student.bioData);
        if (!studentPhone && bio.telp) studentPhone = String(bio.telp).trim();
        if (!parentPhone) {
          if (bio.telpAyah) parentPhone = String(bio.telpAyah).trim();
          else if (bio.telpIbu) parentPhone = String(bio.telpIbu).trim();
          else if (bio.telpWali) parentPhone = String(bio.telpWali).trim();
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    if (!studentPhone || studentPhone.trim() === '') {
      studentPhone = DEFAULT_PHONE;
    }
    if (!parentPhone || parentPhone.trim() === '') {
      parentPhone = DEFAULT_PHONE;
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        phone: studentPhone,
        parentPhone: parentPhone,
      }
    });
    studentUpdatedCount++;
  }
  console.log(`Berhasil memperbarui ${studentUpdatedCount} data siswa & orang tua.`);

  // 4. Update Setting default whatsappSenderNumber, apiUrl, apiKey
  const setting = await prisma.setting.findFirst();
  if (setting) {
    await prisma.setting.update({
      where: { id: setting.id },
      data: {
        whatsappSenderNumber: DEFAULT_PHONE,
        whatsappApiUrl: 'http://localhost:3002/api/send',
        whatsappApiKey: 'simasmuh_wa_secret_2026',
      }
    });
    console.log(`Pengaturan nomor pengirim WhatsApp default diperbarui: ${DEFAULT_PHONE}`);
    console.log(`Pengaturan API URL WhatsApp diperbarui: http://localhost:3002/api/send`);
  }

  console.log('--- Sinkronisasi Nomor WhatsApp Selesai dengan Aman (Semua data asli tetap utuh) ---');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat pembaruan nomor WhatsApp:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
