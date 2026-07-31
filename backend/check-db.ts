import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { OR: [{ role: 'SUPERADMIN' }, { role: 'ADMIN_IT' }] },
    select: { username: true, role: true, subRole: true }
  });
  console.log(users);
  
  // Update if necessary
  await prisma.user.updateMany({ where: { role: 'SUPERADMIN' }, data: { role: 'ADMIN_IT' }});
  await prisma.user.updateMany({ where: { subRole: 'SUPERADMIN' }, data: { subRole: 'ADMIN_IT' }});
  await prisma.user.updateMany({ where: { subRole2: 'SUPERADMIN' }, data: { subRole2: 'ADMIN_IT' }});
  await prisma.user.updateMany({ where: { subRole3: 'SUPERADMIN' }, data: { subRole3: 'ADMIN_IT' }});
  
  const usersAfter = await prisma.user.findMany({
    where: { role: 'ADMIN_IT' },
    select: { username: true, role: true }
  });
  console.log("After update:", usersAfter);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
