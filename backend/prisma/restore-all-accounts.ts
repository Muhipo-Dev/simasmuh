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
  console.log('🔄 Restoring primary development accounts...');

  // Password = username untuk semua akun
  const nailarPwd = await bcrypt.hash('nailar', 10);
  const agungPwd = await bcrypt.hash('agung', 10);
  const ervinaPwd = await bcrypt.hash('ervina', 10);
  const yuliPwd = await bcrypt.hash('yuli', 10);
  const mulyaniPwd = await bcrypt.hash('mulyani', 10);
  const safriPwd = await bcrypt.hash('safri', 10);
  const manchuPwd = await bcrypt.hash('manchu', 10);

  // 1. Nailar — SUPERADMIN
  const nailar = await prisma.user.upsert({
    where: { username: 'nailar' },
    update: { name: 'Nailar', role: 'SUPERADMIN', password: nailarPwd, email: 'nailar@sekolah.com' },
    create: { username: 'nailar', email: 'nailar@sekolah.com', name: 'Nailar', password: nailarPwd, role: 'SUPERADMIN' },
  });
  console.log('✅ nailar (SUPERADMIN) →', nailar.username);

  // 2. Agung — GURU + subRole KEUANGAN_ALL (Akses Penuh Keuangan & Master Data)
  let agung = await prisma.user.findUnique({ where: { username: 'agung' }, include: { teacherProfile: true } });
  if (!agung) {
    agung = await prisma.user.create({
      data: {
        username: 'agung', email: 'agung@sekolah.com', name: 'Agung Tribowo, S.E. (Kepala Keuangan)',
        password: agungPwd, role: 'GURU', subRole: 'KEUANGAN_ALL', subRole2: 'NONE',
        teacherProfile: { create: { nip: '198505052010011002', phone: '088293733330' } },
      },
      include: { teacherProfile: true },
    });
  } else {
    await prisma.user.update({
      where: { username: 'agung' },
      data: { name: 'Agung Tribowo, S.E. (Kepala Keuangan)', role: 'GURU', subRole: 'KEUANGAN_ALL', subRole2: 'NONE', password: agungPwd, email: 'agung@sekolah.com' },
    });
  }
  console.log('✅ agung (KEUANGAN_ALL) →', agung.username);

  // 3. Ervina — GURU + subRole KEUANGAN_MASUK (Keuangan Masuk & Master Data)
  let ervina = await prisma.user.findUnique({ where: { username: 'ervina' }, include: { teacherProfile: true } });
  if (!ervina) {
    ervina = await prisma.user.create({
      data: {
        username: 'ervina', email: 'ervina@sekolah.com', name: 'Ervina Maghdalena, S.Pd. (Keuangan Masuk)',
        password: ervinaPwd, role: 'GURU', subRole: 'KEUANGAN_MASUK', subRole2: 'NONE',
        teacherProfile: { create: { nip: '198505052010019991', phone: '088293733330' } },
      },
      include: { teacherProfile: true },
    });
  } else {
    await prisma.user.update({
      where: { username: 'ervina' },
      data: { name: 'Ervina Maghdalena, S.Pd. (Keuangan Masuk)', role: 'GURU', subRole: 'KEUANGAN_MASUK', subRole2: 'NONE', password: ervinaPwd, email: 'ervina@sekolah.com' },
    });
  }
  console.log('✅ ervina (KEUANGAN_MASUK) →', ervina.username);

  // 4. Yuli — KARYAWAN + subRole KEUANGAN_KELUAR (Keuangan Keluar & Master Data)
  let yuli = await prisma.user.findUnique({ where: { username: 'yuli' }, include: { teacherProfile: true } });
  if (!yuli) {
    yuli = await prisma.user.create({
      data: {
        username: 'yuli', email: 'yuli@sekolah.com', name: 'Yuli Budi Arsih, A.Md. (Keuangan Keluar)',
        password: yuliPwd, role: 'KARYAWAN', subRole: 'KEUANGAN_KELUAR', subRole2: 'NONE',
        teacherProfile: { create: { nip: '199203032018012003', phone: '088293733330' } },
      },
      include: { teacherProfile: true },
    });
  } else {
    await prisma.user.update({
      where: { username: 'yuli' },
      data: { name: 'Yuli Budi Arsih, A.Md. (Keuangan Keluar)', role: 'KARYAWAN', subRole: 'KEUANGAN_KELUAR', subRole2: 'NONE', password: yuliPwd, email: 'yuli@sekolah.com' },
    });
  }
  console.log('✅ yuli (KEUANGAN_KELUAR) →', yuli.username);

  // 3. Mulyani — ADMIN_TU
  let mulyani = await prisma.user.findUnique({ where: { username: 'mulyani' }, include: { teacherProfile: true } });
  if (!mulyani) {
    mulyani = await prisma.user.create({
      data: {
        username: 'mulyani', email: 'mulyani@sekolah.com', name: 'Mulyani (Admin TU)',
        password: mulyaniPwd, role: 'ADMIN_TU',
        teacherProfile: { create: { nip: '199001012015011001', phone: '081222333444' } },
      },
      include: { teacherProfile: true },
    });
  } else {
    await prisma.user.update({
      where: { username: 'mulyani' },
      data: { name: 'Mulyani (Admin TU)', role: 'ADMIN_TU', password: mulyaniPwd, email: 'mulyani@sekolah.com' },
    });
  }
  console.log('✅ mulyani (ADMIN_TU) →', mulyani.username);

  // 4. Safri — ADMIN_WEB (Guru & Admin Web)
  let safri = await prisma.user.findUnique({ where: { username: 'safri' }, include: { teacherProfile: true } });
  if (!safri) {
    safri = await prisma.user.create({
      data: {
        username: 'safri', email: 'safri@sekolah.com', name: 'Safri (Guru & Admin Web)',
        password: safriPwd, role: 'ADMIN_WEB',
        teacherProfile: { create: { nip: '198001012005019992', phone: '081234567890' } },
      },
      include: { teacherProfile: true },
    });
  } else {
    await prisma.user.update({
      where: { username: 'safri' },
      data: { name: 'Safri (Guru & Admin Web)', role: 'ADMIN_WEB', password: safriPwd, email: 'safri@sekolah.com' },
    });
  }
  console.log('✅ safri (ADMIN_WEB) →', safri.username);

  // 5. Manchu — ADMIN_IT (Karyawan & Admin IT)
  const manchu = await prisma.user.upsert({
    where: { username: 'manchu' },
    update: { name: 'Niam M.Kom (Karyawan & Admin IT)', role: 'ADMIN_IT', password: manchuPwd, email: 'manchuart@gmail.com' },
    create: { username: 'manchu', email: 'manchuart@gmail.com', name: 'Niam M.Kom (Karyawan & Admin IT)', password: manchuPwd, role: 'ADMIN_IT' },
  });
  console.log('✅ manchu (ADMIN_IT) →', manchu.username);

  console.log('\n🎉 Restorasi akun pengembangan berhasil!');
  console.log('┌──────────┬──────────────┬──────────┐');
  console.log('│ Username │ Role         │ Password │');
  console.log('├──────────┼──────────────┼──────────┤');
  console.log('│ nailar   │ SUPERADMIN   │ nailar   │');
  console.log('│ ervina   │ KEUANGAN     │ ervina   │');
  console.log('│ mulyani  │ ADMIN_TU     │ mulyani  │');
  console.log('│ safri    │ ADMIN_WEB    │ safri    │');
  console.log('│ manchu   │ ADMIN_IT     │ manchu   │');
  console.log('└──────────┴──────────────┴──────────┘');
}

main()
  .catch((e) => {
    console.error('❌ gagal restorasi akun:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
