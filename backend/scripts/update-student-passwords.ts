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
  const users = await prisma.user.findMany({
    where: { role: 'SISWA' },
    include: { student: true }
  });

  console.log(`Found ${users.length} student accounts.`);
  
  for (const user of users) {
    if (!user.username) continue;
    
    // Hash the username to serve as the new password
    const hashedPassword = await bcrypt.hash(user.username, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log(`Updated password for student: ${user.username}`);
  }
  
  console.log('Finished updating student passwords!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
