import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) { }

  // Helper: Ambil Tahun Pelajaran & Semester Aktif dari Pengaturan Sistem Sekolah
  async getSystemAcademicYear(): Promise<{ academicYear: string; semester: number }> {
    const setting = await this.prisma.setting.findFirst({
      select: { academicYear: true, semester: true },
    });
    const academicYear = setting?.academicYear || '2026/2027';
    let semester = 1;
    if (setting?.semester) {
      const s = setting.semester.toString().toLowerCase();
      if (s === '2' || s.includes('genap')) semester = 2;
    }
    return { academicYear, semester };
  }

  // 1. Ambil Penilaian dengan Filter Fleksibel & Keamanan Scoping
  async findAssessments(query: {
    classId?: string;
    subjectId?: string;
    studentId?: string;
    nis?: string;
    semester?: string | number;
    academicYear?: string;
    userId?: string;
    userRole?: string;
    subRoles?: string[];
    excludeProgram?: boolean;
  }) {
    const systemSetting = await this.getSystemAcademicYear();
    const where: any = {};

    if (query.excludeProgram) {
      where.AND = [
        { subject: { category: { not: 'PILIHAN_PROGRAM' } } },
        { subject: { program: null } },
        { NOT: { subject: { name: { contains: 'tari', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'ai', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'artificial intelligence', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'tahfidz', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'tahfiz', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'entrepreneur', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'enterpreneur', mode: 'insensitive' } } } },
        { NOT: { subject: { name: { contains: 'olahraga', mode: 'insensitive' } } } },
      ];
    }

    if (query.classId && query.classId !== 'ALL') {
      where.OR = [
        { classId: query.classId },
        { student: { classId: query.classId } },
      ];
    }
    if (query.subjectId && query.subjectId !== 'ALL') {
      where.subjectId = query.subjectId;
    }
    if (query.studentId) {
      where.studentId = query.studentId;
    } else if (query.nis) {
      where.student = { nis: query.nis };
    }

    // Prioritas tahun ajaran: 1) query jika diberikan, 2) tahun ajaran aktif dari sistem sekolah, 3) tahun ajaran kelas
    let activeAcademicYear = query.academicYear;
    if (!activeAcademicYear) {
      activeAcademicYear = systemSetting.academicYear;
    }
    if (!activeAcademicYear && query.classId && query.classId !== 'ALL') {
      const cls = await this.prisma.class.findUnique({
        where: { id: query.classId },
        select: { academicYear: true },
      });
      if (cls?.academicYear) {
        activeAcademicYear = cls.academicYear;
      }
    }
    if (!activeAcademicYear) {
      activeAcademicYear = '2026/2027';
    }

    if (query.semester) {
      where.semester = parseInt(query.semester.toString(), 10);
    }
    where.academicYear = activeAcademicYear;

    let existingAssessments = await this.prisma.studentAssessment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            gender: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                homeroomTeacherId: true,
                homeroomTeacher: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        },
        class: true,
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    // Fallback: jika existingAssessments kosong namun ada penilaian di tahun ajaran kelas siswa
    if (existingAssessments.length === 0 && query.classId && query.classId !== 'ALL') {
      const fallbackWhere = { ...where };
      delete fallbackWhere.academicYear;
      const anyAssessments = await this.prisma.studentAssessment.findMany({
        where: fallbackWhere,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              nis: true,
              nisn: true,
              gender: true,
              classId: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  academicYear: true,
                  homeroomTeacherId: true,
                  homeroomTeacher: {
                    include: {
                      user: { select: { id: true, name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
          class: true,
          subject: true,
          teacher: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: [
          { class: { name: 'asc' } },
          { student: { name: 'asc' } },
        ],
      });
      if (anyAssessments.length > 0) {
        existingAssessments = anyAssessments;
      }
    }

    // Jika filter kelas (classId) diberikan, pastikan seluruh siswa kelas tersebut muncul ke sistem
    // Nilai tetap 0 / belum diinput jika guru mapel belum menginputkan nilai
    if (query.classId && query.classId !== 'ALL' && !query.studentId && !query.nis) {
      const allClassStudents = await this.prisma.student.findMany({
        where: { classId: query.classId, isActive: true },
        select: {
          id: true,
          name: true,
          nis: true,
          nisn: true,
          gender: true,
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
              academicYear: true,
              homeroomTeacherId: true,
              homeroomTeacher: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Tentukan mata pelajaran target (bisa dari query.subjectId atau jadwal kelas tersebut)
      let targetSubjects: any[] = [];
      if (query.subjectId && query.subjectId !== 'ALL') {
        const s = await this.prisma.subject.findUnique({
          where: { id: query.subjectId },
          include: {
            teacherSubjects: {
              include: {
                teacher: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        });
        if (s) {
          // Cari guru pengampu dari jadwal kelas ini terlebih dahulu
          const classSched = await this.prisma.schedule.findFirst({
            where: { classId: query.classId, subjectId: query.subjectId },
            include: {
              teacher: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          });

          const defaultTeacher =
            classSched?.teacher ||
            s.teacherSubjects?.[0]?.teacher ||
            null;

          targetSubjects = [{
            ...s,
            defaultTeacher,
          }];
        }
      } else {
        // Ambil mata pelajaran yang ada di jadwal kelas ini
        const classSchedules = await this.prisma.schedule.findMany({
          where: { classId: query.classId },
          include: {
            subject: true,
            teacher: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
        const subjMap = new Map<string, any>();
        classSchedules.forEach((sc) => {
          if (sc.subject && !subjMap.has(sc.subject.id)) {
            subjMap.set(sc.subject.id, {
              ...sc.subject,
              defaultTeacher: sc.teacher,
            });
          }
        });
        targetSubjects = Array.from(subjMap.values());
        if (query.excludeProgram) {
          targetSubjects = targetSubjects.filter((s: any) => {
            if (s.category === 'PILIHAN_PROGRAM' || s.program) return false;
            const n = (s.name || '').toLowerCase();
            return !(
              n.includes('tari') ||
              n.includes('ai') ||
              n.includes('artificial intelligence') ||
              n.includes('tahfidz') ||
              n.includes('tahfiz') ||
              n.includes('entrepreneur') ||
              n.includes('enterpreneur') ||
              n.includes('olahraga')
            );
          });
        }
      }

      // Gabungkan rekaman eksisting dengan siswa yang belum memiliki nilai
      const existingMap = new Map<string, any>();
      existingAssessments.forEach((item) => {
        existingMap.set(`${item.studentId}_${item.subjectId}`, item);
      });

      const syntheticList: any[] = [];
      for (const student of allClassStudents) {
        const studentAcademicYear = student.class?.academicYear || activeAcademicYear || '2026/2027';
        for (const subj of targetSubjects) {
          const key = `${student.id}_${subj.id}`;
          if (existingMap.has(key)) {
            const existItem = existingMap.get(key);
            if (!existItem.teacher && subj.defaultTeacher) {
              existItem.teacher = subj.defaultTeacher;
              existItem.teacherId = subj.defaultTeacher.id;
            }
            syntheticList.push(existItem);
          } else {
            // Belum diinput oleh guru mapel: sajikan data nama & NIS siswa dengan nilai 0
            syntheticList.push({
              id: `virtual_${student.id}_${subj.id}`,
              studentId: student.id,
              classId: query.classId,
              subjectId: subj.id,
              teacherId: subj.defaultTeacher?.id || null,
              academicYear: studentAcademicYear,
              semester: query.semester ? parseInt(query.semester.toString(), 10) : 1,
              sts: 0,
              sas: 0,
              finalScore: 0,
              formatifAvg: 0,
              sumatifLmAvg: 0,
              raporCapaianKompetensi: '',
              raporCatatanWali: '',
              student,
              subject: subj,
              teacher: subj.defaultTeacher || null,
              isVirtual: true,
            });
          }
        }
      }

      if (syntheticList.length > 0) {
        return syntheticList;
      }
    }

    return existingAssessments;
  }

  // 1b. Ambil Penilaian Khusus Program Unggulan (Non-Dapodik: Tari, AI, Olahraga, Entrepreneur, Tahfidz, dll.)
  async findProgramAssessments(query: {
    classId?: string;
    subjectId?: string;
    studentId?: string;
    program?: string;
    semester?: string | number;
    academicYear?: string;
  }) {
    const where: any = {
      OR: [
        { subject: { category: 'PILIHAN_PROGRAM' } },
        { subject: { program: { not: null } } },
        { subject: { name: { contains: 'tari', mode: 'insensitive' } } },
        { subject: { name: { contains: 'ai', mode: 'insensitive' } } },
        { subject: { name: { contains: 'artificial intelligence', mode: 'insensitive' } } },
        { subject: { name: { contains: 'tahfidz', mode: 'insensitive' } } },
        { subject: { name: { contains: 'tahfiz', mode: 'insensitive' } } },
        { subject: { name: { contains: 'entrepreneur', mode: 'insensitive' } } },
        { subject: { name: { contains: 'enterpreneur', mode: 'insensitive' } } },
        { subject: { name: { contains: 'olahraga', mode: 'insensitive' } } },
      ],
    };

    if (query.classId && query.classId !== 'ALL') {
      where.AND = [
        {
          OR: [
            { classId: query.classId },
            { student: { classId: query.classId } },
          ],
        },
      ];
    }
    const systemSetting = await this.getSystemAcademicYear();
    let activeAcademicYear = query.academicYear;
    if (!activeAcademicYear) {
      activeAcademicYear = systemSetting.academicYear;
    }
    if (!activeAcademicYear && query.classId && query.classId !== 'ALL') {
      const cls = await this.prisma.class.findUnique({
        where: { id: query.classId },
        select: { academicYear: true },
      });
      if (cls?.academicYear) {
        activeAcademicYear = cls.academicYear;
      }
    }
    if (!activeAcademicYear) {
      activeAcademicYear = '2026/2027';
    }

    if (query.semester) {
      where.semester = parseInt(query.semester.toString(), 10);
    }
    where.academicYear = activeAcademicYear;

    const existingAssessments = await this.prisma.studentAssessment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            gender: true,
            program: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                homeroomTeacherId: true,
                homeroomTeacher: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        },
        class: true,
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    // Jika filter kelas (classId) diberikan, pastikan seluruh siswa kelas tersebut muncul
    if (query.classId && query.classId !== 'ALL' && !query.studentId) {
      const allClassStudents = await this.prisma.student.findMany({
        where: { classId: query.classId, isActive: true },
        select: {
          id: true,
          name: true,
          nis: true,
          nisn: true,
          gender: true,
          program: true,
          classId: true,
          class: {
            select: {
              id: true,
              name: true,
              academicYear: true,
              homeroomTeacherId: true,
              homeroomTeacher: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Ambil mata pelajaran program khusus yang ADA di jadwal kelas ini atau sesuai program siswa
      let targetProgramSubjects: any[] = [];
      if (query.subjectId && query.subjectId !== 'ALL') {
        const s = await this.prisma.subject.findUnique({ where: { id: query.subjectId } });
        if (s) targetProgramSubjects = [s];
      } else {
        // 1. Ambil jadwal kelas untuk melihat mapel program yang diajarkan di kelas ini
        const classSchedules = await this.prisma.schedule.findMany({
          where: { classId: query.classId },
          include: {
            subject: true,
            teacher: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });

        const scheduledProgramSubjectsMap = new Map<string, any>();
        classSchedules.forEach((sc) => {
          const s = sc.subject;
          if (!s) return;
          const isProg =
            s.category === 'PILIHAN_PROGRAM' ||
            !!s.program ||
            /tari|ai|artificial intelligence|tahfidz|tahfiz|entrepreneur|enterpreneur|olahraga/i.test(s.name);
          if (isProg && !scheduledProgramSubjectsMap.has(s.id)) {
            scheduledProgramSubjectsMap.set(s.id, {
              ...s,
              defaultTeacher: sc.teacher,
            });
          }
        });

        // 2. Jika jadwal kelas memiliki mapel program tertentu (misal seni budaya/tari, atau AI), gunakan itu
        if (scheduledProgramSubjectsMap.size > 0) {
          targetProgramSubjects = Array.from(scheduledProgramSubjectsMap.values());
        } else {
          // 3. Fallback jika jadwal belum diatur: periksa apakah ada siswa di kelas yang memiliki kolom `program`
          const studentPrograms = Array.from(
            new Set(allClassStudents.map((st) => (st.program || '').toLowerCase().trim()).filter(Boolean)),
          );

          if (studentPrograms.length > 0) {
            targetProgramSubjects = await this.prisma.subject.findMany({
              where: {
                OR: studentPrograms.map((prog) => ({
                  OR: [
                    { program: { equals: prog, mode: 'insensitive' } },
                    { name: { contains: prog, mode: 'insensitive' } },
                  ],
                })),
              },
              orderBy: { name: 'asc' },
            });
          } else {
            // Jika kelas sama sekali tidak memiliki jadwal program dan siswanya tidak mengambil program,
            // maka kelas ini adalah kelas reguler tanpa program
            targetProgramSubjects = [];
          }
        }
      }

      const existingMap = new Map<string, any>();
      existingAssessments.forEach((item) => {
        existingMap.set(`${item.studentId}_${item.subjectId}`, item);
      });

      const syntheticList: any[] = [];
      for (const student of allClassStudents) {
        const studentAcademicYear = student.class?.academicYear || activeAcademicYear || '2026/2027';
        for (const subj of targetProgramSubjects) {
          const key = `${student.id}_${subj.id}`;
          if (existingMap.has(key)) {
            const existItem = existingMap.get(key);
            if (!existItem.teacher && subj.defaultTeacher) {
              existItem.teacher = subj.defaultTeacher;
              existItem.teacherId = subj.defaultTeacher.id;
            }
            syntheticList.push(existItem);
          } else {
            syntheticList.push({
              id: `virtual_prog_${student.id}_${subj.id}`,
              studentId: student.id,
              classId: query.classId,
              subjectId: subj.id,
              teacherId: subj.defaultTeacher?.id || null,
              academicYear: studentAcademicYear,
              semester: query.semester ? parseInt(query.semester.toString(), 10) : 1,
              sts: 0,
              sas: 0,
              finalScore: 0,
              formatifAvg: 0,
              sumatifLmAvg: 0,
              raporCapaianKompetensi: '',
              raporCatatanWali: '',
              student,
              subject: subj,
              teacher: subj.defaultTeacher || null,
              isVirtual: true,
              isProgramAssessment: true,
            });
          }
        }
      }

      return syntheticList;
    }

    return existingAssessments;
  }

  // 2. Ambil Kelas & Mapel yang Diampu oleh Guru Tertentu atau sebagai Wali Kelas
  async getTeacherContext(userId: string) {
    let teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        homeroomClasses: true,
        schedules: {
          include: {
            class: true,
            subject: true,
          },
        },
        teacherSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Ambil jadwal mengajar langsung dari Master Data Jadwal (Schedule)
    // agar 100% sinkron baik melalui teacherProfile.id maupun relasi guru
    if (teacherProfile) {
      const liveSchedules = await this.prisma.schedule.findMany({
        where: { teacherId: teacherProfile.id },
        include: {
          class: true,
          subject: true,
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      });

      const liveHomeroomClasses = await this.prisma.class.findMany({
        where: { homeroomTeacherId: teacherProfile.id },
        orderBy: { name: 'asc' },
      });

      return {
        ...teacherProfile,
        schedules: liveSchedules,
        homeroomClasses: liveHomeroomClasses,
      };
    }

    if (!teacherProfile) {
      // Periksa apakah user memiliki peran atau sub-peran pendidik
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const roles = [user.role, user.subRole, user.subRole2, user.subRole3, user.subRole4, user.subRole5].filter(Boolean) as string[];
        const hasTeachingRole = roles.some(r => ['GURU', 'HONORER', 'WALI_KELAS', 'GURU_PIKET', 'GURU_TAHFIDZ'].includes(r));
        if (hasTeachingRole) {
          // Buat TeacherProfile otomatis jika belum ada
          teacherProfile = await this.prisma.teacherProfile.upsert({
            where: { userId },
            create: {
              userId,
              nip: user.nipNbm || null,
              phone: user.phone || null,
            },
            update: {},
            include: {
              user: true,
              homeroomClasses: true,
              schedules: {
                include: {
                  class: true,
                  subject: true,
                },
              },
              teacherSubjects: {
                include: {
                  subject: true,
                },
              },
            },
          });

          const liveSchedules = await this.prisma.schedule.findMany({
            where: { teacherId: teacherProfile.id },
            include: {
              class: true,
              subject: true,
            },
            orderBy: [
              { dayOfWeek: 'asc' },
              { startTime: 'asc' },
            ],
          });

          const liveHomeroomClasses = await this.prisma.class.findMany({
            where: { homeroomTeacherId: teacherProfile.id },
            orderBy: { name: 'asc' },
          });

          return {
            ...teacherProfile,
            schedules: liveSchedules,
            homeroomClasses: liveHomeroomClasses,
          };
        }
      }
    }

    return teacherProfile;
  }

  // 3. Upsert Batch Penilaian (dari Form Matrix atau Import Excel)
  async batchUpsertAssessments(data: {
    items: Array<{
      studentId: string;
      classId: string;
      subjectId: string;
      teacherId?: string;
      academicYear?: string;
      semester?: number;
      // Formatif TP
      lm1_tp1?: number | null;
      lm1_tp2?: number | null;
      lm1_tp3?: number | null;
      lm1_tp4?: number | null;
      lm2_tp1?: number | null;
      lm2_tp2?: number | null;
      lm2_tp3?: number | null;
      lm2_tp4?: number | null;
      lm3_tp1?: number | null;
      lm3_tp2?: number | null;
      lm3_tp3?: number | null;
      lm3_tp4?: number | null;
      lm4_tp1?: number | null;
      lm4_tp2?: number | null;
      lm4_tp3?: number | null;
      lm4_tp4?: number | null;
      lm5_tp1?: number | null;
      lm5_tp2?: number | null;
      lm5_tp3?: number | null;
      lm5_tp4?: number | null;
      // Sumatif LM
      sum_lm1?: number | null;
      sum_lm2?: number | null;
      sum_lm3?: number | null;
      sum_lm4?: number | null;
      sum_lm5?: number | null;
      // STS & SAS
      sts?: number | null;
      sas?: number | null;
      notes?: string | null;
      raporCapaianKompetensi?: string | null;
      raporCatatanWali?: string | null;
    }>;
  }) {
    const results: any[] = [];

    // Cache class academic year untuk efisiensi
    const classYearCache = new Map<string, string>();

    for (const item of data.items) {
      let academicYear = item.academicYear;
      if (!academicYear && item.classId) {
        if (!classYearCache.has(item.classId)) {
          const cls = await this.prisma.class.findUnique({
            where: { id: item.classId },
            select: { academicYear: true },
          });
          classYearCache.set(item.classId, cls?.academicYear || '2026/2027');
        }
        academicYear = classYearCache.get(item.classId);
      }
      if (!academicYear) {
        academicYear = '2026/2027';
      }
      const semester = item.semester ? parseInt(item.semester.toString(), 10) : 1;

      // Hitung rata-rata formatif
      const tpValues = [
        item.lm1_tp1, item.lm1_tp2, item.lm1_tp3, item.lm1_tp4,
        item.lm2_tp1, item.lm2_tp2, item.lm2_tp3, item.lm2_tp4,
        item.lm3_tp1, item.lm3_tp2, item.lm3_tp3, item.lm3_tp4,
        item.lm4_tp1, item.lm4_tp2, item.lm4_tp3, item.lm4_tp4,
        item.lm5_tp1, item.lm5_tp2, item.lm5_tp3, item.lm5_tp4,
      ].filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const formatifAvg = tpValues.length > 0 ? tpValues.reduce((a, b) => a + b, 0) / tpValues.length : null;

      // Hitung rata-rata sumatif LM
      const sumValues = [
        item.sum_lm1, item.sum_lm2, item.sum_lm3, item.sum_lm4, item.sum_lm5
      ].filter((v): v is number => typeof v === 'number' && !isNaN(v));
      const sumatifLmAvg = sumValues.length > 0 ? sumValues.reduce((a, b) => a + b, 0) / sumValues.length : null;

      // Hitung skor akhir NA (Final Score) jika ada komponen
      const finalParts: number[] = [];
      if (sumatifLmAvg !== null) finalParts.push(sumatifLmAvg);
      if (typeof item.sts === 'number' && !isNaN(item.sts)) finalParts.push(item.sts);
      if (typeof item.sas === 'number' && !isNaN(item.sas)) finalParts.push(item.sas);
      const finalScore = finalParts.length > 0 ? finalParts.reduce((a, b) => a + b, 0) / finalParts.length : null;

      const payload = {
        classId: item.classId,
        teacherId: item.teacherId || null,
        lm1_tp1: item.lm1_tp1 ?? null,
        lm1_tp2: item.lm1_tp2 ?? null,
        lm1_tp3: item.lm1_tp3 ?? null,
        lm1_tp4: item.lm1_tp4 ?? null,
        lm2_tp1: item.lm2_tp1 ?? null,
        lm2_tp2: item.lm2_tp2 ?? null,
        lm2_tp3: item.lm2_tp3 ?? null,
        lm2_tp4: item.lm2_tp4 ?? null,
        lm3_tp1: item.lm3_tp1 ?? null,
        lm3_tp2: item.lm3_tp2 ?? null,
        lm3_tp3: item.lm3_tp3 ?? null,
        lm3_tp4: item.lm3_tp4 ?? null,
        lm4_tp1: item.lm4_tp1 ?? null,
        lm4_tp2: item.lm4_tp2 ?? null,
        lm4_tp3: item.lm4_tp3 ?? null,
        lm4_tp4: item.lm4_tp4 ?? null,
        lm5_tp1: item.lm5_tp1 ?? null,
        lm5_tp2: item.lm5_tp2 ?? null,
        lm5_tp3: item.lm5_tp3 ?? null,
        lm5_tp4: item.lm5_tp4 ?? null,
        sum_lm1: item.sum_lm1 ?? null,
        sum_lm2: item.sum_lm2 ?? null,
        sum_lm3: item.sum_lm3 ?? null,
        sum_lm4: item.sum_lm4 ?? null,
        sum_lm5: item.sum_lm5 ?? null,
        sts: item.sts ?? null,
        sas: item.sas ?? null,
        formatifAvg: formatifAvg ? Math.round(formatifAvg * 100) / 100 : null,
        sumatifLmAvg: sumatifLmAvg ? Math.round(sumatifLmAvg * 100) / 100 : null,
        finalScore: finalScore ? Math.round(finalScore * 100) / 100 : null,
        notes: item.notes !== undefined ? item.notes : null,
        ...(item.raporCapaianKompetensi !== undefined ? { raporCapaianKompetensi: item.raporCapaianKompetensi } : {}),
        ...(item.raporCatatanWali !== undefined ? { raporCatatanWali: item.raporCatatanWali } : {}),
      };

      const record = await this.prisma.studentAssessment.upsert({
        where: {
          studentId_subjectId_academicYear_semester: {
            studentId: item.studentId,
            subjectId: item.subjectId,
            academicYear,
            semester,
          },
        },
        create: {
          studentId: item.studentId,
          subjectId: item.subjectId,
          academicYear,
          semester,
          ...payload,
        },
        update: payload,
      });

      results.push(record);
    }

    return {
      success: true,
      count: results.length,
      data: results,
    };
  }

  // 3b. Wali Kelas Update Deskripsi & Catatan Capaian Rapor
  async updateHomeroomDescriptions(data: {
    items: Array<{
      id?: string;
      studentId: string;
      classId?: string;
      subjectId: string;
      academicYear?: string;
      semester?: number;
      raporCapaianKompetensi?: string | null;
      raporCatatanWali?: string | null;
    }>;
  }) {
    const results: any[] = [];
    for (const item of data.items) {
      const isVirtual = !item.id || item.id.startsWith('virtual_');
      if (!isVirtual) {
        const updated = await this.prisma.studentAssessment.update({
          where: { id: item.id },
          data: {
            raporCapaianKompetensi: item.raporCapaianKompetensi,
            raporCatatanWali: item.raporCatatanWali,
          },
        });
        results.push(updated);
      } else {
        const academicYear = item.academicYear || '2025/2026';
        const semester = item.semester || 1;
        let classId = item.classId;
        if (!classId) {
          const st = await this.prisma.student.findUnique({
            where: { id: item.studentId },
            select: { classId: true },
          });
          classId = st?.classId || undefined;
        }

        if (!classId) continue;

        const updated = await this.prisma.studentAssessment.upsert({
          where: {
            studentId_subjectId_academicYear_semester: {
              studentId: item.studentId,
              subjectId: item.subjectId,
              academicYear,
              semester,
            },
          },
          create: {
            studentId: item.studentId,
            classId,
            subjectId: item.subjectId,
            academicYear,
            semester,
            sts: 0,
            sas: 0,
            finalScore: 0,
            raporCapaianKompetensi: item.raporCapaianKompetensi || null,
            raporCatatanWali: item.raporCatatanWali || null,
          },
          update: {
            raporCapaianKompetensi: item.raporCapaianKompetensi,
            raporCatatanWali: item.raporCatatanWali,
          },
        });
        results.push(updated);
      }
    }
    return {
      success: true,
      count: results.length,
      data: results,
    };
  }

  // 3c. Reset Asesmen / Nilai / Deskripsi Capaian Multi-Select
  async resetAssessments(data: {
    targetIds?: string[];
    studentIds?: string[];
    classId?: string;
    subjectId?: string;
    academicYear?: string;
    semester?: number;
    resetMode: 'SCORES_ONLY' | 'DESCRIPTIONS_ONLY' | 'ALL';
  }) {
    const { targetIds, studentIds, classId, subjectId, academicYear, semester, resetMode } = data;
    
    // Siapkan update payload sesuai resetMode
    let updateData: any = {};
    if (resetMode === 'SCORES_ONLY') {
      updateData = {
        lm1_tp1: null, lm1_tp2: null, lm1_tp3: null, lm1_tp4: null,
        lm2_tp1: null, lm2_tp2: null, lm2_tp3: null, lm2_tp4: null,
        lm3_tp1: null, lm3_tp2: null, lm3_tp3: null, lm3_tp4: null,
        lm4_tp1: null, lm4_tp2: null, lm4_tp3: null, lm4_tp4: null,
        lm5_tp1: null, lm5_tp2: null, lm5_tp3: null, lm5_tp4: null,
        sum_lm1: null, sum_lm2: null, sum_lm3: null, sum_lm4: null, sum_lm5: null,
        sts: null,
        sas: null,
        formatifAvg: null,
        sumatifLmAvg: null,
        finalScore: null,
        notes: null,
      };
    } else if (resetMode === 'DESCRIPTIONS_ONLY') {
      updateData = {
        raporCapaianKompetensi: null,
        raporCatatanWali: null,
      };
    } else if (resetMode === 'ALL') {
      updateData = {
        lm1_tp1: null, lm1_tp2: null, lm1_tp3: null, lm1_tp4: null,
        lm2_tp1: null, lm2_tp2: null, lm2_tp3: null, lm2_tp4: null,
        lm3_tp1: null, lm3_tp2: null, lm3_tp3: null, lm3_tp4: null,
        lm4_tp1: null, lm4_tp2: null, lm4_tp3: null, lm4_tp4: null,
        lm5_tp1: null, lm5_tp2: null, lm5_tp3: null, lm5_tp4: null,
        sum_lm1: null, sum_lm2: null, sum_lm3: null, sum_lm4: null, sum_lm5: null,
        sts: null,
        sas: null,
        formatifAvg: null,
        sumatifLmAvg: null,
        finalScore: null,
        notes: null,
        raporCapaianKompetensi: null,
        raporCatatanWali: null,
      };
    }

    // Bangun where condition
    const where: any = {};
    if (targetIds && targetIds.length > 0) {
      // Filter out virtual IDs
      const realIds = targetIds.filter(id => !id.startsWith('virtual_'));
      if (realIds.length > 0) {
        where.id = { in: realIds };
      } else {
        // Jika seluruh ID adalah virtual (belum disimpan di DB), tidak ada baris fisik yang di-update
        return { success: true, count: 0 };
      }
    } else if (studentIds && studentIds.length > 0) {
      where.studentId = { in: studentIds };
      if (classId) where.classId = classId;
      if (subjectId && subjectId !== 'ALL') where.subjectId = subjectId;
      if (academicYear) where.academicYear = academicYear;
      if (semester) where.semester = semester;
    } else {
      if (classId) where.classId = classId;
      if (subjectId && subjectId !== 'ALL') where.subjectId = subjectId;
      if (academicYear) where.academicYear = academicYear;
      if (semester) where.semester = semester;
    }

    const res = await this.prisma.studentAssessment.updateMany({
      where,
      data: updateData,
    });

    return {
      success: true,
      count: res.count,
    };
  }

  // 4. Riwayat / Rekap Nilai Siswa untuk Dashboard Siswa & Wali Murid
  async getStudentMyGrades(
    userId?: string,
    filter?: { semester?: string | number; academicYear?: string; studentId?: string }
  ) {
    let student: any = null;

    // Prioritas 1: Jika studentId diberikan langsung
    if (filter?.studentId) {
      student = await this.prisma.student.findUnique({
        where: { id: filter.studentId },
        include: { class: true },
      });
    }

    // Prioritas 2: Cari via userId langsung sebagai Siswa
    if (!student && userId) {
      student = await this.prisma.student.findUnique({
        where: { userId },
        include: { class: true },
      });
    }

    // Prioritas 3: Cari via userId sebagai Wali Murid
    if (!student && userId) {
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: {
          students: {
            include: {
              student: {
                include: { class: true },
              },
            },
          },
        },
      });

      if (parentProfile && parentProfile.students.length > 0) {
        // Jika parent memilih anak tertentu atau default anak pertama
        if (filter?.studentId) {
          const match = parentProfile.students.find((ps) => ps.studentId === filter.studentId);
          student = match ? match.student : parentProfile.students[0].student;
        } else {
          student = parentProfile.students[0].student;
        }
      }
    }

    if (!student) {
      return {
        student: null,
        stats: null,
        assessments: [],
      };
    }

    // 1. Ambil seluruh asesmen milik siswa ini (didukung filter semester & tahun ajaran)
    const assessWhere: any = { studentId: student.id };
    if (filter?.semester) {
      assessWhere.semester = parseInt(filter.semester.toString(), 10);
    }
    if (filter?.academicYear) {
      assessWhere.academicYear = filter.academicYear;
    }

    const assessments = await this.prisma.studentAssessment.findMany({
      where: assessWhere,
      include: {
        subject: true,
        class: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { semester: 'desc' },
        { subject: { name: 'asc' } },
      ],
    });

    // 2. Hitung Nilai Akumulasi & Rata-Rata Siswa Tersebut
    // Nilai Akumulasi = Total akumulasi dari semua nilai mata pelajaran siswa tersebut
    const validScores = assessments
      .map((a) => (typeof a.finalScore === 'number' && !isNaN(a.finalScore) ? a.finalScore : null))
      .filter((s): s is number => s !== null);

    const totalAkumulasi = validScores.reduce((sum, score) => sum + score, 0);
    const rataRata = validScores.length > 0 ? parseFloat((totalAkumulasi / validScores.length).toFixed(2)) : 0;

    // 3. Hitung Peringkat Paralel Kelas
    // Seluruh siswa dalam kelas diurutkan berdasarkan akumulasi nilai dari yang paling tinggi ke paling rendah
    let rank = 1;
    let totalStudentsInClass = 0;

    if (student.classId) {
      const classStudents = await this.prisma.student.findMany({
        where: { classId: student.classId, isActive: true },
        select: { id: true },
      });
      totalStudentsInClass = classStudents.length;

      // Filter yang sama diterapkan ke teman sekelas untuk perbandingan setara per periode
      const peerWhere: any = { classId: student.classId };
      if (filter?.semester) {
        peerWhere.semester = parseInt(filter.semester.toString(), 10);
      }
      if (filter?.academicYear) {
        peerWhere.academicYear = filter.academicYear;
      }

      const peersAssessments = await this.prisma.studentAssessment.findMany({
        where: peerWhere,
        select: {
          studentId: true,
          finalScore: true,
        },
      });

      // Kelompokkan skor berdasarkan studentId
      const peerScoreMap = new Map<string, number[]>();
      peersAssessments.forEach((item) => {
        if (typeof item.finalScore === 'number' && !isNaN(item.finalScore)) {
          if (!peerScoreMap.has(item.studentId)) {
            peerScoreMap.set(item.studentId, []);
          }
          peerScoreMap.get(item.studentId)!.push(item.finalScore);
        }
      });

      // Hitung total akumulasi untuk setiap siswa sekelas
      const studentTotals: { studentId: string; total: number; avg: number }[] = classStudents.map((cs) => {
        const scores = peerScoreMap.get(cs.id) || [];
        const tot = scores.reduce((a, b) => a + b, 0);
        const avg = scores.length > 0 ? tot / scores.length : 0;
        return { studentId: cs.id, total: tot, avg };
      });

      // Urutkan nilai siswa dari yang paling tinggi ke paling rendah (Descending)
      studentTotals.sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        return b.avg - a.avg;
      });

      // Cari nomor urut peringkat siswa saat ini (1-indexed)
      const myIndex = studentTotals.findIndex((st) => st.studentId === student.id);
      if (myIndex !== -1) {
        rank = myIndex + 1;
      }
    }

    // 4. Hitung Peringkat Angkatan / Paralel Tingkat Kelas (Contoh: Seluruh Angkatan Kelas 11)
    let rankAngkatan = 1;
    let totalStudentsInAngkatan = 0;
    const gradeLevel = student.class?.gradeLevel;

    if (gradeLevel) {
      // Ambil seluruh siswa aktif di seluruh kelas dengan tingkatan yang sama (misal semua kelas 10, 11, atau 12)
      const angkatanStudents = await this.prisma.student.findMany({
        where: {
          isActive: true,
          class: {
            gradeLevel,
          },
        },
        select: { id: true },
      });
      totalStudentsInAngkatan = angkatanStudents.length;

      const angkatanWhere: any = {
        class: {
          gradeLevel,
        },
      };
      if (filter?.semester) {
        angkatanWhere.semester = parseInt(filter.semester.toString(), 10);
      }
      if (filter?.academicYear) {
        angkatanWhere.academicYear = filter.academicYear;
      }

      const angkatanAssessments = await this.prisma.studentAssessment.findMany({
        where: angkatanWhere,
        select: {
          studentId: true,
          finalScore: true,
        },
      });

      const angkatanScoreMap = new Map<string, number[]>();
      angkatanAssessments.forEach((item) => {
        if (typeof item.finalScore === 'number' && !isNaN(item.finalScore)) {
          if (!angkatanScoreMap.has(item.studentId)) {
            angkatanScoreMap.set(item.studentId, []);
          }
          angkatanScoreMap.get(item.studentId)!.push(item.finalScore);
        }
      });

      const angkatanTotals: { studentId: string; total: number; avg: number }[] = angkatanStudents.map((as) => {
        const scores = angkatanScoreMap.get(as.id) || [];
        const tot = scores.reduce((a, b) => a + b, 0);
        const avg = scores.length > 0 ? tot / scores.length : 0;
        return { studentId: as.id, total: tot, avg };
      });

      angkatanTotals.sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        return b.avg - a.avg;
      });

      const myAngkatanIndex = angkatanTotals.findIndex((st) => st.studentId === student.id);
      if (myAngkatanIndex !== -1) {
        rankAngkatan = myAngkatanIndex + 1;
      }
    }

    // 5. Ambil Capaian Non-Mapel: Ekstrakurikuler, Karakter / Tatib, Prestasi, dan Kehadiran
    const [extracurriculars, characterAssessments, achievements, attendanceList] = await Promise.all([
      // A. Nilai Ekstrakurikuler
      this.prisma.extracurricularMember.findMany({
        where: { studentId: student.id, status: 'AKTIF' },
        include: {
          extracurricular: true,
          grades: {
            where: {
              ...(filter?.academicYear ? { academicYear: filter.academicYear } : {}),
            },
            orderBy: { createdAt: 'desc' },
          },
          attendances: true,
        },
      }),

      // B. Catatan Karakter, Kedisiplinan, Ibadah, & Adab
      this.prisma.characterAssessment.findMany({
        where: { studentId: student.id },
        include: {
          evaluator: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 50,
      }),

      // C. Catatan Prestasi & Penghargaan Siswa (Modul Kesiswaan)
      this.prisma.studentAchievement.findMany({
        where: {
          studentId: student.id,
          // Ambil prestasi yang valid/terverifikasi atau tanpa penolakan
          statusVerifikasi: { not: 'DITOLAK' },
        },
        orderBy: { tanggal: 'desc' },
        take: 50,
      }),

      // D. Rekap Kehadiran Siswa
      this.prisma.attendance.findMany({
        where: { studentId: student.id },
        select: { status: true },
      }),
    ]);

    // Hitung ringkasan kehadiran
    const totalPresensi = attendanceList.length;
    const hadirCount = attendanceList.filter((a) => a.status === 'HADIR').length;
    const sakitCount = attendanceList.filter((a) => a.status === 'SAKIT').length;
    const izinCount = attendanceList.filter((a) => a.status === 'IZIN').length;
    const alfaCount = attendanceList.filter((a) => a.status === 'ALFA').length;
    const persentaseKehadiran = totalPresensi > 0 ? Math.round((hadirCount / totalPresensi) * 100) : 100;

    // Hitung ringkasan karakter & kedisiplinan (Presisi sesuai modul BK / Ketertiban)
    let totalPointsDelta = 0;
    let totalPelanggaran = 0;
    let tatibPrestasiCount = 0;
    let amalanIbadahCount = 0;

    characterAssessments.forEach((item) => {
      const isVerified =
        item.status === 'SELESAI' ||
        item.status === 'TERVERIFIKASI' ||
        item.status === 'DALAM_PEMBINAAN';

      if (isVerified) {
        totalPointsDelta += item.points || 0;
        if (item.category === 'PELANGGARAN' || item.type === 'NEGATIF') {
          totalPelanggaran++;
        } else if (
          item.category === 'PRESTASI_PENGHARGAAN' ||
          (item.points > 0 && item.type === 'POSITIF')
        ) {
          tatibPrestasiCount++;
        } else if (item.category === 'IBADAH') {
          amalanIbadahCount++;
        }
      }
    });

    // Dasar skor disiplin 100 poin (Skala 0 - 100)
    const skorKedisiplinan = Math.max(0, Math.min(100, 100 + totalPointsDelta));

    const getGradeInfo = (score: number) => {
      if (score >= 90) return { grade: 'A', label: 'A (Baik / Terpuji)' };
      if (score >= 70) return { grade: 'B', label: 'B (Pantauan Ringan)' };
      if (score >= 50) return { grade: 'C', label: 'C (Pantauan & Bimbingan)' };
      if (score >= 20) return { grade: 'D', label: 'D (Perlu Bimbingan Ketat)' };
      return { grade: 'E', label: 'E (Kritis)' };
    };

    const kedisiplinanPredikat = getGradeInfo(skorKedisiplinan).label;
    const kedisiplinanGrade = getGradeInfo(skorKedisiplinan).grade;

    // Unifikasi Prestasi: Gabungkan prestasi resmi dari kesiswaan dan catatan prestasi dari tim ketertiban/BK
    const tatibAchievementsAsList = characterAssessments
      .filter((c) =>
        (c.category === 'PRESTASI_PENGHARGAAN' || (c.points > 0 && c.type === 'POSITIF')) &&
        c.status !== 'MENUNGGU'
      )
      .map((c) => ({
        id: `tatib-${c.id}`,
        judul: c.title,
        kategoriBidang: 'Ketertiban & Adab',
        tingkat: 'Sekolah',
        peringkat: 'Penghargaan / Apresiasi',
        penyelenggara: 'SMA Muhammadiyah 1 Ponorogo',
        tahun: new Date(c.date).getFullYear(),
        tanggal: c.date,
        tempat: 'Sekolah',
        deskripsi: c.description,
        sertifikatUrl: null,
        pembimbing: c.evaluator?.name || 'Tim Ketertiban / BK',
        poinApresiasi: c.points,
        statusVerifikasi: 'TERVERIFIKASI',
        source: 'KETERTIBAN',
      }));

    // Gabungkan tanpa duplikasi ID dan urutkan tanggal terbaru
    const combinedAchievements = [
      ...achievements.map((a) => ({ ...a, source: 'KESISWAAN' })),
      ...tatibAchievementsAsList,
    ].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    return {
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis,
        nisn: student.nisn,
        className: student.class?.name || '-',
        gradeLevel: student.class?.gradeLevel || null,
      },
      stats: {
        totalAkumulasi: Math.round(totalAkumulasi * 100) / 100,
        rataRata,
        totalMataPelajaran: assessments.length,
        rank,
        totalStudentsInClass: totalStudentsInClass || 1,
        rankLabel: `${rank}/${totalStudentsInClass || 1}`,
        rankDescription: `Urut ${rank} dari ${totalStudentsInClass || 1} siswa`,
        rankAngkatan,
        totalStudentsInAngkatan: totalStudentsInAngkatan || 1,
        rankAngkatanLabel: `${rankAngkatan}/${totalStudentsInAngkatan || 1}`,
        rankAngkatanDescription: `Peringkat ${rankAngkatan} dari ${totalStudentsInAngkatan || 1} siswa angkatan kelas ${gradeLevel || ''}`,
        gradeLevel: gradeLevel || null,
        // Statistik non-mapel tersinkronisasi
        skorKedisiplinan,
        kedisiplinanGrade,
        kedisiplinanPredikat,
        totalPelanggaran,
        amalanIbadahCount,
        persentaseKehadiran,
        totalPrestasi: combinedAchievements.length,
        totalEkskul: extracurriculars.length,
        kehadiranSummary: {
          total: totalPresensi,
          hadir: hadirCount,
          sakit: sakitCount,
          izin: izinCount,
          alfa: alfaCount,
        },
      },
      assessments,
      // Capaian non-mapel
      extracurriculars: extracurriculars.map((e) => {
        const latestGrade = e.grades?.[0] || null;
        const totalSessions = e.attendances?.length || 0;
        const hadirEkskul = e.attendances?.filter((a) => a.status === 'HADIR').length || 0;
        const pctHadir = totalSessions > 0 ? Math.round((hadirEkskul / totalSessions) * 100) : 100;
        return {
          id: e.id,
          extracurricularId: e.extracurricularId,
          name: e.extracurricular?.name,
          category: e.extracurricular?.category,
          role: e.role,
          pembinaName: e.extracurricular?.pembinaName,
          score: latestGrade?.score ?? 85,
          predicate: latestGrade?.predicate ?? 'A',
          description: latestGrade?.description || 'Aktif dan berkontribusi baik dalam setiap sesi kegiatan.',
          totalSessions,
          hadirCount: hadirEkskul,
          pctHadir,
        };
      }),
      characterAssessments,
      achievements: combinedAchievements,
    };
  }

  // Legacy fallback methods for old Grade table (jika ada dependensi lama)
  async findAll(filter?: { nis?: string; studentId?: string }) {
    const where: any = {};
    if (filter?.studentId) {
      where.studentId = filter.studentId;
    } else if (filter?.nis) {
      where.student = { nis: filter.nis };
    }

    return this.prisma.grade.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
          },
        },
        subject: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.grade.findUnique({
      where: { id },
      include: { student: true, subject: true },
    });
  }

  async create(data: any) {
    return this.prisma.grade.create({ data });
  }

  // ==================== FITUR ARSIP E-RAPOR & HISTORI PENILAIAN ====================

  // Mengambil daftar periode tahun ajaran & semester yang tersimpan di basis data (untuk dropdown arsip)
  async getArchivePeriods() {
    const rawPeriods = await this.prisma.studentAssessment.groupBy({
      by: ['academicYear', 'semester'],
      _count: { id: true },
      orderBy: [
        { academicYear: 'desc' },
        { semester: 'desc' },
      ],
    });

    // Ambil tahun ajaran & semester aktif sistem sekolah
    const systemSetting = await this.getSystemAcademicYear();

    return {
      currentSystem: {
        academicYear: systemSetting.academicYear,
        semester: systemSetting.semester,
      },
      periods: rawPeriods.map((p) => ({
        academicYear: p.academicYear,
        semester: p.semester,
        totalRecords: p._count.id,
        isCurrent:
          p.academicYear === systemSetting.academicYear &&
          p.semester === systemSetting.semester,
      })),
    };
  }

  // Mengambil data arsip E-Rapor (Berdasarkan Tahun Pelajaran, Semester, Kelas, dan Mapel)
  // Khusus Admin TU, Superadmin, Kurikulum, atau Siswa/Wali Murid yang melihat historinya sendiri
  async findArchiveAssessments(query: {
    academicYear: string;
    semester?: string | number;
    classId?: string;
    subjectId?: string;
    studentId?: string;
    search?: string;
  }) {
    const where: any = {
      academicYear: query.academicYear,
    };

    if (query.semester && query.semester !== 'ALL') {
      where.semester = parseInt(query.semester.toString(), 10);
    }

    if (query.classId && query.classId !== 'ALL') {
      where.OR = [
        { classId: query.classId },
        { student: { classId: query.classId } },
      ];
    }

    if (query.subjectId && query.subjectId !== 'ALL') {
      where.subjectId = query.subjectId;
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.student = {
        ...(where.student || {}),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      };
    }

    const items = await this.prisma.studentAssessment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            nis: true,
            nisn: true,
            gender: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                academicYear: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            academicYear: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
            program: true,
          },
        },
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { student: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });

    return items;
  }

  async update(id: string, data: any) {
    return this.prisma.grade.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.grade.delete({ where: { id } });
  }
}

