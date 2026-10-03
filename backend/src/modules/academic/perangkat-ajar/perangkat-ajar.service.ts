import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  NotificationsService,
  NotificationType,
  NotificationPriority,
} from '../../communication/notifications/notifications.service';
import {
  CreatePerangkatAjarDto,
  UpdatePerangkatAjarDto,
  VerifyPerangkatAjarDto,
} from './dto/perangkat-ajar.dto';

@Injectable()
export class PerangkatAjarService {
  private readonly logger = new Logger(PerangkatAjarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cari profil guru berdasarkan userId
   */
  async getTeacherProfileByUserId(userId: string) {
    return this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Cek apakah user memiliki peran pimpinan / kurikulum
   */
  isKurikulumOrPimpinan(user: any): boolean {
    const roles = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    return roles.some((r: string) =>
      [
        'SUPERADMIN',
        'ADMIN_IT',
        'KEPALA_SEKOLAH',
        'KURIKULUM',
        'WAKA_KURIKULUM',
        'KESISWAAN',
        'WAKA_KESISWAAN',
        'HUMAS_SDM',
        'WAKA_HUMAS_SDM',
        'KEPEGAWAIAN',
        'SDM',
        'SARPRAS',
        'WAKA_SARPRAS',
        'ISMUBA',
        'WAKA_ISMUBA',
      ].includes(r) || r.startsWith('WAKA_') || r.includes('WAKA')
    );
  }

  /**
   * Ambil daftar perangkat ajar dengan filter dinamis
   */
  async findAll(query: {
    teacherId?: string;
    academicYear?: string;
    semester?: string;
    jenisPerangkat?: string;
    status?: string;
    search?: string;
    currentUser?: any;
  }) {
    const { teacherId, academicYear, semester, jenisPerangkat, status, search, currentUser } = query;

    const isKurikulum = currentUser ? this.isKurikulumOrPimpinan(currentUser) : false;
    let targetTeacherId = teacherId;

    // Jika bukan kurikulum/pimpinan dan teacherId tidak dispesifikasikan, batasi ke guru yang login
    if (!isKurikulum && currentUser && !targetTeacherId) {
      const teacherProfile = await this.getTeacherProfileByUserId(currentUser.id);
      if (teacherProfile) {
        targetTeacherId = teacherProfile.id;
      }
    }

    const where: any = {};

    if (targetTeacherId && targetTeacherId !== 'ALL') {
      where.teacherId = targetTeacherId;
    }
    if (academicYear && academicYear !== 'ALL') {
      where.academicYear = academicYear;
    }
    if (semester && semester !== 'ALL') {
      where.semester = semester;
    }
    if (jenisPerangkat && jenisPerangkat !== 'ALL') {
      where.jenisPerangkat = jenisPerangkat;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subjectName: { contains: search, mode: 'insensitive' } },
        { teacherName: { contains: search, mode: 'insensitive' } },
        { className: { contains: search, mode: 'insensitive' } },
        { fase: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.perangkatAjar.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Detail satu perangkat ajar
   */
  async findOne(id: string) {
    const doc = await this.prisma.perangkatAjar.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException('Dokumen perangkat ajar tidak ditemukan.');
    }

    return doc;
  }

  /**
   * Upload / Tambah Perangkat Ajar Baru oleh Guru
   */
  async create(dto: CreatePerangkatAjarDto, currentUser: any) {
    let teacherProfileId = dto.teacherId;
    let teacherName = '';
    let nip = '';

    if (!teacherProfileId) {
      const profile = await this.getTeacherProfileByUserId(currentUser.id);
      if (!profile) {
        throw new BadRequestException('Profil Guru Anda belum terdaftar di SIMASMUH.');
      }
      teacherProfileId = profile.id;
      teacherName = profile.user.name;
      nip = profile.nip || '';
    } else {
      const profile = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherProfileId },
        include: { user: true },
      });
      if (!profile) {
        throw new NotFoundException('Profil Guru sasaran tidak ditemukan.');
      }
      teacherName = profile.user.name;
      nip = profile.nip || '';
    }

    const created = await this.prisma.perangkatAjar.create({
      data: {
        teacherId: teacherProfileId,
        teacherName,
        nip,
        academicYear: dto.academicYear || '2025/2026',
        semester: dto.semester || 'GANJIL',
        subjectName: dto.subjectName,
        className: dto.className || null,
        fase: dto.fase || null,
        jenisPerangkat: dto.jenisPerangkat,
        title: dto.title,
        description: dto.description || null,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType || 'PDF',
        fileSize: dto.fileSize || null,
        status: dto.status || 'DIAJUKAN',
      },
    });

    // Notifikasi otomatis ke Tim Kurikulum & Pimpinan
    try {
      const kurikulumUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { role: { in: ['SUPERADMIN', 'ADMIN_IT', 'KEPALA_SEKOLAH'] } },
            { subRole: { in: ['KURIKULUM', 'WAKA_KURIKULUM'] } },
            { subRole2: { in: ['KURIKULUM', 'WAKA_KURIKULUM'] } },
            { subRole3: { in: ['KURIKULUM', 'WAKA_KURIKULUM'] } },
            { subRole4: { in: ['KURIKULUM', 'WAKA_KURIKULUM'] } },
            { subRole5: { in: ['KURIKULUM', 'WAKA_KURIKULUM'] } },
          ],
          isActive: true,
        },
        select: { id: true, email: true, name: true },
      });

      for (const kurUser of kurikulumUsers) {
        if (kurUser.id !== currentUser.id) {
          await this.notificationsService.createNotification({
            userId: kurUser.id,
            title: 'Pengajuan Perangkat Pembelajaran Baru',
            message: `${teacherName} telah mengunggah dokumen "${dto.title}" (${dto.jenisPerangkat} - ${dto.subjectName}) untuk diverifikasi kurikulum.`,
            type: NotificationType.PERANGKAT_AJAR_SUBMITTED,
            priority: NotificationPriority.NORMAL,
            data: { perangkatAjarId: created.id, link: '/akademik/perangkat-ajar' },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Gagal mengirim notifikasi upload perangkat ajar: ${e.message}`);
    }

    return created;
  }

  /**
   * Update Perangkat Ajar oleh Guru
   */
  async update(id: string, dto: UpdatePerangkatAjarDto, currentUser: any) {
    const existing = await this.findOne(id);
    const isKurikulum = this.isKurikulumOrPimpinan(currentUser);

    // Guru hanya boleh edit berkas miliknya sendiri
    if (!isKurikulum && existing.teacher.userId !== currentUser.id) {
      throw new ForbiddenException('Anda tidak memiliki hak untuk mengubah dokumen ini.');
    }

    return this.prisma.perangkatAjar.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status || (existing.status === 'PERLU_REVISI' ? 'DIAJUKAN' : existing.status),
      },
    });
  }

  /**
   * Verifikasi Dokumen Perangkat Ajar oleh Kurikulum / Waka
   */
  async verify(id: string, dto: VerifyPerangkatAjarDto, currentUser: any) {
    const isKurikulum = this.isKurikulumOrPimpinan(currentUser);
    if (!isKurikulum) {
      throw new ForbiddenException('Hanya Tim Kurikulum / Pimpinan yang berhak memverifikasi perangkat ajar.');
    }

    const existing = await this.findOne(id);

    const updated = await this.prisma.perangkatAjar.update({
      where: { id },
      data: {
        status: dto.status,
        catatanVerifikasi: dto.catatanVerifikasi || null,
        verifiedByUserId: currentUser.id,
        verifiedByName: currentUser.name,
        verifiedAt: new Date(),
      },
    });

    // Kirim notifikasi resmi ke Guru pemilik berkas
    try {
      if (existing.teacher.userId) {
        const statusText =
          dto.status === 'TERVERIFIKASI'
            ? 'telah disetujui & diverifikasi'
            : dto.status === 'PERLU_REVISI'
            ? 'memerlukan perbaikan / revisi'
            : 'ditolak';

        await this.notificationsService.createNotification({
          userId: existing.teacher.userId,
          title: `Status Perangkat Ajar: ${dto.status}`,
          message: `Dokumen "${existing.title}" (${existing.jenisPerangkat}) ${statusText} oleh ${currentUser.name}.${
            dto.catatanVerifikasi ? ` Catatan: ${dto.catatanVerifikasi}` : ''
          }`,
          type: NotificationType.PERANGKAT_AJAR_VERIFIED,
          priority: dto.status === 'TERVERIFIKASI' ? NotificationPriority.NORMAL : NotificationPriority.HIGH,
          data: { perangkatAjarId: updated.id, link: '/akademik/perangkat-ajar' },
        });
      }
    } catch (e) {
      this.logger.warn(`Gagal mengirim notifikasi verifikasi ke guru: ${e.message}`);
    }

    return updated;
  }

  /**
   * Hapus Dokumen Perangkat Ajar
   */
  async remove(id: string, currentUser: any) {
    const existing = await this.findOne(id);
    const isKurikulum = this.isKurikulumOrPimpinan(currentUser);

    if (!isKurikulum && existing.teacher.userId !== currentUser.id) {
      throw new ForbiddenException('Anda tidak memiliki izin menghapus berkas ini.');
    }

    return this.prisma.perangkatAjar.delete({
      where: { id },
    });
  }

  /**
   * Statistik & Rekapitulasi Perangkat Pembelajaran 100% Sinkron Dinamis
   * Digunakan oleh halaman Supervisi Akademik & Tab Rekapitulasi
   */
  async getStatsRekap(academicYear?: string, semester?: string) {
    const year = academicYear || '2025/2026';
    const teachers = (await (this.prisma.teacherProfile.findMany as any)({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employmentStatus: true,
          },
        },
        perangkatAjars: {
          where: {
            academicYear: year,
            ...(semester && semester !== 'ALL' ? { semester } : {}),
          },
        },
        teachingJournals: true,
        supervisiRecords: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    })) as any[];

    const rekapData = teachers.map((teacher: any) => {
      const docs = teacher.perangkatAjars || [];
      const modulAjarList = docs.filter((d) => d.jenisPerangkat === 'MODUL_AJAR');
      const atpList = docs.filter((d) => d.jenisPerangkat === 'ATP');
      const cpList = docs.filter((d) => d.jenisPerangkat === 'CP');
      const protaPromesList = docs.filter((d) => d.jenisPerangkat === 'PROTA_PROMES');
      const asesmenList = docs.filter((d) => d.jenisPerangkat === 'ASESMEN');

      const verifiedCount = docs.filter((d) => d.status === 'TERVERIFIKASI').length;
      const needRevisionCount = docs.filter((d) => d.status === 'PERLU_REVISI').length;
      const submittedCount = docs.filter((d) => d.status === 'DIAJUKAN').length;

      // Evaluasi Modul Ajar
      const hasModulAjar = modulAjarList.length > 0;
      const modulAjarVerified = modulAjarList.some((d) => d.status === 'TERVERIFIKASI');
      const modulAjarStatus = hasModulAjar
        ? modulAjarVerified
          ? 'Terunggah (100%)'
          : 'Menunggu Verifikasi'
        : 'Belum Diunggah';

      // Evaluasi ATP
      const hasAtp = atpList.length > 0;
      const atpVerified = atpList.some((d) => d.status === 'TERVERIFIKASI');
      const atpStatus = hasAtp
        ? atpVerified
          ? 'Terverifikasi'
          : 'Menunggu Verifikasi'
        : 'Belum Diunggah';

      // Evaluasi CP
      const hasCp = cpList.length > 0;
      const cpVerified = cpList.some((d) => d.status === 'TERVERIFIKASI');
      const cpStatus = hasCp
        ? cpVerified
          ? 'Sesuai Fase E/F'
          : 'Tercatat'
        : 'Belum Diunggah';

      // Evaluasi Prota & Promes
      const hasProtaPromes = protaPromesList.length > 0;
      const protaPromesVerified = protaPromesList.some((d) => d.status === 'TERVERIFIKASI');
      const protaPromesStatus = hasProtaPromes
        ? protaPromesVerified
          ? 'Terstruktur'
          : 'Tersusun'
        : 'Belum Diunggah';

      // Kelengkapan umum (4 kategori utama)
      let completenessScore = 0;
      if (hasModulAjar) completenessScore += 25;
      if (hasAtp) completenessScore += 25;
      if (hasCp) completenessScore += 25;
      if (hasProtaPromes) completenessScore += 25;

      const lastSupervisi = teacher.supervisiRecords?.[0] || null;

      return {
        id: teacher.id,
        userId: teacher.userId,
        name: teacher.user.name,
        nip: teacher.nip || '-',
        totalDocs: docs.length,
        verifiedCount,
        needRevisionCount,
        submittedCount,
        completenessScore, // 0 - 100%
        modulAjarCount: modulAjarList.length,
        modulAjarStatus,
        atpCount: atpList.length,
        atpStatus,
        cpCount: cpList.length,
        cpStatus,
        protaPromesCount: protaPromesList.length,
        protaPromesStatus,
        asesmenCount: asesmenList.length,
        journalsCount: teacher.teachingJournals?.length || 0,
        lastScore: lastSupervisi?.finalScore || null,
        lastPredicate: lastSupervisi?.predicate || null,
        statusValidasi:
          completenessScore === 100 && verifiedCount >= 4
            ? 'TERVERIFIKASI_LENGKAP'
            : docs.length > 0
            ? 'PROSES_VERIFIKASI'
            : 'BELUM_LENGKAP',
        documents: docs,
      };
    });

    const totalTeachers = teachers.length;
    const teachersWithDocs = rekapData.filter((r) => r.totalDocs > 0).length;
    const teachersComplete = rekapData.filter((r) => r.completenessScore === 100).length;
    const totalAllDocs = rekapData.reduce((acc, curr) => acc + curr.totalDocs, 0);
    const totalAllVerified = rekapData.reduce((acc, curr) => acc + curr.verifiedCount, 0);

    return {
      summary: {
        totalTeachers,
        teachersWithDocs,
        teachersComplete,
        totalAllDocs,
        totalAllVerified,
        persentaseKelengkapanSekolah:
          totalTeachers > 0
            ? Math.round((teachersComplete / totalTeachers) * 100)
            : 0,
      },
      rekapList: rekapData,
    };
  }
}
