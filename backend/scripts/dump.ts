import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function dump() {
  console.log('Dumping data from Supabase...');
  const tables = [
    'Setting', 'User', 'TeacherProfile', 'Class', 'Student', 'Subject', 'Schedule',
    'Attendance', 'DailyAttendance', 'Grade', 'TeachingJournal', 'HomeroomJournal',
    'Announcement', 'StaffJournal', 'IzinKeluar', 'Payment', 'Tagihan', 'Pengeluaran',
    'FileHash', 'PaymentProof', 'NotificationTemplate', 'Notification'
  ];

  const dumpData: any = {};

  for (const table of tables) {
    console.log(`Dumping ${table}...`);
    // @ts-ignore
    const records = await prisma[table[0].toLowerCase() + table.slice(1)].findMany();
    dumpData[table] = records;
  }

  fs.writeFileSync('dump.json', JSON.stringify(dumpData, null, 2));
  console.log('Dump completed: dump.json');
}

dump().catch(console.error).finally(() => prisma.$disconnect());
