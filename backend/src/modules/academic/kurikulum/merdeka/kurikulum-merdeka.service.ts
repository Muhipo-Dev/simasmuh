import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocxGeneratorService } from '../common/docx-generator.service';
import {
  CreatePerangkatKurikulumDto,
  CloneParallelDto,
  CreateTujuanPembelajaranDto,
  UpdateTujuanPembelajaranDto,
  SavePromesMatrixDto,
  GeneratePerangkatDocDto,
  BatchInputNilaiTPDto,
} from './dto/kurikulum-merdeka.dto';

@Injectable()
export class KurikulumMerdekaService {
  private readonly logger = new Logger(KurikulumMerdekaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docxGenerator: DocxGeneratorService,
  ) {}

  /**
   * Ambil setting tahun ajaran & semester aktif sekolah
   */
  async getActiveSchoolSetting() {
    const setting = await this.prisma.setting.findFirst();
    return {
      academicYear: setting?.academicYear || '2025/2026',
      semester: (setting?.semester || 'Ganjil').toUpperCase().includes('GENAP') ? 'GENAP' : 'GANJIL',
      schoolName: setting?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO',
      address: setting?.address || 'Jl. Budi Utomo No. 10, Ponorogo, Jawa Timur',
      phone: setting?.phone || '(0352) 481521',
      email: setting?.email || 'smamuhipo@gmail.com',
      principalName: setting?.principalName || 'Sugeng Riadi, M.Pd.',
      principalNip: setting?.principalNip || '197105122005011005',
    };
  }

