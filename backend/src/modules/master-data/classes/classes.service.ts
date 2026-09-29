import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export function sortClasses<T extends { name: string; gradeLevel?: number | null }>(classes: T[]): T[] {
  const romanToNumber = (val: string): number => {
    const v = val.trim().toUpperCase();
    if (v === 'I') return 1;
    if (v === 'II') return 2;
    if (v === 'III') return 3;
    if (v === 'IV') return 4;
    if (v === 'V') return 5;
    if (v === 'VI') return 6;
    if (v === 'VII') return 7;
    if (v === 'VIII') return 8;
    if (v === 'IX') return 9;
    if (v === 'X') return 10;
    if (v === 'XI') return 11;
    if (v === 'XII') return 12;
    if (v === 'XIII') return 13;
    const num = parseInt(v, 10);
    return isNaN(num) ? 999 : num;
  };

  const getEffectiveGrade = (cls: T): number => {
    if (typeof cls.gradeLevel === 'number' && cls.gradeLevel > 0) {
      return cls.gradeLevel;
    }
    const match = cls.name?.match(/^(?:KELAS\s+)?(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)/i);
    if (match && match[1]) {
      return romanToNumber(match[1]);
    }
    return 999;
  };

  return [...classes].sort((a, b) => {
    const gradeA = getEffectiveGrade(a);
    const gradeB = getEffectiveGrade(b);
    if (gradeA !== gradeB) {
      return gradeA - gradeB;
    }
    return (a.name || '').localeCompare(b.name || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const classes = await this.prisma.class.findMany({
      include: {
        _count: {
          select: { students: true },
        },
        homeroomTeacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { gradeLevel: 'asc' },
        { name: 'asc' },
      ],
    });

    return sortClasses(classes);
  }

  async findOne(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
        schedules: {
          include: { subject: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        homeroomTeacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async create(data: {
    name: string;
    gradeLevel: number;
    academicYear: string;
    homeroomTeacherId?: string;
  }) {
    const created = await this.prisma.class.create({ data });
    if (data.homeroomTeacherId) {
      await this.syncTeacherHomeroomSubRole(data.homeroomTeacherId);
    }
    return created;
  }

  async createBulk(
    dataArray: {
      name: string;
      gradeLevel: number;
      academicYear: string;
      homeroomTeacherId?: string;
    }[],
  ) {
    const results = await this.prisma.$transaction(
      dataArray.map((data) => this.prisma.class.create({ data })),
    );
    for (const d of dataArray) {
      if (d.homeroomTeacherId) {
        await this.syncTeacherHomeroomSubRole(d.homeroomTeacherId);
      }
    }
    return results;
  }

  async update(
    id: string,
    data: {
      name?: string;
      gradeLevel?: number;
      academicYear?: string;
      homeroomTeacherId?: string;
    },
  ) {
    const oldClass = await this.prisma.class.findUnique({ where: { id } });
    const updated = await this.prisma.class.update({
      where: { id },
      data,
    });

    if (
      oldClass?.homeroomTeacherId &&
      oldClass.homeroomTeacherId !== data.homeroomTeacherId
    ) {
      await this.syncTeacherHomeroomSubRole(oldClass.homeroomTeacherId);
    }
    if (data.homeroomTeacherId) {
      await this.syncTeacherHomeroomSubRole(data.homeroomTeacherId);
    }

    return updated;
  }

  async remove(id: string) {
    const oldClass = await this.prisma.class.findUnique({
      where: { id },
      include: { schedules: true, students: true },
    });
    if (!oldClass) return null;

    const removed = await this.prisma.$transaction(async (tx) => {
      // 1. Bersihkan jadwal kelas
      const schedules = await tx.schedule.findMany({
        where: { classId: id },
        select: { id: true },
      });
      if (schedules.length > 0) {
        const scheduleIds = schedules.map((s) => s.id);
        await tx.attendance.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.teachingJournal.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.schedule.deleteMany({
          where: { id: { in: scheduleIds } },
        });
      }

      // 2. Lepaskan hubungan kelas dari siswa jika ada
      await tx.student.updateMany({
        where: { classId: id },
        data: { classId: '' }, // atau null jika opsional
      }).catch(() => null);

      return tx.class.delete({ where: { id } });
    });

    if (oldClass.homeroomTeacherId) {
      await this.syncTeacherHomeroomSubRole(oldClass.homeroomTeacherId);
    }
    return removed;
  }

  // Sinkronisasi otomatis subRole 'WALI_KELAS' pada user terkait guru
  private async syncTeacherHomeroomSubRole(teacherProfileId: string) {
    try {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherProfileId },
        include: {
          homeroomClasses: true,
          user: true,
        },
      });

      if (!teacher || !teacher.user) return;

      const isHomeroom = teacher.homeroomClasses.length > 0;
      const user = teacher.user;

      if (isHomeroom) {
        // Jika belum memiliki subRole WALI_KELAS, pasang pada subRole / subRole2 / subRole3 / subRole4 / subRole5 yang kosong
        if (
          user.subRole !== 'WALI_KELAS' &&
          user.subRole2 !== 'WALI_KELAS' &&
          user.subRole3 !== 'WALI_KELAS' &&
          user.subRole4 !== 'WALI_KELAS' &&
          user.subRole5 !== 'WALI_KELAS'
        ) {
          if (!user.subRole) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subRole: 'WALI_KELAS' },
            });
          } else if (!user.subRole2) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subRole2: 'WALI_KELAS' },
            });
          } else if (!user.subRole3) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subRole3: 'WALI_KELAS' },
            });
          } else if (!user.subRole4) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subRole4: 'WALI_KELAS' },
            });
          } else if (!user.subRole5) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subRole5: 'WALI_KELAS' },
            });
          }
        }
      } else {
        // Hapus WALI_KELAS jika tidak lagi menjadi wali kelas
        const updateData: any = {};
        if (user.subRole === 'WALI_KELAS') updateData.subRole = null;
        if (user.subRole2 === 'WALI_KELAS') updateData.subRole2 = null;
        if (user.subRole3 === 'WALI_KELAS') updateData.subRole3 = null;
        if (user.subRole4 === 'WALI_KELAS') updateData.subRole4 = null;
        if (user.subRole5 === 'WALI_KELAS') updateData.subRole5 = null;
        if (Object.keys(updateData).length > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }
      }
    } catch (e) {
      console.error('Error syncing homeroom subRole:', e);
    }
  }
}
