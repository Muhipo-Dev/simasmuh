import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
        OR: [
          { email: '136' },
          { username: '136' },
          { nipNbm: '136' },
          { teacherProfile: { nip: '136' } },
          { student: { nis: '136' } },
          { student: { nisn: '136' } },
        ],
      },
    include: { student: true, teacherProfile: true }
  });
  console.log('Users matching 136:', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
