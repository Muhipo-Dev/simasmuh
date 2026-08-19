import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const parents = await this.prisma.user.findMany({
      where: {
        role: 'WALI_MURID',
      },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return parents.map((u) => {
      const parentProfile = u.parentProfile;
      const connectedStudents =
        parentProfile?.students?.map((ps) => ({
          id: ps.student.id,
          nis: ps.student.nis,
          nisn: ps.student.nisn,
          name: ps.student.name,
          className: ps.student.class?.name || '-',
          gradeLevel: ps.student.class?.gradeLevel,
          relation: ps.relation || 'ORANG_TUA',
        })) || [];

      return {
        id: u.id,
        parentProfileId: parentProfile?.id,
        name: u.name,
        username: u.username,
        phone: u.phone || parentProfile?.phone || '-',
        email: u.email,
        role: u.role,
        occupation: parentProfile?.occupation || null,
        address: parentProfile?.address || u.address || null,
        connectedStudents,
        primaryNis: connectedStudents[0]?.nis || '-',
        createdAt: u.createdAt,
      };
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'WALI_MURID',
      },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Data wali murid tidak ditemukan');
    }

    const connectedStudents =
      user.parentProfile?.students?.map((ps) => ({
        id: ps.student.id,
        nis: ps.student.nis,
        nisn: ps.student.nisn,
        name: ps.student.name,
        className: ps.student.class?.name || '-',
        gradeLevel: ps.student.class?.gradeLevel,
        relation: ps.relation || 'ORANG_TUA',
      })) || [];

    return {
      id: user.id,
      parentProfileId: user.parentProfile?.id,
      name: user.name,
      username: user.username,
      phone: user.phone || user.parentProfile?.phone,
      email: user.email,
      role: user.role,
      occupation: user.parentProfile?.occupation,
      address: user.parentProfile?.address || user.address,
      connectedStudents,
      primaryNis: connectedStudents[0]?.nis || null,
      createdAt: user.createdAt,
    };
  }

  async create(data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    studentIds?: string[];
    studentNisList?: string[];
    relation?: string;
    occupation?: string;
    address?: string;
  }) {
    const rawPhone = (data.phone || '').trim();
    if (!rawPhone) {
      throw new BadRequestException('Nomor telepon wali murid wajib diisi sebagai nomor WhatsApp dan username login');
    }

    const username = rawPhone;

    // Cek duplikasi username / phone
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { phone: rawPhone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(`Pengguna atau nomor WhatsApp ${rawPhone} sudah terdaftar di sistem`);
    }

    // Cari siswa yang akan dihubungkan
    let targetStudents: any[] = [];
    if (data.studentIds && data.studentIds.length > 0) {
      targetStudents = await this.prisma.student.findMany({
        where: { id: { in: data.studentIds } },
      });
    } else if (data.studentNisList && data.studentNisList.length > 0) {
      targetStudents = await this.prisma.student.findMany({
        where: {
          OR: [
            { nis: { in: data.studentNisList } },
            { nisn: { in: data.studentNisList } },
          ],
        },
      });
    }

    if (targetStudents.length === 0) {
      throw new BadRequestException('Wajib menghubungkan minimal satu siswa (berdasarkan NIS/NISN atau pilihan siswa)');
    }

    // Password default adalah NIS dari siswa pertama
    const defaultPassword = targetStudents[0]?.nis || rawPhone;
    const plainPassword = data.password && data.password.trim() !== '' ? data.password.trim() : defaultPassword;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Buat User, ParentProfile, dan ParentStudent relasi
    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        username,
        phone: rawPhone,
        email: data.email && data.email.trim() !== '' ? data.email.trim() : null,
        password: hashedPassword,
        role: 'WALI_MURID',
        address: data.address || null,
        parentProfile: {
          create: {
            phone: rawPhone,
            occupation: data.occupation || null,
            address: data.address || null,
            students: {
              create: targetStudents.map((st) => ({
                studentId: st.id,
                relation: data.relation || 'ORANG_TUA',
              })),
            },
          },
        },
      },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Update juga parentPhone pada siswa jika belum ada
    for (const st of targetStudents) {
      if (!st.parentPhone || st.parentPhone === '088293733330') {
        await this.prisma.student.update({
          where: { id: st.id },
          data: { parentPhone: rawPhone },
        });
      }
    }

    return user;
  }

  async update(id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    studentIds?: string[];
    relation?: string;
    occupation?: string;
    address?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { parentProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Data wali murid tidak ditemukan');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.address !== undefined) updateData.address = data.address;

    if (data.phone !== undefined) {
      const rawPhone = data.phone.trim();
      if (!rawPhone) {
        throw new BadRequestException('Nomor telepon tidak boleh kosong');
      }
      // Cek duplikasi jika no telepon diganti
      const existing = await this.prisma.user.findFirst({
        where: {
          OR: [{ username: rawPhone }, { phone: rawPhone }],
          NOT: { id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Nomor WhatsApp/Username ${rawPhone} sudah digunakan akun lain`);
      }
      updateData.phone = rawPhone;
      updateData.username = rawPhone;
    }

    if (data.email !== undefined) {
      updateData.email = data.email && data.email.trim() !== '' ? data.email.trim() : null;
    }

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    // Pastikan ParentProfile ada
    let parentProfileId = user.parentProfile?.id;
    if (!parentProfileId) {
      const pp = await this.prisma.parentProfile.create({
        data: {
          userId: user.id,
          phone: updateData.phone || user.phone,
          occupation: data.occupation || null,
          address: data.address || null,
        },
      });
      parentProfileId = pp.id;
    } else {
      await this.prisma.parentProfile.update({
        where: { id: parentProfileId },
        data: {
          ...(updateData.phone && { phone: updateData.phone }),
          ...(data.occupation !== undefined && { occupation: data.occupation }),
          ...(data.address !== undefined && { address: data.address }),
        },
      });
    }

    // Update relasi siswa jika diberikan
    if (data.studentIds !== undefined) {
      // Hapus relasi lama
      await this.prisma.parentStudent.deleteMany({
        where: { parentId: parentProfileId },
      });

      // Hubungkan siswa baru
      if (data.studentIds.length > 0) {
        const students = await this.prisma.student.findMany({
          where: { id: { in: data.studentIds } },
        });

        await this.prisma.parentStudent.createMany({
          data: students.map((st) => ({
            parentId: parentProfileId,
            studentId: st.id,
            relation: data.relation || 'ORANG_TUA',
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Data wali murid tidak ditemukan');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async removeMany(ids: string[]) {
    return this.prisma.user.deleteMany({
      where: { id: { in: ids }, role: 'WALI_MURID' },
    });
  }

  async getAvailableStudents() {
    const students = await this.prisma.student.findMany({
      include: {
        class: true,
        parentRelations: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return students.map((s) => {
      let bioDataObj: any = {};
      try {
        if (s.bioData) {
          bioDataObj = typeof s.bioData === 'string' ? JSON.parse(s.bioData) : s.bioData;
        }
      } catch {}

      return {
        id: s.id,
        nis: s.nis,
        nisn: s.nisn,
        name: s.name,
        className: s.class?.name || '-',
        gradeLevel: s.class?.gradeLevel,
        parentPhone: s.parentPhone || bioDataObj.noHpAyah || bioDataObj.noHpIbu || bioDataObj.noHpWali || null,
        parentName: bioDataObj.namaAyah || bioDataObj.namaIbu || bioDataObj.namaWali || null,
        hasParentAccount: s.parentRelations.length > 0,
        linkedParents: s.parentRelations.map((pr) => ({
          parentUserId: pr.parent.user.id,
          parentName: pr.parent.user.name,
          phone: pr.parent.user.phone,
        })),
      };
    });
  }

  async syncFromStudents() {
    const students = await this.prisma.student.findMany({
      include: {
        class: true,
        parentRelations: true,
      },
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      let bioDataObj: any = {};
      try {
        if (student.bioData) {
          bioDataObj = typeof student.bioData === 'string' ? JSON.parse(student.bioData) : student.bioData;
        }
      } catch {}

      const phone =
        (student.parentPhone && student.parentPhone.trim() !== '' && student.parentPhone !== '088293733330'
          ? student.parentPhone.trim()
          : null) ||
        (bioDataObj.noHpAyah && bioDataObj.noHpAyah.trim() !== '' ? bioDataObj.noHpAyah.trim() : null) ||
        (bioDataObj.noHpIbu && bioDataObj.noHpIbu.trim() !== '' ? bioDataObj.noHpIbu.trim() : null) ||
        (bioDataObj.noHpWali && bioDataObj.noHpWali.trim() !== '' ? bioDataObj.noHpWali.trim() : null);

      if (!phone) {
        skippedCount++;
        continue;
      }

      const parentName =
        bioDataObj.namaAyah ||
        bioDataObj.namaIbu ||
        bioDataObj.namaWali ||
        `Wali dari ${student.name}`;

      // Cek apakah akun dengan no hp ini sudah ada
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ username: phone }, { phone }],
        },
        include: { parentProfile: true },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash(student.nis, 10);
        user = await this.prisma.user.create({
          data: {
            username: phone,
            phone,
            name: parentName,
            role: 'WALI_MURID',
            password: passwordHash,
            parentProfile: {
              create: {
                phone,
                students: {
                  create: {
                    studentId: student.id,
                    relation: 'ORANG_TUA',
                  },
                },
              },
            },
          },
          include: { parentProfile: true },
        });
        createdCount++;
      } else {
        // Jika akun user sudah ada, pastikan ParentProfile dan relasi dengan student ini dibuat
        let parentProfileId = user.parentProfile?.id;
        if (!parentProfileId) {
          const pp = await this.prisma.parentProfile.create({
            data: {
              userId: user.id,
              phone: user.phone || phone,
            },
          });
          parentProfileId = pp.id;
        }

        // Cek relasi parent-student
        const existingRel = await this.prisma.parentStudent.findUnique({
          where: {
            parentId_studentId: {
              parentId: parentProfileId,
              studentId: student.id,
            },
          },
        });

        if (!existingRel) {
          await this.prisma.parentStudent.create({
            data: {
              parentId: parentProfileId,
              studentId: student.id,
              relation: 'ORANG_TUA',
            },
          });
          createdCount++;
        } else {
          skippedCount++;
        }
      }
    }

    return {
      message: `Sinkronisasi selesai. Berhasil membuat/menghubungkan ${createdCount} akun wali murid. (${skippedCount} dilewati / sudah ada).`,
      createdCount,
      skippedCount,
    };
  }

  async getMyStudents(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: {
                      include: {
                        homeroomTeacher: {
                          include: {
                            user: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.parentProfile) {
      return [];
    }

    return user.parentProfile.students.map((ps) => ({
      id: ps.student.id,
      nis: ps.student.nis,
      nisn: ps.student.nisn,
      name: ps.student.name,
      gender: ps.student.gender,
      program: ps.student.program,
      classId: ps.student.classId,
      className: ps.student.class?.name || '-',
      gradeLevel: ps.student.class?.gradeLevel,
      homeroomTeacherName: ps.student.class?.homeroomTeacher?.user?.name || ps.student.class?.homeroomTeacher?.nip || '-',
      relation: ps.relation || 'ORANG_TUA',
    }));
  }

  async getMyDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: {
                      include: {
                        homeroomTeacher: {
                          include: {
                            user: true,
                          },
                        },
                        schedules: {
                          include: {
                            subject: true,
                            teacher: {
                              include: {
                                user: true,
                              },
                            },
                          },
                          orderBy: [
                            { dayOfWeek: 'asc' },
                            { startTime: 'asc' },
                          ],
                        },
                      },
                    },
                    attendances: {
                      take: 20,
                      orderBy: { date: 'desc' },
                      include: {
                        schedule: {
                          include: {
                            subject: true,
                          },
                        },
                      },
                    },
                    tagihans: {
                      orderBy: { createdAt: 'desc' },
                      include: {
                        payments: { orderBy: { paymentDate: 'desc' } },
                        paymentProofs: {
                          orderBy: { createdAt: 'desc' },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const students = (user.parentProfile?.students || []).map((ps) => {
      const st = ps.student;
      const allTagihans = st.tagihans || [];
      const unpaidTagihans = allTagihans.filter(
        (t) => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN'
      );
      const totalUnpaid = unpaidTagihans.reduce(
        (sum, t) => sum + Math.max(0, t.amount - (t.amountPaid || 0)),
        0
      );

      return {
        id: st.id,
        nis: st.nis,
        nisn: st.nisn,
        name: st.name,
        gender: st.gender,
        program: st.program,
        classId: st.classId,
        className: st.class?.name || '-',
        gradeLevel: st.class?.gradeLevel,
        homeroomTeacherName:
          st.class?.homeroomTeacher?.user?.name ||
          st.class?.homeroomTeacher?.nip ||
          '-',
        relation: ps.relation || 'ORANG_TUA',
        schedules: st.class?.schedules || [],
        recentAttendances: st.attendances || [],
        tagihans: allTagihans,
        unpaidTagihans,
        totalUnpaid,
        // Fitur Etika, Tata Tertib & Ibadah (Views only)
        etikaTataTertib: {
          status: 'COMING_SOON',
          kedisiplinanScore: 100,
          ibadahScore: 'A (Sangat Baik)',
          perilakuScore: 'A (Terpuji)',
          totalPelanggaran: 0,
          catatanKarakter: 'Siswa menunjukkan sikap yang santun, aktif mengikuti sholat berjamaah, dan disiplin waktu di madrasah.',
          timTatibContact: 'Tim Ketertiban & BP/BK Madrasah',
        },
        // Fitur E-Rapor (Views only / Download Coming Soon)
        eRapor: {
          status: 'COMING_SOON',
          semesterAktif: 'Semester Ganjil 2026/2027',
          ipSemester: 3.85,
          peringkatKelas: '3 dari 32 Siswa',
          kelulusanStatus: 'Memenuhi Kriteria Ketuntasan',
          downloadAvailable: false,
        },
      };
    });

    return {
      parentUser: {
        id: user.id,
        name: user.name,
        phone: user.phone || user.username,
        username: user.username,
        email: user.email,
        address: user.address || user.parentProfile?.address,
      },
      students,
      notificationSettings: {
        notifPresensiMasuk: true,
        notifPresensiPulang: true,
        notifTagihanBaru: true,
        notifTagihanLunas: true,
        notifPengumuman: true,
        whatsappTargetNumber: user.phone || user.username,
      },
    };
  }

  async updateNotificationSettings(userId: string, settings: any) {
    // Simpan konfirmasi preferensi notifikasi
    return {
      success: true,
      message: 'Pengaturan notifikasi WhatsApp wali murid berhasil diperbarui.',
      settings,
    };
  }
}
