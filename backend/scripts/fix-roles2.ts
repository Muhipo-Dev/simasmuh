import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixRoles() {
  console.log('Memperbaiki role user agung menjadi KEUANGAN (role: GURU, subRole: KEUANGAN)...');
  const res1 = await prisma.user.updateMany({
    where: { username: 'agung' },
    data: { role: 'GURU', subRole: 'KEUANGAN' }
  });
  console.log(`Berhasil mengubah ${res1.count} user (agung).`);

  console.log('Memperbaiki role user safri menjadi GURU & ADMIN_WEB...');
  const res2 = await prisma.user.updateMany({
    where: { username: 'safri' },
    data: { role: 'GURU', subRole: 'ADMIN_WEB' }
  });
  console.log(`Berhasil mengubah ${res2.count} user (safri).`);

  console.log('Memperbaiki role user manchu menjadi GURU & KARYAWAN...');
  const res3 = await prisma.user.updateMany({
    where: { username: 'manchu' },
    data: { role: 'GURU', subRole: 'KARYAWAN' }
  });
  console.log(`Berhasil mengubah ${res3.count} user (manchu).`);

  console.log('Perbaikan data selesai.');
}

fixRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
