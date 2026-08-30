import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subject.findMany({
      include: {
        teacherSubjects: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    nipNbm: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
      include: {
        teacherSubjects: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    nipNbm: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(data: { name: string; code: string; teacherIds?: string[] }) {
    const { teacherIds, ...subjectData } = data;
    const subject = await this.prisma.subject.create({
      data: {
        ...subjectData,
        ...(teacherIds && teacherIds.length > 0 && {
          teacherSubjects: {
            create: teacherIds.map((tId) => ({
              teacherId: tId,
            })),
          },
        }),
      },
      include: {
        teacherSubjects: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    return subject;
  }

  async createBulk(
    dataArray: { name: string; code: string; teacherIds?: string[] }[],
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const item of dataArray) {
      try {
        const existing = await this.prisma.subject.findUnique({
          where: { code: item.code },
        });

        if (existing) {
          // If already exists, update teachers if provided
          if (item.teacherIds && item.teacherIds.length > 0) {
            await this.prisma.teacherSubject.deleteMany({
              where: { subjectId: existing.id },
            });
            await this.prisma.teacherSubject.createMany({
              data: item.teacherIds.map((tId) => ({
                subjectId: existing.id,
                teacherId: tId,
              })),
              skipDuplicates: true,
            });
          }
          skipped++;
        } else {
          await this.create(item);
          created++;
        }
      } catch {
        skipped++;
      }
    }

    return { created, skipped };
  }

  async update(
    id: string,
    data: { name?: string; code?: string; teacherIds?: string[] },
  ) {
    const { teacherIds, ...updateData } = data;

    // Update subject details
    const subject = await this.prisma.subject.update({
      where: { id },
      data: updateData,
    });

    // If teacherIds is explicitly provided (can be empty array to remove all)
    if (teacherIds !== undefined) {
      // Clear existing links
      await this.prisma.teacherSubject.deleteMany({
        where: { subjectId: id },
      });

      // Insert new links
      if (teacherIds.length > 0) {
        await this.prisma.teacherSubject.createMany({
          data: teacherIds.map((tId) => ({
            subjectId: id,
            teacherId: tId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }
}
