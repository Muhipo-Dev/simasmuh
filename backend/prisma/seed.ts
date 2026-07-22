import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as path from 'path'
import * as bcrypt from 'bcryptjs'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const guruPassword = await bcrypt.hash('guru123', 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@sekolah.com' },
    update: {},
    create: {
      email: 'superadmin@sekolah.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: 'SUPERADMIN',
    },
  })

  const guru = await prisma.user.upsert({
    where: { email: 'guru@sekolah.com' },
    update: {},
    create: {
      email: 'guru@sekolah.com',
      name: 'Guru Wali',
      password: guruPassword,
      role: 'GURU',
      teacherProfile: {
        create: {
          nip: '198001012005011001',
          phone: '081234567890',
        }
      }
    },
  })

  const math = await prisma.subject.upsert({
    where: { code: 'MTK-101' },
    update: {},
    create: {
      name: 'Matematika',
      code: 'MTK-101',
    },
  })

  const bio = await prisma.subject.upsert({
    where: { code: 'BIO-101' },
    update: {},
    create: {
      name: 'Biologi',
      code: 'BIO-101',
    },
  })

  console.log({ superAdmin, guru, math, bio })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
