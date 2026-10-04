import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

async function restoreLogs() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const dailyRecords = await prisma.dailyAttendance.findMany({
      include: {
        user: {
          include: {
            student: { include: { class: true } },
            teacherProfile: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    console.log(`Found ${dailyRecords.length} records in DailyAttendance table.`);

    const logs = dailyRecords.map((d, index) => {
      const recordDate = new Date(d.date);
      const pad = (n: number) => n.toString().padStart(2, '0');
      // Format YYYY-MM-DD
      const dateIso = `${recordDate.getFullYear()}-${pad(recordDate.getMonth() + 1)}-${pad(recordDate.getDate())}`;
      const dateFormatted = recordDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const timeStr = d.checkInTime || d.time || '07:15:00';
      const identifier =
        d.user?.student?.nis ||
        d.user?.nipNbm ||
        d.user?.teacherProfile?.nip ||
        d.user?.username ||
        '-';

      return {
        id: `${recordDate.getTime()}-${d.id || index}`,
        date: dateIso,
        dateFormatted: dateFormatted,
        timestamp: timeStr,
        userId: d.userId,
        userName: d.user?.name || 'Pengguna',
        userRole: d.user?.role || 'SISWA',
        avatarUrl: d.user?.avatarUrl || null,
        snapshotUrl: null,
        identifier: identifier,
        confidence: 0.95,
        scanType: d.checkOutTime ? 'PULANG' : 'MASUK',
        message: 'Presensi Terverifikasi (Database)',
        cameraName: 'Camera Gerbang Utama',
      };
    });

    const targetPaths = [
      'd:/simasmuh/storage/face-attendance-logs.json',
      'd:/simasmuh/backend/storage/face-attendance-logs.json',
      'D:/simasmuh_storage/face-attendance-logs.json',
    ];

    for (const p of targetPaths) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(logs, null, 2), 'utf8');
      console.log(`Successfully restored ${logs.length} logs to ${p}`);
    }
  } catch (err) {
    console.error('Error restoring logs:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

restoreLogs();
