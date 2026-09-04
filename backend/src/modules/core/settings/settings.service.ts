import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes } from 'crypto';
import * as os from 'os';
import * as net from 'net';
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
      select: {
        address: true,
        schoolName: true,
        serverLocation: true,
        timezone: true,
      } as any,
    });
    const location =
      (settings as any)?.serverLocation ||
      (settings as any)?.address ||
      'Ponorogo, Jawa Timur';
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
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

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
      totalIbadahSiswa,
      pendingDispensasiCount,
      pendingDisposisiCount,
      pendingSuratKeluarCount,
      totalSuratMasuk,
      totalSuratKeluar,
    ] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.teacherProfile.count(),
      this.prisma.user.count({
        where: {
          role: { notIn: ['SISWA', 'WALI_MURID'] },
        },
      }),
      this.prisma.parentProfile.count(),
      this.prisma.class.count(),
      this.prisma.subject.count(),
      this.prisma.attendance.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        select: { status: true },
      }),
      this.prisma.dailyAttendance.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        select: { status: true },
      }),
      this.prisma.izinKeluar.count({
        where: { status: 'MENUNGGU' },
      }),
      this.prisma.paymentProof.count({
        where: { status: 'MENUNGGU_VERIFIKASI' },
      }),
      this.prisma.tagihan.findMany({
        select: {
          type: true,
          amount: true,
          amountPaid: true,
          status: true,
        },
      }),
      this.prisma.pengeluaran.findMany({
        select: {
          category: true,
          amount: true,
        },
      }),
      this.prisma.danaBantuan.findMany({
        select: {
          kategori: true,
          nominal: true,
          status: true,
        },
      }),
      this.prisma.announcement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } },
      }),
      this.prisma.systemLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.groupBy({
        by: ['classId'],
        _count: { id: true },
      }),
      this.prisma.class.findMany({
        select: { id: true, name: true, gradeLevel: true },
      }),
      this.prisma.student.groupBy({
        by: ['gender'],
        _count: { id: true },
      }),
      this.prisma.student.groupBy({
        by: ['program'],
        _count: { id: true },
      }),
      this.prisma.student.groupBy({
        by: ['jalurPendaftaran'],
        _count: { id: true },
      }),
      this.prisma.student.groupBy({
        by: ['gelombang'],
        _count: { id: true },
      }),
      this.prisma.teachingJournal.count(),
      this.prisma.homeroomJournal.count(),
      this.prisma.schedule.count(),
      this.prisma.characterAssessment.count(),
      this.prisma.characterAssessment.count({
        where: { OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }] },
      }),
      this.prisma.characterAssessment.count({
        where: {
          OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }],
        },
      }),
      this.prisma.characterAssessment.count({
        where: { category: 'IBADAH' },
      }),
      this.prisma.izinKeluar.count({
        where: {
          status: 'MENUNGGU',
          OR: [
            { alasan: { contains: '[IZIN DISPENSASI]' } },
            { alasan: { contains: '[DISPENSASI' } },
            { alasan: { contains: '[IZIN KEGIATAN]' } },
          ],
        },
      }),
      this.prisma.suratDisposisi.count({
        where: {
          OR: [
            { statusEsign: 'MENUNGGU_VERIFIKASI' },
            { statusEsign: 'MENUNGGU' },
          ],
        },
      }),
      this.prisma.suratKeluar.count({
        where: {
          OR: [
            { status: 'MENUNGGU_TTD' },
            { status: 'DRAF' },
          ],
        },
      }),
      this.prisma.suratMasuk.count(),
      this.prisma.suratKeluar.count(),
    ]);

    // Presensi Siswa Hari Ini
    const studentHadir = todayStudentAttendance.filter(
      (a) => a.status === 'HADIR',
    ).length;
    const studentSakit = todayStudentAttendance.filter(
      (a) => a.status === 'SAKIT',
    ).length;
    const studentIzin = todayStudentAttendance.filter(
      (a) => a.status === 'IZIN',
    ).length;
    const studentAlpha = todayStudentAttendance.filter(
      (a) => a.status === 'ALPHA' || a.status === 'ALPA',
    ).length;
    const studentAttendancePct =
      totalSiswa > 0
        ? Math.min(100, Math.round((studentHadir / totalSiswa) * 100))
        : 0;

    // Presensi Pegawai & Guru Hari Ini
    const staffHadir = todayStaffAttendance.filter(
      (a) => a.status === 'HADIR',
    ).length;
    const staffAttendancePct =
      totalPegawai > 0
        ? Math.min(100, Math.round((staffHadir / totalPegawai) * 100))
        : 0;

    // Ringkasan Keuangan
    let totalTagihanKotor = 0;
    let totalPemasukanLunas = 0;
    let totalPiutangSiswa = 0;
    const tagihanByType: Record<
      string,
      { total: number; lunas: number; sisa: number }
    > = {};

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
      pengeluaranByCategory[p.category] =
        (pengeluaranByCategory[p.category] || 0) + p.amount;
    });

    const totalDanaBantuan = allDanaBantuans
      .filter((d) => d.status === 'DISETUJUI')
      .reduce((sum, d) => sum + d.nominal, 0);

    const saldoKasSekolah = totalPemasukanLunas - totalPengeluaran;

    // Komposisi Siswa per Kelas
    const classMap = new Map(classesList.map((c) => [c.id, c.name]));
    const studentDistribution = studentsByClass
      .map((s) => ({
        classId: s.classId,
        className: classMap.get(s.classId) || 'Tanpa Kelas',
        count: s._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    // Kepatuhan Tata Tertib Realtime: Persentase siswa tanpa catatan pelanggaran aktif
    const distinctPelanggarCount = await this.prisma.characterAssessment.groupBy({
      by: ['studentId'],
      where: {
        OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }],
      },
      _count: { studentId: true },
    }).then((res) => res.length).catch(() => 0);

    const kepatuhanTatibPct =
      totalSiswa > 0
        ? Math.max(0, Math.min(100, Math.round(((totalSiswa - distinctPelanggarCount) / totalSiswa) * 1000) / 10))
        : 100;

    // Agregasi Kurva Tren Mingguan (7 Hari Terakhir) Presensi, Keuangan, Karakter & Akademik
    const weeklyTrends: any[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startD = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
        0,
      );
      const endD = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
        999,
      );

      const dayOfWeek = startD.getDay();
      const dayLabel = `${dayNames[dayOfWeek]} (${startD.getDate()}/${startD.getMonth() + 1})`;

      // Ambil presensi, keuangan, pengeluaran, jadwal, dan catatan karakter pada hari d
      const [
        dayAtt,
        dayStaffAtt,
        dayPayments,
        dayExpenses,
        daySchedulesCount,
        dayJournalsCount,
        dayPrestasi,
        dayPelanggaran,
      ] = await Promise.all([
        this.prisma.attendance.count({
          where: { date: { gte: startD, lte: endD }, status: 'HADIR' },
        }),
        this.prisma.dailyAttendance.count({
          where: { date: { gte: startD, lte: endD }, status: 'HADIR' },
        }),
        this.prisma.tagihan.findMany({
          where: {
            updatedAt: { gte: startD, lte: endD },
            status: { in: ['LUNAS', 'ANGSURAN'] },
          },
          select: { amountPaid: true, amount: true, status: true },
        }),
        this.prisma.pengeluaran.findMany({
          where: {
            date: { gte: startD, lte: endD },
          },
          select: { amount: true },
        }),
        this.prisma.schedule.count({
          where: { dayOfWeek: dayOfWeek },
        }),
        this.prisma.teachingJournal.count({
          where: {
            date: { gte: startD, lte: endD },
          },
        }),
        this.prisma.characterAssessment.count({
          where: {
            createdAt: { gte: startD, lte: endD },
            OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }],
          },
        }),
        this.prisma.characterAssessment.count({
          where: {
            createdAt: { gte: startD, lte: endD },
            OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }],
          },
        }),
      ]);

      const pctSiswa =
        totalSiswa > 0
          ? Math.min(100, Math.round((dayAtt / totalSiswa) * 100))
          : 0;
      const pctStaff =
        totalPegawai > 0
          ? Math.min(100, Math.round((dayStaffAtt / totalPegawai) * 100))
          : 0;
      const nominalPemasukan = dayPayments.reduce(
        (sum, p) =>
          sum + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0)),
        0,
      );
      const nominalPengeluaran = dayExpenses.reduce(
        (sum, p) => sum + (p.amount || 0),
        0,
      );

      weeklyTrends.push({
        date: dayLabel,
        dayOfWeek,
        siswaHadir: dayAtt,
        siswaPct: pctSiswa,
        staffHadir: dayStaffAtt,
        staffPct: pctStaff,
        pemasukan: nominalPemasukan,
        pengeluaran: nominalPengeluaran,
        jadwalCount: daySchedulesCount,
        jurnalCount: dayJournalsCount,
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
        pendingDispensasiCount,
        pendingDisposisiCount,
        pendingSuratKeluarCount,
        totalSuratMasuk,
        totalSuratKeluar,
      },
      persuratan: {
        pendingDispensasi: pendingDispensasiCount,
        pendingDisposisi: pendingDisposisiCount,
        pendingSuratKeluar: pendingSuratKeluarCount,
        totalSuratMasuk,
        totalSuratKeluar,
      },
      karakterTatib: {
        totalAssessments: totalKarakterAssessments,
        totalPelanggaran: totalPelanggaranSiswa,
        totalPrestasi: totalPrestasiSiswa,
        totalIbadah: totalIbadahSiswa,
        kepatuhanPct: kepatuhanTatibPct,
      },
      demografis: {
        gender: studentsGender.map((g) => ({
          name: g.gender || 'Tidak Terdata',
          count: g._count.id,
        })),
        program: studentsProgram.map((p) => ({
          name: p.program || 'Reguler',
          count: p._count.id,
        })),
        jalur: studentsJalur.map((j) => ({
          name: j.jalurPendaftaran || 'Mandiri',
          count: j._count.id,
        })),
        gelombang: studentsGelombang.map((g) => ({
          name: g.gelombang || 'Gelombang 1',
          count: g._count.id,
        })),
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
        },
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

  private checkTcpPort(
    port: number,
    host: string = '127.0.0.1',
    timeoutMs: number = 300,
  ): Promise<{ status: string; latencyMs: number }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const start = Date.now();
      let isResolved = false;

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        const latency = Date.now() - start;
        isResolved = true;
        socket.destroy();
        resolve({ status: 'ONLINE', latencyMs: latency });
      });

      socket.on('timeout', () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve({ status: 'OFFLINE', latencyMs: timeoutMs });
        }
      });

      socket.on('error', () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve({ status: 'OFFLINE', latencyMs: Date.now() - start });
        }
      });

      socket.connect(port, host);
    });
  }

  async getSystemSupervisorMetrics(clientIp?: string, host?: string) {
    const startTime = Date.now();
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'DEGRADED';
      dbLatencyMs = 999;
    }

    // Hitung Uptime & Downtime
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeHuman = `${days > 0 ? `${days}h ` : ''}${hours > 0 ? `${hours}j ` : ''}${minutes}m ${seconds}d`;

    // Metrik Memori & Beban CPU
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedSystemMem = totalMem - freeMem;
    const sysMemPercent = Math.round((usedSystemMem / totalMem) * 100);
    const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Generic CPU';
    const loadAvg = os.loadavg();

    // Query Pengguna Terkoneksi & Sesi Terakhir (Recent connected users)
    const [
      activeSessionsCount,
      lastActiveSessions,
      lastSystemLogs,
      userCount,
      settings,
    ] = await Promise.all([
      this.prisma.userSession.count({
        where: { isActive: true },
      }),
      this.prisma.userSession.findMany({
        take: 50,
        orderBy: { lastActiveAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              subRole: true,
            },
          },
        },
      }),
      this.prisma.systemLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          message: true,
          category: true,
          level: true,
          userName: true,
          userRole: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
      this.prisma.setting.findFirst({
        select: {
          schoolName: true,
          serverLocation: true,
          timezone: true,
        } as any,
      }),
    ]);

    const lastUser = lastActiveSessions[0];
    const internalLatencyMs = Date.now() - startTime;

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 menit kalibrasi window akses pengguna aktif
    const nowTime = Date.now();

    // Mengelompokkan sesi berdasarkan userId unik (1 Baris = 1 Pengguna Unik)
    const userSessionMap = new Map<string, any>();

    for (const s of lastActiveSessions) {
      const uId = s.userId;
      const lastActiveMs = s.lastActiveAt
        ? new Date(s.lastActiveAt).getTime()
        : 0;
      const isLiveOnline =
        s.isActive && nowTime - lastActiveMs <= ONLINE_THRESHOLD_MS;

      const sessionDetail = {
        id: s.id,
        device: s.device || 'Desktop / Browser',
        browser: s.browser || 'Web Browser',
        os: s.os || 'OS',
        ipAddress: s.ipAddress || '127.0.0.1',
        lastActiveAt: s.lastActiveAt,
        isActive: s.isActive,
        isLiveOnline,
      };

      if (!userSessionMap.has(uId)) {
        userSessionMap.set(uId, {
          userId: uId,
          primarySessionId: s.id,
          name: s.user?.name || s.user?.username || 'Pengguna',
          username: s.user?.username,
          role: s.user?.role,
          subRole: s.user?.subRole,
          device: s.device || 'Desktop / Browser',
          browser: s.browser || 'Web Browser',
          os: s.os || 'OS',
          ipAddress: s.ipAddress || '127.0.0.1',
          lastActiveAt: s.lastActiveAt,
          isActive: s.isActive,
          isLiveOnline,
          totalActiveDevices: isLiveOnline ? 1 : 0,
          sessions: [sessionDetail],
        });
      } else {
        const existing = userSessionMap.get(uId);
        existing.sessions.push(sessionDetail);
        if (isLiveOnline) {
          existing.isLiveOnline = true;
          existing.totalActiveDevices += 1;
        }
        if (s.isActive) {
          existing.isActive = true;
        }
      }
    }

    const uniqueUserSessions = Array.from(userSessionMap.values()).slice(0, 6);
    const realLiveOnlineCount = Array.from(userSessionMap.values()).filter(
      (u) => u.isLiveOnline,
    ).length;

    // Perhitungan Cerdas Kemampuan Beban Sistem (Load Capacity) & Estimasi Kapasitas Hardware Tersisa
    const freeMemMb = Math.round(freeMem / 1024 / 1024);
    const totalMemMb = Math.round(totalMem / 1024 / 1024);
    const availableMemPercent = 100 - sysMemPercent;

    // Kalibrasi akses serentak digitalisasi sekolah (presensi, pembelajaran, data transaksi)
    const safeMemThresholdMb = Math.max(0, Math.round(freeMemMb * 0.75));
    const estimatedConcurrentCapacity = Math.max(
      50,
      Math.floor((safeMemThresholdMb / 2.0) * (cpuCount >= 4 ? 1.25 : 1.0)),
    );
    const currentLoadRatio = Math.min(
      100,
      Math.round(
        (realLiveOnlineCount / Math.max(1, estimatedConcurrentCapacity)) * 100,
      ),
    );

    // Rekomendasi Mode Ruang Tunggu (Waiting Room Advisory)
    let waitingRoomStatus = 'STANDBY'; // STANDBY | RECOMMENDED | CRITICAL
    let waitingRoomAdvice =
      'Beban server normal. Kapasitas sangat siap menampung akses serentak digitalisasi sekolah.';
    let shouldActivateWaitingRoom = false;

    if (sysMemPercent >= 88 || currentLoadRatio >= 85 || dbLatencyMs > 400) {
      waitingRoomStatus = 'CRITICAL';
      waitingRoomAdvice =
        'Beban hardware mencapai batas kritis! Sangat disarankan menyalakan Mode Ruang Tunggu untuk menjaga stabilitas akses serentak.';
      shouldActivateWaitingRoom = true;
    } else if (
      sysMemPercent >= 75 ||
      currentLoadRatio >= 70 ||
      dbLatencyMs > 150
    ) {
      waitingRoomStatus = 'RECOMMENDED';
      waitingRoomAdvice =
        'Trafik akses pengguna serentak sedang meningkat mendekati batas aman. Pertimbangkan aktifkan Mode Ruang Tunggu.';
      shouldActivateWaitingRoom = true;
    }

    // Pengujian TCP Socket Nyata untuk 4 Port Layanan SIMASMUH
    const [port3000, port51212, port54322] = await Promise.all([
      this.checkTcpPort(3000),
      this.checkTcpPort(51212),
      this.checkTcpPort(54322),
    ]);

    return {
      runtime: {
        serverTimestamp: Date.now(),
        serverTimeIso: new Date().toISOString(),
        uptimeSeconds,
        uptimeHuman,
        downtimeEstimated: '0.00% (SLA 99.99%)',
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        hostname: os.hostname(),
        serverLocation:
          (settings as any)?.serverLocation || 'Ponorogo, Jawa Timur',
        timezone: (settings as any)?.timezone || 'Asia/Jakarta',
        clientIp: clientIp || '127.0.0.1',
        serverHost: host || os.hostname() || 'localhost:3001',
      },
      performance: {
        dbStatus,
        dbLatencyMs,
        apiLatencyMs: internalLatencyMs,
        heapUsedMb,
        heapTotalMb,
        rssMb,
        systemMemoryUsagePercent: sysMemPercent,
        availableMemoryPercent: availableMemPercent,
        totalSystemMemoryGb: +(totalMem / 1024 / 1024 / 1024).toFixed(1),
        freeSystemMemoryGb: +(freeMem / 1024 / 1024 / 1024).toFixed(1),
        freeSystemMemoryMb: freeMemMb,
        cpuCount,
        cpuModel,
        loadAverage: loadAvg,
        loadCapacity: {
          estimatedMaxUsers: estimatedConcurrentCapacity,
          activeUsers: realLiveOnlineCount,
          currentLoadPercent: currentLoadRatio,
          remainingHeadroomPercent: Math.max(0, 100 - currentLoadRatio),
          waitingRoomStatus,
          waitingRoomAdvice,
          shouldActivateWaitingRoom,
          hardwareRemaining: {
            freeRamGb: +(freeMem / 1024 / 1024 / 1024).toFixed(1),
            cpuCores: cpuCount,
            healthyThresholdPercent: 85,
          },
        },
      },
      taskManager: {
        totalRegisteredUsers: userCount,
        activeConnectedSessions: realLiveOnlineCount,
        services: [
          {
            name: 'Frontend Next.js Web',
            port: 3000,
            status: port3000.status,
            latencyMs: port3000.latencyMs,
          },
          {
            name: 'Backend API NestJS',
            port: 3001,
            status: 'ONLINE',
            latencyMs: internalLatencyMs,
          },
          {
            name: 'Prisma Studio ORM',
            port: 51212,
            status: port51212.status,
            latencyMs: port51212.latencyMs,
          },
          {
            name: 'PostgreSQL DB / Supabase',
            port: 54322,
            status: dbStatus === 'HEALTHY' ? 'ONLINE' : port54322.status,
            latencyMs: dbLatencyMs,
          },
        ],
        lastActiveSessions: uniqueUserSessions,
        lastUserConnected: lastUser
          ? {
              name:
                lastUser.user?.name || lastUser.user?.username || 'Pengguna',
              role: lastUser.user?.role,
              subRole: lastUser.user?.subRole,
              device: lastUser.device || 'Browser Client',
              ipAddress: lastUser.ipAddress || '127.0.0.1',
              connectedAt: lastUser.lastActiveAt,
            }
          : null,
        recentActivityLogs: lastSystemLogs,
      },
    };
  }
}
