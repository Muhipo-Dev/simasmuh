import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Fix nailar password to 'nailar' and role to SUPERADMIN
  const nailarHash = await bcrypt.hash('nailar', 10);
  
  const nailar = await prisma.user.upsert({
    where: { username: 'nailar' },
    update: { password: nailarHash, role: 'SUPERADMIN' },
    create: {
      username: 'nailar',
      email: 'nailar@sekolah.com',
      name: 'Nailar (Superadmin)',
      password: nailarHash,
      role: 'SUPERADMIN',
    },
  });
  
  // Verify
  const verify = await bcrypt.compare('nailar', nailar.password);
  console.log('✅ nailar password reset →', verify ? 'OK (nailar/nailar)' : '❌ GAGAL');
  console.log('   role:', nailar.role);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
