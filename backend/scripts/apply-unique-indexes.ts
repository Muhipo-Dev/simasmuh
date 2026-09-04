import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const pool = new Pool({
  connectionString,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const indexes = [
    { name: 'Class_name_gradeLevel_academicYear_key', table: 'Class', columns: ['"name"', '"gradeLevel"', '"academicYear"'] },
    { name: 'Schedule_classId_subjectId_dayOfWeek_startTime_key', table: 'Schedule', columns: ['"classId"', '"subjectId"', '"dayOfWeek"', '"startTime"'] },
    { name: 'Attendance_studentId_scheduleId_date_key', table: 'Attendance', columns: ['"studentId"', '"scheduleId"', '"date"'] },
    { name: 'Grade_studentId_subjectId_type_semester_key', table: 'Grade', columns: ['"studentId"', '"subjectId"', '"type"', '"semester"'] },
    { name: 'TeachingJournal_scheduleId_teacherId_date_key', table: 'TeachingJournal', columns: ['"scheduleId"', '"teacherId"', '"date"'] },
    { name: 'HomeroomJournal_teacherId_date_key', table: 'HomeroomJournal', columns: ['"teacherId"', '"date"'] },
    { name: 'StaffJournal_userId_date_activity_key', table: 'StaffJournal', columns: ['"userId"', '"date"', '"activity"'] },
    { name: 'Tagihan_studentId_type_year_month_key', table: 'Tagihan', columns: ['"studentId"', '"type"', '"year"', '"month"'] },
  ];

  for (const idx of indexes) {
    try {
      const sql = `CREATE UNIQUE INDEX IF NOT EXISTS "${idx.name}" ON "${idx.table}" (${idx.columns.join(', ')});`;
      await prisma.$executeRawUnsafe(sql);
      console.log(`Successfully created index: ${idx.name}`);
    } catch (e: any) {
      console.error(`Error creating index ${idx.name}:`, e.message);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
