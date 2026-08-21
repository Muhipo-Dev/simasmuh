import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getServerTimeInfo } from '../utils/timezone.util';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getServerTime(): Promise<any> {
    const settings = await this.prisma.setting.findFirst({
      select: { address: true, schoolName: true, serverLocation: true, timezone: true } as any,
    });
    const location = (settings as any)?.serverLocation || (settings as any)?.address || 'Ponorogo, Jawa Timur';
    const tz = (settings as any)?.timezone || 'Asia/Jakarta';
    return getServerTimeInfo(location, tz);
  }

  async getTimeSync(clientTime?: number): Promise<any> {
    const serverReceivedAt = Date.now();
    const serverTimeInfo = await this.getServerTime();
    const serverSentAt = Date.now();

    return {
      ...serverTimeInfo,
      clientSentAt: clientTime || null,
      serverReceivedAt,
      serverSentAt,
    };
  }

  async getSettings(): Promise<any> {
    const cacheKey = 'app_settings_full';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const settings = await this.prisma.setting.findFirst();
    if (!settings) {
      const created = await this.prisma.setting.create({
        data: {
          schoolName: 'SMA Muhammadiyah 1 Ponorogo',
          address: 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur',
          phone: '(0352) 481428',
          email: 'info@smamuh1ponorogo.sch.id',
          principalName: 'Drs. H. Sugeng, M.Pd.',
          academicYear: '2026/2027',
          semester: 'Ganjil',
          bankName: 'Bank Syariah Indonesia (BSI)',
          bankNumber: '7123456789',
          bankOwner: 'SMA MUHAMMADIYAH 1 PONOROGO',
          defaultDpp: 1500000,
          defaultUka: 500000,
          defaultUks: 100000,
          defaultInfaq: 300000,
          defaultSeragam: 2000000,
          whatsappSenderNumber: '088293733330',
          helpdeskPhone: '088293733330',
        } as any,
      });
      await this.cacheManager.set(cacheKey, created, 60000); // 60s cache
      return created;
    }
    await this.cacheManager.set(cacheKey, settings, 60000);
    return settings;
  }

  async getPublicSettings(): Promise<any> {
    const cacheKey = 'app_settings_public';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const settings = await this.prisma.setting.findFirst({
      select: {
        schoolName: true,
        address: true,
        phone: true,
        email: true,
        academicYear: true,
        semester: true,
        logoUrl: true,
        backgroundUrl: true,
        timezone: true,
        serverLocation: true,
        defaultDpp: true,
        defaultUka: true,
        defaultUks: true,
        defaultInfaq: true,
        defaultSeragam: true,
        helpdeskPhone: true,
      } as any,
    });
    if (!settings) {
      const defaultPublic = {
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
        address: 'Jl. Sultan Agung No. 83, Ponorogo, Jawa Timur',
        phone: '(0352) 481428',
        email: 'info@smamuh1ponorogo.sch.id',
        academicYear: '2026/2027',
        semester: 'Ganjil',
        logoUrl: null,
        backgroundUrl: null,
        timezone: 'Asia/Jakarta',
        serverLocation: 'Ponorogo, Jawa Timur',
        defaultDpp: 1500000,
        defaultUka: 500000,
        defaultUks: 100000,
        defaultInfaq: 300000,
        defaultSeragam: 2000000,
        helpdeskPhone: '088293733330',
      };
      await this.cacheManager.set(cacheKey, defaultPublic, 60000);
      return defaultPublic;
    }
    await this.cacheManager.set(cacheKey, settings, 60000);
    return settings;
  }

  async upsertSettings(data: any) {
    await this.cacheManager.del('app_settings_full');
    await this.cacheManager.del('app_settings_public');
    const settings = await this.prisma.setting.findFirst();
    if (settings) {
      return this.prisma.setting.update({
        where: { id: settings.id },
        data,
      });
    }
    return this.prisma.setting.create({
      data,
    });
  }

  async getStats() {
    const [teacherCount, studentCount, classCount] = await Promise.all([
      this.prisma.teacherProfile.count(),
      this.prisma.student.count(),
      this.prisma.class.count(),
    ]);

    return {
      teachers: teacherCount,
      students: studentCount,
      classes: classCount,
    };
  }

  async getExecutiveStatistics() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [
      totalSiswa,
      totalGuru,
      totalPegawai,
      totalWaliMurid,
      totalKelas,
      totalMapel,
      todayStudentAttendance,
      todayStaffAttendance,
      izinKeluarPending,
      unverifiedPaymentProofs,
      allTagihans,
      allPengeluarans,
      allDanaBantuans,
      recentAnnouncements,
      recentLogs,
      studentsByClass,
      classesList,
      studentsGender,
      studentsProgram,
      studentsJalur,
      studentsGelombang,
      totalJurnalMengajar,
      totalJurnalWaliKelas,
      totalJadwal,
      totalKarakterAssessments,
      totalPelanggaranSiswa,
      totalPrestasiSiswa,
      totalIbadahSiswa
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.teacherProfile.count(),
      this.prisma.user.count({
        where: {
          role: { notIn: ['SISWA', 'WALI_MURID', 'ORANG_TUA', 'PARENT'] }
        }
      }),
      this.prisma.parentProfile.count(),
      this.prisma.class.count(),
      this.prisma.subject.count(),
      this.prisma.attendance.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday }
        },
        select: { status: true }
      }),
      this.prisma.dailyAttendance.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday }
        },
        select: { status: true }
      }),
      this.prisma.izinKeluar.count({
        where: { status: 'MENUNGGU' }
      }),
      this.prisma.paymentProof.count({
        where: { status: 'MENUNGGU_VERIFIKASI' }
      }),
      this.prisma.tagihan.findMany({
        select: {
          type: true,
          amount: true,
          amountPaid: true,
          status: true,
        }
      }),
      this.prisma.pengeluaran.findMany({
        select: {
          category: true,
          amount: true,
        }
      }),
      this.prisma.danaBantuan.findMany({
        select: {
          kategori: true,
          nominal: true,
          status: true,
        }
      }),
      this.prisma.announcement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } }
      }),
      this.prisma.systemLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.student.groupBy({
        by: ['classId'],
        _count: { id: true }
      }),
      this.prisma.class.findMany({
        select: { id: true, name: true, gradeLevel: true }
      }),
      this.prisma.student.groupBy({
        by: ['gender'],
        _count: { id: true }
      }),
      this.prisma.student.groupBy({
        by: ['program'],
        _count: { id: true }
      }),
      this.prisma.student.groupBy({
        by: ['jalurPendaftaran'],
        _count: { id: true }
      }),
      this.prisma.student.groupBy({
        by: ['gelombang'],
        _count: { id: true }
      }),
      this.prisma.teachingJournal.count(),
      this.prisma.homeroomJournal.count(),
      this.prisma.schedule.count(),
      this.prisma.characterAssessment.count(),
      this.prisma.characterAssessment.count({
        where: { OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }] },
      }),
      this.prisma.characterAssessment.count({
        where: { OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }] },
      }),
      this.prisma.characterAssessment.count({
        where: { category: 'IBADAH' },
      }),
    ]);

    // Presensi Siswa Hari Ini
    const studentHadir = todayStudentAttendance.filter(a => a.status === 'HADIR').length;
    const studentSakit = todayStudentAttendance.filter(a => a.status === 'SAKIT').length;
    const studentIzin = todayStudentAttendance.filter(a => a.status === 'IZIN').length;
    const studentAlpha = todayStudentAttendance.filter(a => a.status === 'ALPHA' || a.status === 'ALPA').length;
    const studentAttendancePct = totalSiswa > 0 ? Math.min(100, Math.round((studentHadir / totalSiswa) * 100)) : 0;

    // Presensi Pegawai & Guru Hari Ini
    const staffHadir = todayStaffAttendance.filter(a => a.status === 'HADIR').length;
    const staffAttendancePct = totalPegawai > 0 ? Math.min(100, Math.round((staffHadir / totalPegawai) * 100)) : 0;

    // Ringkasan Keuangan
    let totalTagihanKotor = 0;
    let totalPemasukanLunas = 0;
    let totalPiutangSiswa = 0;
    const tagihanByType: Record<string, { total: number; lunas: number; sisa: number }> = {};

    allTagihans.forEach((t) => {
      totalTagihanKotor += t.amount;
      const lunasAmt = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0);
      totalPemasukanLunas += lunasAmt;
      const sisa = Math.max(0, t.amount - lunasAmt);
      totalPiutangSiswa += sisa;

      if (!tagihanByType[t.type]) {
        tagihanByType[t.type] = { total: 0, lunas: 0, sisa: 0 };
      }
      tagihanByType[t.type].total += t.amount;
      tagihanByType[t.type].lunas += lunasAmt;
      tagihanByType[t.type].sisa += sisa;
    });

    let totalPengeluaran = 0;
    const pengeluaranByCategory: Record<string, number> = {};
    allPengeluarans.forEach((p) => {
      totalPengeluaran += p.amount;
      pengeluaranByCategory[p.category] = (pengeluaranByCategory[p.category] || 0) + p.amount;
    });

    const totalDanaBantuan = allDanaBantuans
      .filter(d => d.status === 'DISETUJUI')
      .reduce((sum, d) => sum + d.nominal, 0);

    const saldoKasSekolah = totalPemasukanLunas - totalPengeluaran;

    // Komposisi Siswa per Kelas
    const classMap = new Map(classesList.map(c => [c.id, c.name]));
    const studentDistribution = studentsByClass.map(s => ({
      classId: s.classId,
      className: classMap.get(s.classId) || 'Tanpa Kelas',
      count: s._count.id,
    })).sort((a, b) => b.count - a.count);

    // Agregasi Kurva Tren Mingguan (7 Hari Terakhir) Presensi, Keuangan, Karakter & Demografi
    const weeklyTrends: any[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endD = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      
      const dayLabel = `${dayNames[startD.getDay()]} (${startD.getDate()}/${startD.getMonth() + 1})`;
      
      // Ambil presensi, keuangan, dan prestasi karakter pada hari d
      const [dayAtt, dayStaffAtt, dayPayments, dayPrestasi, dayPelanggaran] = await Promise.all([
        this.prisma.attendance.count({
          where: { date: { gte: startD, lte: endD }, status: 'HADIR' }
        }),
        this.prisma.dailyAttendance.count({
          where: { date: { gte: startD, lte: endD }, status: 'HADIR' }
        }),
        this.prisma.tagihan.findMany({
          where: { updatedAt: { gte: startD, lte: endD }, status: { in: ['LUNAS', 'ANGSURAN'] } },
          select: { amountPaid: true, amount: true, status: true }
        }),
        this.prisma.characterAssessment.count({
          where: { createdAt: { gte: startD, lte: endD }, OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }] }
        }),
        this.prisma.characterAssessment.count({
          where: { createdAt: { gte: startD, lte: endD }, OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }] }
        })
      ]);

      const pctSiswa = totalSiswa > 0 ? Math.min(100, Math.round((dayAtt / totalSiswa) * 100)) : 0;
      const pctStaff = totalPegawai > 0 ? Math.min(100, Math.round((dayStaffAtt / totalPegawai) * 100)) : 0;
      const nominalPemasukan = dayPayments.reduce((sum, p) => sum + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0)), 0);

      weeklyTrends.push({
        date: dayLabel,
        siswaHadir: dayAtt,
        siswaPct: pctSiswa,
        staffHadir: dayStaffAtt,
        staffPct: pctStaff,
        pemasukan: nominalPemasukan,
        prestasi: dayPrestasi,
        pelanggaran: dayPelanggaran,
      });
    }

    return {
      overview: {
        totalSiswa,
        totalGuru,
        totalPegawai,
        totalWaliMurid,
        totalKelas,
        totalMapel,
        totalJurnalMengajar,
        totalJurnalWaliKelas,
        totalJadwal,
        izinKeluarPending,
        unverifiedPaymentProofs,
        totalKarakterAssessments,
        totalPelanggaranSiswa,
        totalPrestasiSiswa,
        totalIbadahSiswa,
      },
      karakterTatib: {
        totalAssessments: totalKarakterAssessments,
        totalPelanggaran: totalPelanggaranSiswa,
        totalPrestasi: totalPrestasiSiswa,
        totalIbadah: totalIbadahSiswa,
      },
      demografis: {
        gender: studentsGender.map(g => ({ name: g.gender || 'Tidak Terdata', count: g._count.id })),
        program: studentsProgram.map(p => ({ name: p.program || 'Reguler', count: p._count.id })),
        jalur: studentsJalur.map(j => ({ name: j.jalurPendaftaran || 'Mandiri', count: j._count.id })),
        gelombang: studentsGelombang.map(g => ({ name: g.gelombang || 'Gelombang 1', count: g._count.id })),
      },
      presensi: {
        student: {
          totalSiswa,
          hadir: studentHadir,
          sakit: studentSakit,
          izin: studentIzin,
          alpha: studentAlpha,
          percentage: studentAttendancePct,
        },
        staff: {
          totalPegawai,
          hadir: staffHadir,
          percentage: staffAttendancePct,
        }
      },
      keuangan: {
        totalTagihanKotor,
        totalPemasukanLunas,
        totalPiutangSiswa,
        totalPengeluaran,
        totalDanaBantuan,
        saldoKasSekolah,
        tagihanByType,
        pengeluaranByCategory,
      },
      studentDistribution,
      weeklyTrends,
      recentAnnouncements,
      recentLogs,
    };
  }

  async getQrPublicToken() {
    let settings: any = await this.prisma.setting.findFirst();
    if (!settings) {
      settings = await this.getSettings();
    }
    if (!settings?.qrPublicToken) {
      const token = randomBytes(16).toString('hex');
      settings = await this.prisma.setting.update({
        where: { id: settings.id },
        data: { qrPublicToken: token },
      });
    }
    return { token: settings?.qrPublicToken || '' };
  }

  async regenerateQrPublicToken() {
    const settings = await this.getSettings();
    const token = randomBytes(16).toString('hex');
    const updated = await this.prisma.setting.update({
      where: { id: settings.id },
      data: { qrPublicToken: token },
    });
    return { token: updated.qrPublicToken };
  }

  async validateQrPublicToken(token: string) {
    const settings = await this.prisma.setting.findFirst();
    return { valid: settings?.qrPublicToken === token };
  }

  async getBankAccount() {
    const settings = await this.prisma.setting.findFirst({
      select: {
        bankName: true,
        bankNumber: true,
        bankOwner: true,
      },
    });
    if (!settings) {
      return { bankName: '', bankNumber: '', bankOwner: '' };
    }
    return {
      bankName: settings.bankName || '',
      bankNumber: settings.bankNumber || '',
      bankOwner: settings.bankOwner || '',
    };
  }

  async updateBankAccount(data: any) {
    const settings = await this.prisma.setting.findFirst();
    if (!settings) {
      return this.prisma.setting.create({
        data: {
          schoolName: data.schoolName || 'Nama Sekolah',
          address: data.address || 'Alamat Sekolah',
          bankName: data.bankName || '',
          bankNumber: data.bankNumber || '',
          bankOwner: data.bankOwner || '',
        },
      });
    }
    return this.prisma.setting.update({
      where: { id: settings.id },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.bankNumber !== undefined && { bankNumber: data.bankNumber }),
        ...(data.bankOwner !== undefined && { bankOwner: data.bankOwner }),
      },
    });
  }
}
