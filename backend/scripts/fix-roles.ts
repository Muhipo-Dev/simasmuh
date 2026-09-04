import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixRoles() {
  console.log('Memperbaiki role user 123 menjadi SISWA...');
  const res1 = await prisma.user.updateMany({
    where: { username: '123' },
    data: { role: 'SISWA' }
  });
  console.log(`Berhasil mengubah ${res1.count} user.`);

  console.log('Memperbaiki role user nailar menjadi ADMIN_IT...');
  const res2 = await prisma.user.updateMany({
    where: { username: 'nailar' },
    data: { role: 'ADMIN_IT' }
  });
  console.log(`Berhasil mengubah ${res2.count} user.`);

  console.log('Perbaikan data selesai.');
}

fixRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
