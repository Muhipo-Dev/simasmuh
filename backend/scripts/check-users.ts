import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, password: true, subRole: true }
  });
  console.log('=== ALL USERS ===');
  for (const u of users) {
    console.log(`- ${u.username} | role: ${u.role} | subRole: ${u.subRole} | pwd hash: ${u.password.substring(0, 20)}...`);
  }

  // Check nailar specifically
  const nailar = await prisma.user.findFirst({ where: { username: 'nailar' } });
  if (nailar) {
    console.log('\n=== NAILAR DETAIL ===');
    console.log(JSON.stringify({ ...nailar, password: nailar.password.substring(0, 30) + '...' }, null, 2));
  } else {
    console.log('\n❌ User "nailar" TIDAK DITEMUKAN di database!');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
