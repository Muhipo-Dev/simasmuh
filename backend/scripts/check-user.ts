import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const student = await prisma.student.findFirst({
    where: { OR: [{ nis: '136' }, { nisn: '136' }] },
    include: { user: true }
  });
  console.log('Student:', JSON.stringify(student, null, 2));

  const user = await prisma.user.findFirst({
    where: { username: '136' },
  });
  console.log('User by username:', JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
