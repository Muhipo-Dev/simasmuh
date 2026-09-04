import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const orphanedUsers = await prisma.user.findMany({
    where: { 
      role: 'SISWA',
      student: null
    }
  });
  
  console.log(`Found ${orphanedUsers.length} orphaned SISWA user accounts (without student profiles).`);
  
  if (orphanedUsers.length > 0) {
    const result = await prisma.user.deleteMany({
      where: {
        role: 'SISWA',
        student: null
      }
    });
    console.log(`Deleted ${result.count} orphaned users.`);
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
