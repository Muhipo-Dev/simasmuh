import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDuplicates() {
  console.log('Cleaning duplicate Tagihan rows while preserving original records...');
  
  // Find duplicate tagihans by (studentId, type, year, month)
  const duplicates: any[] = await prisma.$queryRawUnsafe(`
    SELECT "studentId", "type", "year", "month", COUNT(*) as cnt
    FROM "Tagihan"
    WHERE "year" IS NOT NULL AND "month" IS NOT NULL
    GROUP BY "studentId", "type", "year", "month"
    HAVING COUNT(*) > 1;
  `);

  console.log(`Found ${duplicates.length} duplicate groups in Tagihan.`);

  for (const dup of duplicates) {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, "createdAt"
      FROM "Tagihan"
      WHERE "studentId" = '${dup.studentId}' AND "type" = '${dup.type}' AND "year" = ${dup.year} AND "month" = ${dup.month}
      ORDER BY "createdAt" ASC;
    `);

    // Keep the first one, delete the rest
    const keepId = rows[0].id;
    const deleteIds = rows.slice(1).map(r => `'${r.id}'`).join(',');
    
    if (deleteIds.length > 0) {
      await prisma.$executeRawUnsafe(`DELETE FROM "Tagihan" WHERE id IN (${deleteIds});`);
      console.log(`Cleaned ${rows.length - 1} duplicates for studentId ${dup.studentId}, type ${dup.type}, year ${dup.year}, month ${dup.month}. Kept ID ${keepId}`);
    }
  }

  // Now create the unique index
  try {
    const sql = `CREATE UNIQUE INDEX IF NOT EXISTS "Tagihan_studentId_type_year_month_key" ON "Tagihan" ("studentId", "type", "year", "month");`;
    await prisma.$executeRawUnsafe(sql);
    console.log('Successfully created index: Tagihan_studentId_type_year_month_key');
  } catch (e: any) {
    console.error('Error creating index:', e.message);
  }

  await prisma.$disconnect();
  await pool.end();
}

cleanDuplicates().catch(console.error);