  /**
   * Helper: Dapatkan profil guru dari user login
   */
  async getTeacherProfile(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        teacherSubjects: { include: { subject: true } },
        schedules: { include: { class: true, subject: true } },
      },
    });
    if (!profile) {
      throw new ForbiddenException('Akses hanya untuk guru terdaftar di sistem');
    }
    return profile;
  }

  /**
   * 1. Ambil Data Konteks Penugasan Guru (Kelas, Mapel, dan Setup Perangkat yang Ada)
   */
  async getGuruContext(user: any) {
    const teacher = await this.getTeacherProfile(user.id);
    const setting = await this.getActiveSchoolSetting();

    // Kumpulkan kelas unik dari jadwal mengajar guru
    const classMap = new Map<string, any>();
    const subjectMap = new Map<string, any>();

    for (const s of teacher.schedules) {
      if (s.class) classMap.set(s.class.id, s.class);
      if (s.subject) subjectMap.set(s.subject.id, s.subject);
    }

    // Tambahkan subject dari TeacherSubject
    for (const ts of teacher.teacherSubjects) {
      if (ts.subject) subjectMap.set(ts.subject.id, ts.subject);
    }

    // Ambil daftar perangkat kurikulum yang sudah dibuat guru ini
    const perangkatList = await this.prisma.perangkatKurikulum.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: true,
        subject: true,
        tujuanPembelajarans: { orderBy: { orderIndex: 'asc' } },
        dokumenItems: true,
        _count: {
          select: {
            tujuanPembelajarans: true,
            promesAllocations: true,
            dokumenItems: true,
            nilaiSiswaTps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      teacher: {
        id: teacher.id,
        name: teacher.user.name,
        nip: teacher.nip || teacher.user.nipNbm || '-',
      },
      setting,
      assignedClasses: Array.from(classMap.values()),
      assignedSubjects: Array.from(subjectMap.values()),
      perangkatList,
    };
  }

  /**
   * 2. Buat Setup Perangkat Kurikulum Baru
   */
  async createPerangkat(dto: CreatePerangkatKurikulumDto, user: any) {
    const teacher = await this.getTeacherProfile(user.id);
    const setting = await this.getActiveSchoolSetting();

    const academicYear = dto.academicYear || setting.academicYear;
    const semester = dto.semester || setting.semester;

    // Cek apakah sudah ada untuk kombinasi ini
    const existing = await this.prisma.perangkatKurikulum.findUnique({
      where: {
        teacherId_classId_subjectId_academicYear_semester: {
          teacherId: teacher.id,
          classId: dto.classId,
          subjectId: dto.subjectId,
          academicYear,
          semester,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.perangkatKurikulum.create({
      data: {
        teacherId: teacher.id,
        classId: dto.classId,
        subjectId: dto.subjectId,
        academicYear,
        semester,
        fase: dto.fase || 'FASE_E',
        totalJpSemester: dto.totalJpSemester || 36,
        jpPerMinggu: dto.jpPerMinggu || 2,
        mingguEfektifCount: dto.mingguEfektifCount || 18,
      },
      include: { class: true, subject: true },
    });
  }

  /**
   * 3. Ambil Detail Setup Perangkat Kurikulum Lengkap
   */
  async getPerangkatDetail(id: string) {
    const perangkat = await this.prisma.perangkatKurikulum.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
        subject: true,
        teacher: { include: { user: true } },
        tujuanPembelajarans: {
          orderBy: { orderIndex: 'asc' },
          include: {
            promesAllocations: true,
            dokumenItems: true,
          },
        },
        promesAllocations: {
          orderBy: [{ mingguAbsolut: 'asc' }],
        },
        dokumenItems: true,
        nilaiSiswaTps: true,
      },
    });

    if (!perangkat) {
      throw new NotFoundException('Data perangkat kurikulum tidak ditemukan');
    }

    return perangkat;
  }

  /**
   * 4. Sinkronisasi / Cloning Rombel Paralel (Single-Input -> Multi-Rombel)
   */
  async cloneParallel(dto: CloneParallelDto, user: any) {
    const teacher = await this.getTeacherProfile(user.id);
    const source = await this.prisma.perangkatKurikulum.findUnique({
      where: { id: dto.sourcePerangkatId },
      include: {
        tujuanPembelajarans: true,
        promesAllocations: true,
        dokumenItems: true,
      },
    });

    if (!source) {
      throw new NotFoundException('Data sumber perangkat ajar tidak ditemukan');
    }

    const createdList: any[] = [];

    for (const targetClassId of dto.targetClassIds) {
      if (targetClassId === source.classId) continue;

      // Upsert target PerangkatKurikulum
      const targetPerangkat = await this.prisma.perangkatKurikulum.upsert({
        where: {
          teacherId_classId_subjectId_academicYear_semester: {
            teacherId: teacher.id,
            classId: targetClassId,
            subjectId: source.subjectId,
            academicYear: source.academicYear,
            semester: source.semester,
          },
        },
        create: {
          teacherId: teacher.id,
          classId: targetClassId,
          subjectId: source.subjectId,
          academicYear: source.academicYear,
          semester: source.semester,
          fase: source.fase,
          totalJpSemester: source.totalJpSemester,
          jpPerMinggu: source.jpPerMinggu,
          mingguEfektifCount: source.mingguEfektifCount,
          statusSupervisi: source.statusSupervisi,
        },
        update: {
          fase: source.fase,
          totalJpSemester: source.totalJpSemester,
          jpPerMinggu: source.jpPerMinggu,
          mingguEfektifCount: source.mingguEfektifCount,
        },
      });

      // Bersihkan child lama di target rombel untuk menjamin replikasi sinkron 100%
      await this.prisma.promesAllocation.deleteMany({
        where: { perangkatKurikulumId: targetPerangkat.id },
      });
      await this.prisma.perangkatAjarItem.deleteMany({
        where: { perangkatKurikulumId: targetPerangkat.id },
      });
      await this.prisma.tujuanPembelajaran.deleteMany({
        where: { perangkatKurikulumId: targetPerangkat.id },
      });

      // Salin Tujuan Pembelajaran dan simpan map ID lama -> baru
      const tpMap = new Map<string, string>();

      for (const tp of source.tujuanPembelajarans) {
        const newTp = await this.prisma.tujuanPembelajaran.create({
          data: {
            perangkatKurikulumId: targetPerangkat.id,
            cpId: tp.cpId,
            kodeTp: tp.kodeTp,
            orderIndex: tp.orderIndex,
            lingkupMateri: tp.lingkupMateri,
            materiPokok: tp.materiPokok,
            deskripsiTp: tp.deskripsiTp,
            alokasiJp: tp.alokasiJp,
            dimensiProfilPancasila: tp.dimensiProfilPancasila,
          },
        });
        tpMap.set(tp.id, newTp.id);
      }

      // Salin Alokasi Promes
      for (const pa of source.promesAllocations) {
        const newTpId = tpMap.get(pa.tpId);
        if (newTpId) {
          await this.prisma.promesAllocation.create({
            data: {
              perangkatKurikulumId: targetPerangkat.id,
              tpId: newTpId,
              bulanIndex: pa.bulanIndex,
              namaBulan: pa.namaBulan,
              mingguKe: pa.mingguKe,
              mingguAbsolut: pa.mingguAbsolut,
              alokasiJp: pa.alokasiJp,
              keterangan: pa.keterangan,
            },
          });
        }
      }

      // Salin Dokumen Generator
      for (const doc of source.dokumenItems) {
        const newTpId = doc.tpId ? tpMap.get(doc.tpId) || null : null;
        await this.prisma.perangkatAjarItem.create({
          data: {
            perangkatKurikulumId: targetPerangkat.id,
            tpId: newTpId,
            kategori: doc.kategori,
            judul: doc.judul,
            kontenJson: (doc.kontenJson as any) || undefined,
            fileDocxUrl: doc.fileDocxUrl,
            statusDraft: doc.statusDraft,
          },
        });
      }

      createdList.push(targetPerangkat);
    }

    return {
      message: `Berhasil menduplikasi administrasi kurikulum ke ${createdList.length} rombel paralel`,
      clonedCount: createdList.length,
      cloned: createdList,
    };
  }

  /**
   * 5. Manajemen CP (Capaian Pembelajaran)
   */
  async getCapaianPembelajaran(fase?: string, subjectName?: string) {
    const where: any = { isActive: true };
    if (fase && fase !== 'ALL') where.fase = fase;
    if (subjectName && subjectName !== 'ALL') {
      where.subjectName = { contains: subjectName, mode: 'insensitive' };
    }

    return this.prisma.capaianPembelajaran.findMany({
      where,
      orderBy: [{ subjectName: 'asc' }, { gradeLevel: 'asc' }],
    });
  }

  /**
   * 6. CRUD Tujuan Pembelajaran (TP & ATP)
   */
  async createTujuanPembelajaran(dto: CreateTujuanPembelajaranDto) {
    return this.prisma.tujuanPembelajaran.create({
      data: {
        perangkatKurikulumId: dto.perangkatKurikulumId,
        cpId: dto.cpId || null,
        kodeTp: dto.kodeTp,
        orderIndex: dto.orderIndex || 1,
        lingkupMateri: dto.lingkupMateri,
        materiPokok: dto.materiPokok,
        deskripsiTp: dto.deskripsiTp,
        alokasiJp: dto.alokasiJp || 4,
        dimensiProfilPancasila: dto.dimensiProfilPancasila || null,
      },
    });
  }

  async updateTujuanPembelajaran(id: string, dto: UpdateTujuanPembelajaranDto) {
    return this.prisma.tujuanPembelajaran.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTujuanPembelajaran(id: string) {
    return this.prisma.tujuanPembelajaran.delete({
      where: { id },
    });
  }

  /**
   * 7. Simpan Matriks Program Semester (Promes)
   */
  async savePromesMatrix(dto: SavePromesMatrixDto) {
    // Hapus alokasi lama untuk perangkat ini
    await this.prisma.promesAllocation.deleteMany({
      where: { perangkatKurikulumId: dto.perangkatKurikulumId },
    });

    if (dto.allocations && dto.allocations.length > 0) {
      await this.prisma.promesAllocation.createMany({
        data: dto.allocations.map((a) => ({
          perangkatKurikulumId: dto.perangkatKurikulumId,
          tpId: a.tpId,
          bulanIndex: a.bulanIndex,
          namaBulan: a.namaBulan,
          mingguKe: a.mingguKe,
          mingguAbsolut: a.mingguAbsolut,
          alokasiJp: a.alokasiJp,
          keterangan: a.keterangan || 'KBM',
        })),
      });
    }

    return { message: 'Matriks Promes berhasil disimpan' };
  }

  /**
   * 8. Generator Dokumen Ajar & Asesmen Per TP (AI & Structured Template)
   */
  async generatePerangkatDoc(dto: GeneratePerangkatDocDto) {
    const perangkat = await this.getPerangkatDetail(dto.perangkatKurikulumId);
    const tp = dto.tpId
      ? await this.prisma.tujuanPembelajaran.findUnique({ where: { id: dto.tpId } })
      : null;

    let generatedContent = dto.kontenJson;

    // Jika belum ada konten JSON, buatkan draf terstruktur otomatis berdasarkan data TP & Mapel
    if (!generatedContent && tp) {
      generatedContent = this.createStructuredTemplateContent(dto.kategori, tp, perangkat);
    }

    return this.prisma.perangkatAjarItem.create({
      data: {
        perangkatKurikulumId: dto.perangkatKurikulumId,
        tpId: dto.tpId || null,
        kategori: dto.kategori,
        judul: dto.judul,
        kontenJson: generatedContent || {},
        statusDraft: 'SIAP',
      },
    });
  }

  /**
   * Template cerdas pembuat draf materi, LKPD, dan soal asesmen otomatis
   */
  private createStructuredTemplateContent(kategori: string, tp: any, perangkat: any) {
    const mapel = perangkat.subject.name;
    const materi = tp.materiPokok || tp.lingkupMateri;

    if (kategori === 'MODUL_AJAR') {
      return {
        identitas: {
          sekolah: 'SMA MUHAMMADIYAH 1 PONOROGO',
          mataPelajaran: mapel,
          kelasFase: `${perangkat.class.name} / ${perangkat.fase}`,
          alokasiWaktu: `${tp.alokasiJp} Jam Pelajaran (JP)`,
        },
        tujuanPembelajaran: tp.deskripsiTp,
        profilPancasila: tp.dimensiProfilPancasila ? JSON.parse(tp.dimensiProfilPancasila) : ['Bernalar Kritis', 'Mandiri', 'Gotong Royong'],
        saranaPrasarana: ['Laptop/Komputer', 'LCD Proyektor', 'Jaringan Internet', 'LMS SIMASMUH', 'Buku Paket Digital'],
        targetPesertaDidik: 'Peserta didik reguler / tipikal umum',
        modelPembelajaran: 'Problem Based Learning (PBL) / Discovery Learning terintegrasi SIMASMUH',
        kegiatanPembelajaran: {
          pendahuluan: [
            'Guru membuka pembelajaran dengan salam, doa bersama, dan pembacaan Tadarus Al-Qur`an.',
            'Guru memeriksa kehadiran peserta didik melalui Tab Presensi SIMASMUH.',
            'Apersepsi: Guru mengaitkan materi pertemuan ini dengan fenomena kehidupan nyata atau materi sebelumnya.',
            'Guru menyampaikan Tujuan Pembelajaran (TP) serta alur kegiatan yang akan dilakukan.',
          ],
          inti: [
            `Orientasi Masalah: Guru menyajikan studi kasus / permasalahan terkait topik "${materi}".`,
            'Organisasi Belajar: Peserta didik dibagi ke dalam kelompok heterogen untuk mendiskusikan pemecahan masalah.',
            'Penyelidikan: Peserta didik mengumpulkan informasi, melakukan kajian literatur dan mengeksplorasi modul ajar.',
            'Pengembangan Hasil: Setiap kelompok menyusun laporan mini / presentasi solusi menggunakan LKPD.',
            'Evaluasi: Guru bersama peserta didik menganalisis dan mengevaluasi proses pemecahan masalah yang dipresentasikan.',
          ],
          penutup: [
            'Guru memfasilitasi peserta didik untuk menyimpulkan poin-poin utama materi pembelajaran.',
            'Refleksi: Peserta didik menyampaikan hal yang sudah dipahami dan hal yang masih perlu diperdalam.',
            'Tindak Lanjut: Guru memberikan tugas mandiri dan menyampaikan topik pembelajaran untuk pertemuan berikutnya.',
            'Guru menutup pembelajaran dengan doa penutup majelis dan salam.',
          ],
        },
        asesmen: {
          diagnostik: 'Kuis apersepsi di awal pembelajaran',
          formatif: 'Observasi keaktifan diskusi kelompok dan pengerjaan LKPD',
          sumatif: 'Tes tertulis / penilaian harian butir TP',
        },
      };
    }

    if (kategori === 'LKPD') {
      return {
        judulLkpd: `LEMBAR KERJA PESERTA DIDIK (LKPD) - ${materi.toUpperCase()}`,
        petunjukBelajar: [
          'Bacalah setiap instruksi soal dan materi pengantar dengan seksama.',
          'Bekerjalah secara kolaboratif dalam kelompok yang telah dibagikan.',
          'Gunakan referensi buku atau internet secara bijak untuk melengkapi data analisis.',
        ],
        kegiatan1: `Analisis Konseptual: Jelaskan pengertian, karakteristik, dan fungsi utama dari konsep ${materi}.`,
        kegiatan2: `Studi Kasus & Pemecahan Masalah: Diberikan skenario implementasi ${materi} di lingkungan sekolah / masyarakat, tentukan solusi terbaik secara sistematis.`,
        kesimpulan: 'Tuliskan kesimpulan menyeluruh hasil penyelidikan kelompok Anda pada kolom yang disediakan.',
      };
    }

    if (['SOAL_HARIAN', 'ASESMEN_SUMATIF', 'SOAL_STS', 'SOAL_SAS'].includes(kategori)) {
      return {
        jenisUjian: kategori.replace('_', ' '),
        kisiKisi: [
          { nomor: 1, indikator: `Mengidentifikasi konsep dasar ${materi}`, levelKognitif: 'C2 (Memahami)', bentukSoal: 'Pilihan Ganda' },
          { nomor: 2, indikator: `Menganalisis penerapan prinsip ${materi} dalam studi kasus`, levelKognitif: 'C4 (Menganalisis)', bentukSoal: 'Pilihan Ganda' },
          { nomor: 3, indikator: `Memecahkan permasalahan komputasi/praktik seputar ${materi}`, levelKognitif: 'C3 (Menerapkan)', bentukSoal: 'Uraian' },
        ],
        soalPilihanGanda: [
          {
            no: 1,
            pertanyaan: `Pernyataan berikut yang paling tepat mengenai konsep dasar dari ${materi} adalah...`,
            opsi: ['A. Implementasi yang berfokus pada hasil akhir tanpa tahapan', 'B. Kerangka sistematis yang memudahkan pemecahan masalah secara terstruktur', 'C. Konsep teoritis yang tidak memiliki penerapan praktis', 'D. Proses otomatis tanpa memerlukan penalaran analitis'],
            kunci: 'B',
            pembahasan: `Konsep ${materi} menekankan pada proses pemecahan masalah yang terstruktur dan analitis.`,
          },
          {
            no: 2,
            pertanyaan: `Salah satu keunggulan utama dalam penerapan ${materi} pada efisiensi kerja adalah...`,
            opsi: ['A. Mengurangi kebutuhan verifikasi data', 'B. Mempersingkat waktu pemrosesan dan meminimalkan galat', 'C. Menghilangkan keterlibatan pengguna dalam sistem', 'D. Mengabaikan dokumentasi teknis'],
            kunci: 'B',
            pembahasan: `Penerapan ${materi} secara efektif meminimalkan redundansi dan mempercepat kinerja.`,
          },
        ],
        soalUraian: [
          {
            no: 1,
            pertanyaan: `Jelaskan secara komprehensif bagaimana tahapan evaluasi pada ${materi} dilakukan serta berikan contoh konkret penerapannya!`,
            kunciJawaban: `Tahapan evaluasi mencakup validasi kebutuhan, pengujian konsistensi, dan verifikasi luaran. Contoh penerapan: pada studi kasus simulasi KBM di sekolah.`,
            bobotNilai: 20,
          },
        ],
      };
    }

    return { catatan: `Draft dokumen untuk ${kategori} materi ${materi}` };
  }

  /**
   * 9. Ekspor Dokumen Word (.docx) Format Resmi Sekolah
   */
  async exportDocumentDocx(perangkatKurikulumId: string, kategori: string, tpId?: string) {
    const perangkat = await this.getPerangkatDetail(perangkatKurikulumId);
    const setting = await this.getActiveSchoolSetting();

    const kopData = {
      schoolName: setting.schoolName,
      address: setting.address,
      phone: setting.phone,
      email: setting.email,
      principalName: setting.principalName,
      principalNip: setting.principalNip,
    };

    const meta = {
      guruName: perangkat.teacher.user.name,
      nip: perangkat.teacher.nip || perangkat.teacher.user.nipNbm || '-',
      mataPelajaran: perangkat.subject.name,
      kelas: perangkat.class.name,
      fase: perangkat.fase,
      tahunAjaran: perangkat.academicYear,
      semester: perangkat.semester,
    };

    let title = `${kategori.replace(/_/g, ' ')}`;
    let subtitle = `Mata Pelajaran ${perangkat.subject.name} - Kelas ${perangkat.class.name}`;
    const sections: any[] = [];

    if (kategori === 'ATP') {
      title = 'ALUR TUJUAN PEMBELAJARAN (ATP)';
      subtitle = `Fase ${perangkat.fase} - Tahun Pelajaran ${perangkat.academicYear}`;
      
      const tableHeaders = ['No', 'Kode TP', 'Lingkup Materi', 'Tujuan Pembelajaran', 'Alokasi JP'];
      const tableRows = perangkat.tujuanPembelajarans.map((tp, idx) => [
        (idx + 1).toString(),
        tp.kodeTp,
        tp.lingkupMateri,
        tp.deskripsiTp,
        `${tp.alokasiJp} JP`,
      ]);

      sections.push({
        heading: 'I. RASIONAL & CAPAIAN PEMBELAJARAN',
        content: `Alur Tujuan Pembelajaran ini disusun secara berkesinambungan mengacu pada Capaian Pembelajaran Kurikulum Merdeka untuk mengembangkan kompetensi peserta didik secara utuh sesuai Profil Pelajar Pancasila.`,
      });

      sections.push({
        heading: 'II. MATRIKS ALUR TUJUAN PEMBELAJARAN (ATP)',
        table: {
          headers: tableHeaders,
          rows: tableRows,
        },
      });
    } else if (kategori === 'PROMES') {
      title = 'PROGRAM SEMESTER (PROMES)';
      subtitle = `Semester ${perangkat.semester} - Tahun Pelajaran ${perangkat.academicYear}`;

      const headers = ['No', 'Kode TP', 'Tujuan Pembelajaran', 'Alokasi JP', 'Bulan / Minggu Efektif KBM'];
      const rows = perangkat.tujuanPembelajarans.map((tp, idx) => {
        const weeks = tp.promesAllocations.map((a) => `${a.namaBulan} M-${a.mingguKe} (${a.alokasiJp} JP)`).join(', ');
        return [
          (idx + 1).toString(),
          tp.kodeTp,
          tp.deskripsiTp,
          `${tp.alokasiJp} JP`,
          weeks || 'Belum diplot',
        ];
      });

      sections.push({
        heading: 'I. DISTRIBUSI ALOKASI WAKTU SEMESTER',
        bulletPoints: [
          `Total Alokasi Semester: ${perangkat.totalJpSemester} Jam Pelajaran (JP)`,
          `Alokasi Tatap Muka: ${perangkat.jpPerMinggu} JP / Minggu`,
          `Jumlah Minggu Efektif: ${perangkat.mingguEfektifCount} Minggu`,
        ],
      });

      sections.push({
        heading: 'II. MATRIKS DISTRIBUSI TUJUAN PEMBELAJARAN (PROMES)',
        table: { headers, rows },
      });
    } else if (kategori === 'PROTA') {
      title = 'PROGRAM TAHUNAN (PROTA)';
      subtitle = `Tahun Pelajaran ${perangkat.academicYear}`;

      const headers = ['No', 'Semester', 'Kode TP', 'Lingkup Materi', 'Alokasi Waktu'];
      const rows = perangkat.tujuanPembelajarans.map((tp, idx) => [
        (idx + 1).toString(),
        perangkat.semester,
        tp.kodeTp,
        tp.lingkupMateri,
        `${tp.alokasiJp} JP`,
      ]);

      sections.push({
        heading: 'I. DISTRIBUSI MATERI DAN ALOKASI WAKTU TAHUNAN',
        table: { headers, rows },
      });
    } else {
      // Modul Ajar / LKPD / Soal
      const docItem = await this.prisma.perangkatAjarItem.findFirst({
        where: {
          perangkatKurikulumId,
          kategori,
          ...(tpId ? { tpId } : {}),
        },
      });

      const tp = tpId ? perangkat.tujuanPembelajarans.find((t) => t.id === tpId) : null;
      title = docItem?.judul || `${kategori.replace(/_/g, ' ')} ${tp?.materiPokok || ''}`;

      sections.push({
        heading: 'A. TUJUAN PEMBELAJARAN & INDIKATOR CAPAIAN',
        content: tp?.deskripsiTp || 'Mengembangkan pemahaman konseptual dan keterampilan operasional peserta didik.',
        bulletPoints: [
          `Lingkup Materi: ${tp?.lingkupMateri || '-'}`,
          `Alokasi Waktu: ${tp?.alokasiJp || 4} JP`,
          `Profil Pelajar Pancasila: Bernalar Kritis, Mandiri, Berakhlak Mulia`,
        ],
      });

      sections.push({
        heading: 'B. URAIAN KEGIATAN & INSTRUMEN PEMBELAJARAN',
        content: `Pelaksanaan pembelajaran menggunakan model Problem Based Learning berorientasi keterlibatan aktif peserta didik di kelas dengan memanfaatkan fasilitas LMS SIMASMUH.`,
      });
    }

    return this.docxGenerator.createDocxDocument({
      title,
      subtitle,
      kopData,
      meta,
      sections,
    });
  }

  /**
   * 10. Paket Siap Supervisi: Unduh 1 Bundel ZIP Lengkap
   */
  async exportSupervisiZip(perangkatKurikulumId: string) {
    const perangkat = await this.getPerangkatDetail(perangkatKurikulumId);

    const categories = ['ATP', 'PROTA', 'PROMES', 'MODUL_AJAR', 'LKPD', 'ASESMEN_SUMATIF'];
    const zipFiles: { name: string; content: Buffer }[] = [];

    for (const cat of categories) {
      try {
        const buffer = await this.exportDocumentDocx(perangkatKurikulumId, cat);
        const fileName = `${cat}_${perangkat.class.name.replace(/\s+/g, '_')}_${perangkat.subject.name.replace(/\s+/g, '_')}.docx`;
        zipFiles.push({ name: fileName, content: buffer });
      } catch (e: any) {
        this.logger.warn(`Gagal membuat file ${cat}: ${e.message}`);
      }
    }

    // Update status perangkat menjadi SIAP / DIAJUKAN
    await this.prisma.perangkatKurikulum.update({
      where: { id: perangkatKurikulumId },
      data: { statusSupervisi: 'SIAP' },
    });

    return this.docxGenerator.createZipArchive(zipFiles);
  }

  /**
   * 11. Penilaian Harian Real-Time Per Butir TP
   */
  async batchInputNilaiTP(dto: BatchInputNilaiTPDto) {
    const results: any[] = [];

    for (const item of dto.items) {
      const record = await this.prisma.nilaiSiswaTP.upsert({
        where: {
          perangkatKurikulumId_studentId_tpId: {
            perangkatKurikulumId: dto.perangkatKurikulumId,
            studentId: item.studentId,
            tpId: dto.tpId,
          },
        },
        create: {
          perangkatKurikulumId: dto.perangkatKurikulumId,
          studentId: item.studentId,
          tpId: dto.tpId,
          nilaiFormatif: item.nilaiFormatif !== undefined ? Number(item.nilaiFormatif) : null,
          nilaiSumatif: item.nilaiSumatif !== undefined ? Number(item.nilaiSumatif) : null,
          catatanProgres: item.catatanProgres || null,
        },
        update: {
          ...(item.nilaiFormatif !== undefined ? { nilaiFormatif: Number(item.nilaiFormatif) } : {}),
          ...(item.nilaiSumatif !== undefined ? { nilaiSumatif: Number(item.nilaiSumatif) } : {}),
          ...(item.catatanProgres !== undefined ? { catatanProgres: item.catatanProgres } : {}),
        },
      });
      results.push(record);
    }

    // Trigger auto kalkulasi deskripsi e-rapor untuk kelas & mapel ini
    await this.syncToStudentAssessment(dto.perangkatKurikulumId);

    return {
      message: `Berhasil menyimpan nilai untuk ${results.length} siswa`,
      updatedCount: results.length,
    };
  }

  /**
   * 12. Generator Otomatis Deskripsi Rapor Berdasarkan TP Tertinggi & Terendah
   */
  async syncToStudentAssessment(perangkatKurikulumId: string) {
    const perangkat = await this.getPerangkatDetail(perangkatKurikulumId);
    const semesterInt = perangkat.semester === 'GENAP' ? 2 : 1;

    // Ambil seluruh siswa di kelas ini
    const students = perangkat.class.students;

    for (const student of students) {
      // Ambil seluruh nilai TP siswa ini pada perangkat kurikulum
      const nilaiTps = await this.prisma.nilaiSiswaTP.findMany({
        where: {
          perangkatKurikulumId,
          studentId: student.id,
        },
        include: { tujuanPembelajaran: true },
      });

      if (nilaiTps.length === 0) continue;

      // Cari nilai tertinggi dan terendah
      let maxTp = nilaiTps[0];
      let minTp = nilaiTps[0];
      let totalSumatif = 0;
      let countSumatif = 0;

      for (const n of nilaiTps) {
        const val = n.nilaiSumatif ?? n.nilaiFormatif ?? 0;
        const maxVal = maxTp.nilaiSumatif ?? maxTp.nilaiFormatif ?? 0;
        const minVal = minTp.nilaiSumatif ?? minTp.nilaiFormatif ?? 0;

        if (val > maxVal) maxTp = n;
        if (val < minVal) minTp = n;

        if (val > 0) {
          totalSumatif += val;
          countSumatif++;
        }
      }

      const avgSumatif = countSumatif > 0 ? Math.round((totalSumatif / countSumatif) * 10) / 10 : 0;

      // Susun Deskripsi Rapor Otomatis
      let deskripsiRapor = '';
      if (maxTp && (maxTp.nilaiSumatif || maxTp.nilaiFormatif)) {
        deskripsiRapor += `Menunjukkan penguasaan yang sangat baik dalam ${maxTp.tujuanPembelajaran.deskripsiTp}. `;
      }
      if (minTp && minTp.id !== maxTp?.id && (minTp.nilaiSumatif || minTp.nilaiFormatif) && (minTp.nilaiSumatif || 0) < 75) {
        deskripsiRapor += `Perlu peningkatan dan pendampingan lebih lanjut dalam ${minTp.tujuanPembelajaran.deskripsiTp}.`;
      }

      // Upsert ke StudentAssessment resmi SIMASMUH (integrasi e-rapor)
      await this.prisma.studentAssessment.upsert({
        where: {
          studentId_subjectId_academicYear_semester: {
            studentId: student.id,
            subjectId: perangkat.subjectId,
            academicYear: perangkat.academicYear,
            semester: semesterInt,
          },
        },
        create: {
          studentId: student.id,
          classId: perangkat.classId,
          subjectId: perangkat.subjectId,
          teacherId: perangkat.teacherId,
          academicYear: perangkat.academicYear,
          semester: semesterInt,
          sumatifLmAvg: avgSumatif,
          finalScore: avgSumatif,
          raporCapaianKompetensi: deskripsiRapor,
        },
        update: {
          classId: perangkat.classId,
          teacherId: perangkat.teacherId,
          sumatifLmAvg: avgSumatif,
          finalScore: avgSumatif,
          raporCapaianKompetensi: deskripsiRapor,
        },
      });
    }
  }

  /**
   * 13. Tampilan Harian Kelas: Presensi, Jurnal Mengajar & Nilai TP
   */
  async getDailyClassView(scheduleId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
        subject: true,
        teacher: { include: { user: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Jadwal kelas tidak ditemukan');
    }

    // Ambil presensi hari ini
    const attendances = await this.prisma.attendance.findMany({
      where: {
        scheduleId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Ambil jurnal mengajar hari ini
    const journal = await this.prisma.teachingJournal.findFirst({
      where: {
        scheduleId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { tujuanPembelajaran: true },
    });

    // Ambil perangkat kurikulum aktif untuk kelas & mapel ini
    const perangkat = await this.prisma.perangkatKurikulum.findFirst({
      where: {
        classId: schedule.classId,
        subjectId: schedule.subjectId,
      },
      include: {
        tujuanPembelajarans: { orderBy: { orderIndex: 'asc' } },
        nilaiSiswaTps: true,
      },
    });

    return {
      schedule,
      perangkat,
      journal,
      attendances,
      students: schedule.class.students,
    };
  }
}
