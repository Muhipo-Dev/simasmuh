import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.class.findMany({
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
    });
  }

  async findOne(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
        schedules: {
          include: { subject: true },
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
    dataArray: { name: string; gradeLevel: number; academicYear: string; homeroomTeacherId?: string }[],
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
    data: { name?: string; gradeLevel?: number; academicYear?: string; homeroomTeacherId?: string },
  ) {
    const oldClass = await this.prisma.class.findUnique({ where: { id } });
    const updated = await this.prisma.class.update({
      where: { id },
      data,
    });

    if (oldClass?.homeroomTeacherId && oldClass.homeroomTeacherId !== data.homeroomTeacherId) {
      await this.syncTeacherHomeroomSubRole(oldClass.homeroomTeacherId);
    }
    if (data.homeroomTeacherId) {
      await this.syncTeacherHomeroomSubRole(data.homeroomTeacherId);
    }

    return updated;
  }

  async remove(id: string) {
    const oldClass = await this.prisma.class.findUnique({ where: { id } });
    const removed = await this.prisma.class.delete({ where: { id } });
    if (oldClass?.homeroomTeacherId) {
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
        // Jika belum memiliki subRole WALI_KELAS, pasang pada subRole / subRole2 / subRole3 yang kosong atau set subRole
        if (user.subRole !== 'WALI_KELAS' && user.subRole2 !== 'WALI_KELAS' && user.subRole3 !== 'WALI_KELAS') {
          if (!user.subRole) {
            await this.prisma.user.update({ where: { id: user.id }, data: { subRole: 'WALI_KELAS' } });
          } else if (!user.subRole2) {
            await this.prisma.user.update({ where: { id: user.id }, data: { subRole2: 'WALI_KELAS' } });
          } else if (!user.subRole3) {
            await this.prisma.user.update({ where: { id: user.id }, data: { subRole3: 'WALI_KELAS' } });
          }
        }
      } else {
        // Hapus WALI_KELAS jika tidak lagi menjadi wali kelas
        const updateData: any = {};
        if (user.subRole === 'WALI_KELAS') updateData.subRole = null;
        if (user.subRole2 === 'WALI_KELAS') updateData.subRole2 = null;
        if (user.subRole3 === 'WALI_KELAS') updateData.subRole3 = null;
        if (Object.keys(updateData).length > 0) {
          await this.prisma.user.update({ where: { id: user.id }, data: updateData });
        }
      }
    } catch (e) {
      console.error('Error syncing homeroom subRole:', e);
    }
  }
}
