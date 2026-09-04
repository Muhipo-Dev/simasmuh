import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tagihans = await prisma.tagihan.findMany({
      where: {
        notes: {
          contains: 'BEASISWA_INFO',
        },
      },
    });
    console.log(`Found ${tagihans.length} tagihans with BEASISWA_INFO`);
    for (const t of tagihans) {
      console.log(`ID: ${t.id}, Type: ${t.type}, Amount: ${t.amount}, Notes: ${t.notes}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
