import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('⚡ Initializing GOD User Account (supermuhipo)...');

  const godPassword = await bcrypt.hash('godofmuhipo', 10);

  const godUser = await prisma.user.upsert({
    where: { username: 'supermuhipo' },
    update: {
      name: 'GOD user',
      role: 'GOD',
      password: godPassword,
      email: 'supermuhipo@smamuhipo.sch.id',
      isActive: true,
      employmentStatus: null,
      nipNbm: null,
      subRole: null,
      subRole2: null,
      subRole3: null,
      subRole4: null,
      subRole5: null,
    },
    create: {
      username: 'supermuhipo',
      name: 'GOD user',
      password: godPassword,
      role: 'GOD',
      email: 'supermuhipo@smamuhipo.sch.id',
      isActive: true,
      employmentStatus: null,
      nipNbm: null,
      subRole: null,
      subRole2: null,
      subRole3: null,
      subRole4: null,
      subRole5: null,
    },
  });

  console.log('✅ GOD User Created/Updated Successfully:');
  console.log('   ID:', godUser.id);
  console.log('   Username:', godUser.username);
  console.log('   Name:', godUser.name);
  console.log('   Role:', godUser.role);
  console.log('   SubRoles:', [godUser.subRole, godUser.subRole2, godUser.subRole3, godUser.subRole4, godUser.subRole5].filter(Boolean).join(', '));
  console.log('   IsActive:', godUser.isActive);
}

main()
  .catch((e) => {
    console.error('❌ Failed to create GOD User:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
