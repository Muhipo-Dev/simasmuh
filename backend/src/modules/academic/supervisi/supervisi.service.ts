import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateSupervisiDto, CreateJadwalSupervisiDto } from './dto/supervisi.dto';

@Injectable()
export class SupervisiService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  // 1. Catat Hasil Supervisi Baru
  async createSupervisi(dto: CreateSupervisiDto, user: any) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Data pendidik/tendik tidak ditemukan.');
    }

    const currentYear = new Date().getFullYear();
    const count = await this.prisma.supervisiAkademik.count();
    const nomorSupervisi = `ASA-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    const teacherName = teacher.user?.name || 'Pendidik / Tendik';
    const supervisorName = dto.supervisorName || user?.name || 'Supervisor Penilai';

    const record = await this.prisma.supervisiAkademik.create({
      data: {
        nomorSupervisi,
        teacherId: dto.teacherId,
        teacherName,
        nip: teacher.nip || null,
        scheduleId: dto.scheduleId || null,
        jenisId: dto.jenisId,
        jenisLabel: dto.jenisLabel,
        kategori: dto.kategori || 'AKADEMIK',
        date: dto.date ? new Date(dto.date) : new Date(),
        className: dto.className || null,
        subjectName: dto.subjectName || null,
        material: dto.material || null,
        scores: dto.scores,
        finalScore: Number(dto.finalScore),
        predicate: dto.predicate,
        catatanKekuatan: dto.catatanKekuatan || null,
        catatanPerbaikan: dto.catatanPerbaikan || null,
        rekomendasi: dto.rekomendasi || null,
        tindakLanjut: dto.tindakLanjut || null,
        photoUrl: dto.photoUrl || null,
        supervisorUserId: user?.id || null,
        supervisorName,
        status: dto.status || 'SELESAI',
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'SUPERVISI_RECORD_CREATED',
      message: `Hasil supervisi "${record.jenisLabel}" (${record.nomorSupervisi}) untuk ${teacherName} berhasil dicatat dengan skor ${record.finalScore} (${record.predicate}).`,
      userId: user?.id,
      details: {
        supervisiId: record.id,
        nomorSupervisi: record.nomorSupervisi,
        teacherId: record.teacherId,
        teacherName,
        finalScore: record.finalScore,
        predicate: record.predicate,
      },
    });

    return record;
  }

  // 2. Ambil Semua Riwayat Supervisi (Dapat difilter per guru, jenis, tahun, kategori)
  async findAllSupervisi(params?: {
    teacherId?: string;
    jenisId?: string;
    kategori?: string;
    tahun?: number;
    search?: string;
  }) {
    const where: any = {};
    if (params?.teacherId && params.teacherId !== 'ALL') where.teacherId = params.teacherId;
    if (params?.jenisId && params.jenisId !== 'ALL') where.jenisId = params.jenisId;
    if (params?.kategori && params.kategori !== 'ALL') where.kategori = params.kategori;

    if (params?.tahun) {
      const start = new Date(Number(params.tahun), 0, 1);
      const end = new Date(Number(params.tahun), 11, 31, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    if (params?.search) {
      where.OR = [
        { teacherName: { contains: params.search, mode: 'insensitive' } },
        { supervisorName: { contains: params.search, mode: 'insensitive' } },
        { jenisLabel: { contains: params.search, mode: 'insensitive' } },
        { subjectName: { contains: params.search, mode: 'insensitive' } },
        { className: { contains: params.search, mode: 'insensitive' } },
        { nomorSupervisi: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supervisiAkademik.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // 3. Ambil Detail Supervisi berdasarkan ID
  async findOneSupervisi(id: string) {
    const record = await this.prisma.supervisiAkademik.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Data hasil supervisi tidak ditemukan.');
    }

    return record;
  }

  // 4. Update Tindak Lanjut / Catatan Supervisi
  async updateSupervisi(id: string, dto: Partial<CreateSupervisiDto>, user: any) {
    const existing = await this.findOneSupervisi(id);

    const updated = await this.prisma.supervisiAkademik.update({
      where: { id },
      data: {
        tindakLanjut: dto.tindakLanjut !== undefined ? dto.tindakLanjut : undefined,
        rekomendasi: dto.rekomendasi !== undefined ? dto.rekomendasi : undefined,
        catatanPerbaikan: dto.catatanPerbaikan !== undefined ? dto.catatanPerbaikan : undefined,
        catatanKekuatan: dto.catatanKekuatan !== undefined ? dto.catatanKekuatan : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'SUPERVISI_RECORD_UPDATED',
      message: `Data supervisi (${existing.nomorSupervisi}) ${existing.teacherName} diperbarui oleh ${user?.name}.`,
      userId: user?.id,
      details: { id, nomorSupervisi: existing.nomorSupervisi },
    });

    return updated;
  }

  // 5. Hapus Data Supervisi
  async removeSupervisi(id: string, user: any) {
    const existing = await this.findOneSupervisi(id);
    await this.prisma.supervisiAkademik.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'WARN',
      action: 'SUPERVISI_RECORD_DELETED',
      message: `Data supervisi (${existing.nomorSupervisi}) ${existing.teacherName} dihapus oleh ${user?.name}.`,
      userId: user?.id,
    });

    return { message: 'Data supervisi berhasil dihapus.' };
  }

  // 6. Buat Agenda / Jadwal Supervisi
  async createJadwal(dto: CreateJadwalSupervisiDto, user: any) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Data guru tidak ditemukan.');
    }

    const teacherName = teacher.user?.name || 'Guru';
    const supervisorName = dto.supervisorName || user?.name || 'Kepala Sekolah / Waka';

    return this.prisma.jadwalSupervisi.create({
      data: {
        teacherId: dto.teacherId,
        teacherName,
        jenisSupervisi: dto.jenisSupervisi || 'kurikulum_merdeka',
        date: new Date(dto.date),
        time: dto.time || '08:00',
        className: dto.className || 'X 1',
        subjectName: dto.subjectName || 'Pendidikan Agama Islam',
        supervisorName,
        status: dto.status || 'TERJADWAL',
        notes: dto.notes || null,
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // 7. Ambil Semua Jadwal Supervisi
  async findAllJadwal(params?: { teacherId?: string; status?: string }) {
    const where: any = {};
    if (params?.teacherId && params.teacherId !== 'ALL') where.teacherId = params.teacherId;
    if (params?.status && params.status !== 'ALL') where.status = params.status;

    return this.prisma.jadwalSupervisi.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  // 8. Hapus Jadwal Supervisi
  async removeJadwal(id: string) {
    await this.prisma.jadwalSupervisi.delete({ where: { id } });
    return { message: 'Jadwal supervisi berhasil dihapus.' };
  }

  // =========================================================================
  // 9. MASTER DATA RUBRIK & INSTRUMEN SUPERVISI (EDITABLE OLEH SEMUA WAKA)
  // =========================================================================

  private getDefaultRubrikItems(jenisId: string) {
    if (
      jenisId.includes('kinerja_') ||
      jenisId.includes('bendahara') ||
      jenisId.includes('keamanan') ||
      jenisId.includes('kebersihan') ||
      jenisId.includes('dapur') ||
      jenisId.includes('jaga_malam') ||
      jenisId.includes('koperasi') ||
      jenisId.includes('uks')
    ) {
      return [
        { kategori: 'A. Kedisiplinan & Integritas Kerja (Bobot 30%)', code: 't1', label: 'Ketepatan waktu kehadiran & kepatuhan jam kerja resmi', bobot: 10, orderIndex: 1 },
        { kategori: 'A. Kedisiplinan & Integritas Kerja (Bobot 30%)', code: 't2', label: 'Tanggung jawab penyelesaian tupoksi kerja harian', bobot: 10, orderIndex: 2 },
        { kategori: 'A. Kedisiplinan & Integritas Kerja (Bobot 30%)', code: 't3', label: 'Penerapan etika, integritas, dan nilai Al-Islam Kemuhammadiyahan', bobot: 10, orderIndex: 3 },
        { kategori: 'B. Kualitas Hasil & Layanan Kerja (Bobot 40%)', code: 't4', label: 'Kecepatan dan ketepatan penyelesaian tugas administrasi/layanan', bobot: 15, orderIndex: 4 },
        { kategori: 'B. Kualitas Hasil & Layanan Kerja (Bobot 40%)', code: 't5', label: 'Kerapian dokumentasi, arsip, dan laporan pertanggungjawaban', bobot: 15, orderIndex: 5 },
        { kategori: 'B. Kualitas Hasil & Layanan Kerja (Bobot 40%)', code: 't6', label: 'Keramahan dan kualitas pelayanan kepada civitas sekolah & tamu', bobot: 10, orderIndex: 6 },
        { kategori: 'C. Inisiatif & Kerjasama Tim (Bobot 30%)', code: 't7', label: 'Kemampuan komunikasi dan kerjasama antar unit kerja', bobot: 15, orderIndex: 7 },
        { kategori: 'C. Inisiatif & Kerjasama Tim (Bobot 30%)', code: 't8', label: 'Inisiatif perbaikan, perawatan fasilitas, dan tanggap situasi darurat', bobot: 15, orderIndex: 8 },
      ];
    }

    if (jenisId === 'pembinaan_guru_bk') {
      return [
        { kategori: 'A. Perencanaan Program BK (Bobot 25%)', code: 'bk1', label: 'Kelengkapan Program Tahunan & Semester Layanan BK', bobot: 10, orderIndex: 1 },
        { kategori: 'A. Perencanaan Program BK (Bobot 25%)', code: 'bk2', label: 'Asesmen kebutuhan & sosiometri peserta didik', bobot: 15, orderIndex: 2 },
        { kategori: 'B. Pelaksanaan Layanan BK (Bobot 50%)', code: 'bk3', label: 'Layanan Bimbingan Klasikal & Kelompok', bobot: 15, orderIndex: 3 },
        { kategori: 'B. Pelaksanaan Layanan BK (Bobot 50%)', code: 'bk4', label: 'Layanan Konseling Individual & Pendampingan Kasus', bobot: 20, orderIndex: 4 },
        { kategori: 'B. Pelaksanaan Layanan BK (Bobot 50%)', code: 'bk5', label: 'Kolaborasi dengan Orang Tua / Wali Murid & Guru Wali Kelas', bobot: 15, orderIndex: 5 },
        { kategori: 'C. Evaluasi & Tindak Lanjut (Bobot 25%)', code: 'bk6', label: 'Pencatatan Buku Kasus & Rekam Bimbingan Siswa', bobot: 15, orderIndex: 6 },
        { kategori: 'C. Evaluasi & Tindak Lanjut (Bobot 25%)', code: 'bk7', label: 'Tindak lanjut konferensi kasus & home visit', bobot: 10, orderIndex: 7 },
      ];
    }

    // Default: Kurikulum Merdeka & Perangkat Pembelajaran (30 Indikator Standar)
    return [
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_1', label: 'UU Sisdiknas (No 20 th 2003)', bobot: 4, orderIndex: 1 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_2', label: 'SNP (PP 19 2005 / PP 32 2013 / PP 13 2015)', bobot: 4, orderIndex: 2 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_3', label: 'SKL (Permendikbud 20 2016 / Standar Kelulusan)', bobot: 4, orderIndex: 3 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_4', label: 'Standar Isi (Permendikbud 21 th 2016)', bobot: 4, orderIndex: 4 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_5', label: 'KI & KD / Capaian Pembelajaran (CP)', bobot: 4, orderIndex: 5 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_6', label: 'Standar Proses (Permendikbud 22 2016)', bobot: 4, orderIndex: 6 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_7', label: 'Standar Penilaian (Permendikbud 24 2016)', bobot: 4, orderIndex: 7 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_8', label: 'Pedoman Menyusun RPP / Modul Ajar', bobot: 4, orderIndex: 8 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_9', label: 'Pedoman Pembelajaran', bobot: 4, orderIndex: 9 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_10', label: 'Pedoman Penilaian & Asesmen Kurikulum', bobot: 4, orderIndex: 10 },
      { kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL', code: 'item_11', label: 'KOSP / KTSP (Visi, Misi, Tujuan Sekolah)', bobot: 4, orderIndex: 11 },

      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_12', label: 'Kalender Pendidikan', bobot: 4, orderIndex: 12 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_13', label: 'Analisis Minggu & Jam Efektif', bobot: 4, orderIndex: 13 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_14', label: 'Silabus / Alur Tujuan Pembelajaran (ATP)', bobot: 4, orderIndex: 14 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_15', label: 'RPP / Modul Ajar (Jumlah Keterpenuhan)', bobot: 4, orderIndex: 15 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_16', label: 'Program Tahunan (Prota)', bobot: 4, orderIndex: 16 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_17', label: 'Program Semester (Promes)', bobot: 4, orderIndex: 17 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_18', label: 'Jadwal Mengajar', bobot: 4, orderIndex: 18 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_19', label: 'Daftar Buku Pegangan Guru', bobot: 4, orderIndex: 19 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_20', label: 'Daftar Buku Pegangan Siswa', bobot: 4, orderIndex: 20 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_21', label: 'Agenda Guru / Jurnal Mengajar', bobot: 4, orderIndex: 21 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_22', label: 'Daftar Hadir Siswa', bobot: 4, orderIndex: 22 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_23', label: 'Jurnal Sikap Siswa', bobot: 4, orderIndex: 23 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_24', label: 'Daftar Rekap Nilai Sikap', bobot: 4, orderIndex: 24 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_25', label: 'Daftar Nilai Pengetahuan / Formatif', bobot: 4, orderIndex: 25 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_26', label: 'Daftar Nilai Keterampilan / Sumatif', bobot: 4, orderIndex: 26 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_27', label: 'Analisis Ketuntasan Siswa', bobot: 4, orderIndex: 27 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_28', label: 'Analisis Ketuntasan Materi', bobot: 4, orderIndex: 28 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_29', label: 'Program Remedial & Pengayaan', bobot: 4, orderIndex: 29 },
      { kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN', code: 'item_30', label: 'Pelaksanaan Remedial & Pengayaan', bobot: 4, orderIndex: 30 },
    ];
  }

  async getRubrik(jenisId: string) {
    const targetJenis = jenisId || 'kurikulum_merdeka';
    let dbItems = await this.prisma.supervisiRubrik.findMany({
      where: { jenisId: targetJenis, isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    // Jika belum ada di database untuk jenisId ini, inisialisasi dengan template standar
    if (dbItems.length === 0) {
      const defaultItems = this.getDefaultRubrikItems(targetJenis);
      await this.prisma.supervisiRubrik.createMany({
        data: defaultItems.map((item) => ({
          jenisId: targetJenis,
          kategori: item.kategori,
          code: item.code,
          label: item.label,
          bobot: item.bobot,
          orderIndex: item.orderIndex,
          isActive: true,
        })),
      });

      dbItems = await this.prisma.supervisiRubrik.findMany({
        where: { jenisId: targetJenis, isActive: true },
        orderBy: { orderIndex: 'asc' },
      });
    }

    // Kelompokkan item berdasarkan Kategori
    const categoryMap = new Map<string, any[]>();
    for (const item of dbItems) {
      if (!categoryMap.has(item.kategori)) {
        categoryMap.set(item.kategori, []);
      }
      categoryMap.get(item.kategori)?.push({
        id: item.code || item.id,
        dbId: item.id,
        label: item.label,
        bobot: item.bobot,
        orderIndex: item.orderIndex,
        kategori: item.kategori,
      });
    }

    const result = Array.from(categoryMap.entries()).map(([kategori, items]) => ({
      kategori,
      items,
    }));

    return {
      jenisId: targetJenis,
      categories: result,
      rawItems: dbItems,
    };
  }

  async createRubrikItem(
    dto: {
      jenisId: string;
      kategori: string;
      label: string;
      bobot?: number;
      orderIndex?: number;
    },
    user: any,
  ) {
    const count = await this.prisma.supervisiRubrik.count({
      where: { jenisId: dto.jenisId },
    });
    const code = `item_custom_${Date.now()}`;

    return this.prisma.supervisiRubrik.create({
      data: {
        jenisId: dto.jenisId,
        kategori: dto.kategori,
        code,
        label: dto.label,
        bobot: Number(dto.bobot) || 4,
        orderIndex: dto.orderIndex || count + 1,
        isActive: true,
        createdBy: user?.name || 'Waka/Pimpinan',
      },
    });
  }

  async updateRubrikItem(
    id: string,
    dto: {
      kategori?: string;
      label?: string;
      bobot?: number;
      orderIndex?: number;
      isActive?: boolean;
    },
    user: any,
  ) {
    return this.prisma.supervisiRubrik.update({
      where: { id },
      data: {
        ...dto,
        bobot: dto.bobot !== undefined ? Number(dto.bobot) : undefined,
        updatedBy: user?.name || 'Waka/Pimpinan',
      },
    });
  }

  async deleteRubrikItem(id: string) {
    await this.prisma.supervisiRubrik.delete({
      where: { id },
    });
    return { success: true, message: 'Indikator penilaian berhasil dihapus.' };
  }

  async resetRubrikDefault(jenisId: string, user: any) {
    const targetJenis = jenisId || 'kurikulum_merdeka';
    await this.prisma.supervisiRubrik.deleteMany({
      where: { jenisId: targetJenis },
    });
    return this.getRubrik(targetJenis);
  }

  /**
   * Mengambil seluruh Guru dan Staf Pegawai (Tendik/TU/Kepegawaian) sebagai sasaran supervisi
   */
  async getSupervisiTargets() {
    // 1. Ambil semua profil guru eksisting
    const existingProfiles = await this.prisma.teacherProfile.findMany({
      include: {
        user: true,
      },
    });

    // 2. Ambil user staf / tendik / pegawai / guru yang belum memiliki TeacherProfile
    const existingUserIds = new Set(existingProfiles.map((p) => p.userId));
    const nonStudentUsers = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['SISWA', 'WALI_MURID'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        nipNbm: true,
        phone: true,
      },
    });

    // Buat profil otomatis jika ada staf pegawai yang belum memiliki teacherProfile
    for (const u of nonStudentUsers) {
      if (!existingUserIds.has(u.id)) {
        try {
          const created = await this.prisma.teacherProfile.create({
            data: {
              userId: u.id,
              nip: u.nipNbm || null,
              phone: u.phone || null,
            },
            include: { user: true },
          });
          existingProfiles.push(created);
        } catch (_) {
          // Abaikan jika sudah terbuat bersamaan
        }
      }
    }

    // Urutkan alfabetis nama
    return existingProfiles.sort((a, b) => {
      const nameA = a.user?.name || '';
      const nameB = b.user?.name || '';
      return nameA.localeCompare(nameB);
    });
  }
}

