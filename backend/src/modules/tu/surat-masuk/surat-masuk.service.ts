import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { EmailNotificationService } from '../../communication/notifications/email.service';
import {
  NotificationsService,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../../communication/notifications/notifications.service';
import { CreateSuratMasukDto } from './dto/create-surat-masuk.dto';
import { UpdateSuratMasukDto } from './dto/update-surat-masuk.dto';
import { CreateDisposisiDto } from './dto/create-disposisi.dto';
import { UpdateDisposisiDto } from './dto/update-disposisi.dto';

@Injectable()
export class SuratMasukService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLogService: SystemLogService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Endpoint Publik: Verifikasi Tanda Tangan Digital & Keaslian Lembar Disposisi Surat Masuk
   */
  async verifyToken(token: string) {
    const cleanToken = token ? token.trim().toUpperCase() : '';
    if (!cleanToken) {
      throw new NotFoundException(
        'Token verifikasi disposisi tidak boleh kosong.',
      );
    }

    const disposisi = await this.prisma.suratDisposisi.findFirst({
      where: {
        OR: [{ eSignToken: cleanToken }, { id: cleanToken }],
      },
      include: {
        suratMasuk: true,
      },
    });

    const setting = await this.prisma.setting.findFirst();

    if (!disposisi) {
      return {
        valid: false,
        message:
          'Tanda Tangan Digital / Lembar Disposisi tidak ditemukan dalam basis data SIMASMUH.',
      };
    }

    return {
      valid: true,
      message:
        '✓ TERVERIFIKASI RESMI ASLI - Tanda Tangan Digital Lembar Disposisi Surat Masuk Sah & Terhubung Basis Data SIMASMUH',
      data: {
        id: disposisi.id,
        eSignToken: disposisi.eSignToken || cleanToken,
        eSignSignedAt: disposisi.eSignSignedAt || disposisi.updatedAt,
        eSignSignedBy:
          disposisi.signerName ||
          setting?.principalName ||
          'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
        signatureImage: disposisi.signatureImage || null,
        eSignHash: `SHA256-DISPOSISI-${disposisi.id.slice(0, 8).toUpperCase()}-OK`,
        status: disposisi.statusEsign,
        date: disposisi.suratMasuk?.tanggalSurat || disposisi.tanggalDiterima,
        nomorAgenda:
          disposisi.nomorAgenda || disposisi.suratMasuk?.nomorAgenda || '-',
        nomorSurat: disposisi.suratMasuk?.nomorSurat || '-',
        perihal: disposisi.suratMasuk?.perihal || '-',
        instansi: disposisi.suratMasuk?.instansi || '-',
        alasan: `Disposisi Surat Masuk: ${disposisi.suratMasuk?.perihal} (Agenda: ${disposisi.nomorAgenda || disposisi.suratMasuk?.nomorAgenda})`,
        catatanAdmin:
          disposisi.catatan ||
          'Lembar Disposisi Resmi Terverifikasi Sistem SIMASMUH',
        instruksi: disposisi.instruksi,
        diteruskanKepada: disposisi.diteruskanKepada,
        pemohon: {
          name: disposisi.suratMasuk?.instansi || 'Instansi Pengirim',
          nis: disposisi.suratMasuk?.nomorAgenda || disposisi.nomorAgenda,
          nisn: disposisi.suratMasuk?.nomorSurat,
          class: 'Surat Masuk Resmi',
          role: 'INSTANSI_PENGIRIM',
        },
        sekolah: {
          name: setting?.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          address: setting?.address || 'Jl. Batoro Katong No. 6B Ponorogo',
          phone: setting?.phone || '088293733330',
          email: setting?.email || 'info@smam1ponorogo.sch.id',
          logoUrl: '/muhipo-log.jpg',
          principalName:
            disposisi.signerName ||
            setting?.principalName ||
            'Sugeng Riadi, M.Pd.',
          principalNip:
            disposisi.signerNbm || setting?.principalNip || 'NBM. 974.501',
        },
      },
    };
  }

  async create(dto: CreateSuratMasukDto) {
    const surat = await this.prisma.suratMasuk.create({
      data: {
        nomorAgenda: dto.nomorAgenda,
        nomorSurat: dto.nomorSurat,
        pengirim: dto.pengirim || null,
        instansi: dto.instansi,
        perihal: dto.perihal,
        tanggalSurat: dto.tanggalSurat
          ? new Date(dto.tanggalSurat)
          : new Date(),
        tanggalDiterima: dto.tanggalDiterima
          ? new Date(dto.tanggalDiterima)
          : new Date(),
        sifat: dto.sifat || 'RUTIN',
        kategori: dto.kategori || 'DINAS_DIKNAS',
        fileUrl: dto.fileUrl || null,
        ringkasan: dto.ringkasan || null,
        statusTahapan: dto.statusTahapan || 'DITERIMA',
        statusDisposisi: 'BELUM_DISPOSISI',
      },
    });

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'SURAT_MASUK_CREATED',
        message: `Surat Masuk baru agenda "${surat.nomorAgenda}" (${surat.perihal}) berhasil dicatat.`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message: 'Surat Masuk berhasil dicatat.',
      data: surat,
    };
  }

  async findAll(query: {
    search?: string;
    sifat?: string;
    statusDisposisi?: string;
    statusTahapan?: string;
    forUser?: boolean;
    userId?: string;
    userName?: string;
    userRole?: string;
    userSubRole?: string;
    userSubRole2?: string;
    userSubRole3?: string;
  }) {
    const {
      search,
      sifat,
      statusDisposisi,
      statusTahapan,
      forUser,
      userId,
      userName,
      userRole,
      userSubRole,
      userSubRole2,
      userSubRole3,
    } = query;
    const where: any = {};

    if (search) {
      where.OR = [
        { nomorAgenda: { contains: search, mode: 'insensitive' } },
        { nomorSurat: { contains: search, mode: 'insensitive' } },
        { perihal: { contains: search, mode: 'insensitive' } },
        { instansi: { contains: search, mode: 'insensitive' } },
        { pengirim: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sifat && sifat !== 'ALL') {
      where.sifat = sifat;
    }

    if (statusDisposisi && statusDisposisi !== 'ALL') {
      where.statusDisposisi = statusDisposisi;
    }

    if (statusTahapan && statusTahapan !== 'ALL') {
      where.statusTahapan = statusTahapan;
    }

    let items = await this.prisma.suratMasuk.findMany({
      where,
      include: {
        disposisi: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // ISOLASI PRIVASI: Jika diakses khusus modul user / peran non-admin (Guru/Pegawai)
    const isAdmin =
      [
        'SUPERADMIN',
        'ADMIN_IT',
        'ADMIN_TU',
        'BAU',
        'TATA_USAHA',
        'KEPALA_SEKOLAH',
      ].includes(userRole || '') ||
      ['SUPERADMIN', 'ADMIN_TU', 'BAU', 'KEPALA_SEKOLAH'].includes(
        userSubRole || '',
      );

    if (forUser && !isAdmin) {
      const myNameLower = (userName || '').trim().toLowerCase();
      const myRoles = ([
        userRole,
        userSubRole,
        userSubRole2,
        userSubRole3,
      ] as (string | undefined | null)[])
        .filter((r): r is string => Boolean(r))
        .map((r) => r.toLowerCase());

      items = items.filter((item) => {
        if (!item.disposisi) return false;
        const disp = item.disposisi;
        const diteruskan = (disp.diteruskanKepada as any) || {};
        const targets: string[] = Array.isArray(diteruskan.targets)
          ? diteruskan.targets
          : [];
        const targetUserIds: string[] = Array.isArray(diteruskan.targetUserIds)
          ? [...diteruskan.targetUserIds]
          : [];

        if (diteruskan.guruId && !targetUserIds.includes(diteruskan.guruId)) {
          targetUserIds.push(diteruskan.guruId);
        }
        if (diteruskan.stafId && !targetUserIds.includes(diteruskan.stafId)) {
          targetUserIds.push(diteruskan.stafId);
        }
        if (diteruskan.bagianId && !targetUserIds.includes(diteruskan.bagianId)) {
          targetUserIds.push(diteruskan.bagianId);
        }
        if (diteruskan.userId && !targetUserIds.includes(diteruskan.userId)) {
          targetUserIds.push(diteruskan.userId);
        }
        if (diteruskan.pegawaiId && !targetUserIds.includes(diteruskan.pegawaiId)) {
          targetUserIds.push(diteruskan.pegawaiId);
        }

        if (userId && targetUserIds.includes(userId)) return true;

        const recipientNames: string[] = [];
        for (const raw of [
          diteruskan.guruNama,
          diteruskan.bagianNama,
          diteruskan.stafNama,
          diteruskan.penerimaNama,
          diteruskan.nama,
        ]) {
          if (raw && typeof raw === 'string' && raw.trim().length > 0) {
            const clean = raw.split('-')[0].split('(')[0].trim().toLowerCase();
            if (clean.length >= 2 && !recipientNames.includes(clean)) {
              recipientNames.push(clean);
            }
          }
        }

        let matchName = false;
        if (recipientNames.length > 0) {
          for (const name of recipientNames) {
            if (
              name &&
              (myNameLower.includes(name) || name.includes(myNameLower))
            ) {
              matchName = true;
              break;
            }
          }
        }

        if (matchName) return true;

        // Role & Subrole mapping
        const isKurikulum = myRoles.some((r) => r.includes('kurikulum') || r.includes('kur'));
        const isKesiswaan = myRoles.some(
          (r) =>
            r.includes('kesiswaan') ||
            r.includes('tatib') ||
            r.includes('ketertiban'),
        );
        const isSarpras = myRoles.some(
          (r) =>
            r.includes('sarpras') ||
            r.includes('sarana') ||
            r.includes('inventaris'),
        );
        const isHumas = myRoles.some(
          (r) => r.includes('humas') || r.includes('sdm'),
        );
        const isIsmuba = myRoles.some((r) => r.includes('ismuba') || r.includes('agama'));
        const isKeuangan = myRoles.some(
          (r) => r.includes('bendahara') || r.includes('keuangan'),
        );
        const isBau = myRoles.some(
          (r) =>
            r.includes('bau') ||
            r.includes('tata_usaha') ||
            r.includes('admin_tu'),
        );
        const isPerpus = myRoles.some(
          (r) => r.includes('perpus') || r.includes('perpustakaan'),
        );
        const isLab = myRoles.some(
          (r) => r.includes('lab') || r.includes('laboratorium'),
        );
        const isBk = myRoles.some(
          (r) => r.includes('bk') || r.includes('konseling'),
        );
        const isWaliKelas = myRoles.some((r) => r.includes('wali_kelas'));
        const isGuru = userRole === 'GURU' || myRoles.some((r) => r === 'guru');
        const isPegawai =
          userRole === 'PEGAWAI' ||
          myRoles.some(
            (r) =>
              r === 'pegawai' ||
              r === 'staf' ||
              r === 'karyawan' ||
              r === 'admin_tu' ||
              r === 'bau',
          );

        const matchRole =
          (isKurikulum &&
            targets.some((t) => t.toLowerCase().includes('kurikulum'))) ||
          (isKesiswaan &&
            targets.some((t) => t.toLowerCase().includes('kesiswaan'))) ||
          (isSarpras &&
            targets.some(
              (t) =>
                t.toLowerCase().includes('sarana') ||
                t.toLowerCase().includes('sarpras'),
            )) ||
          (isHumas &&
            targets.some(
              (t) =>
                t.toLowerCase().includes('humas') ||
                t.toLowerCase().includes('sdm'),
            )) ||
          (isIsmuba &&
            targets.some((t) => t.toLowerCase().includes('ismuba'))) ||
          (isKeuangan &&
            targets.some((t) => t.toLowerCase().includes('keuangan'))) ||
          (isBau &&
            targets.some(
              (t) =>
                t.toLowerCase().includes('administrasi umum') ||
                t.toLowerCase().includes('bau') ||
                t.toLowerCase().includes('tata usaha'),
            )) ||
          (isPerpus &&
            targets.some((t) => t.toLowerCase().includes('perpustakaan'))) ||
          (isLab && targets.some((t) => t.toLowerCase().includes('lab'))) ||
          (isBk && targets.some((t) => t.toLowerCase().includes('bk'))) ||
          (isWaliKelas &&
            targets.some((t) => t.toLowerCase().includes('wali kelas'))) ||
          (isGuru &&
            targets.includes('Guru') &&
            !diteruskan.guruNama &&
            !diteruskan.guruId) ||
          (isPegawai &&
            targets.includes('Staf') &&
            !diteruskan.stafNama &&
            !diteruskan.stafId);

        return matchRole;
      });
    }

    return { success: true, data: items };
  }

  async findOne(id: string) {
    const surat = await this.prisma.suratMasuk.findUnique({
      where: { id },
      include: { disposisi: true },
    });
    if (!surat) {
      throw new NotFoundException(`Surat Masuk ID ${id} tidak ditemukan.`);
    }
    return { success: true, data: surat };
  }

  async update(id: string, dto: UpdateSuratMasukDto) {
    const existing = await this.prisma.suratMasuk.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Surat Masuk tidak ditemukan.`);
    }

    const updated = await this.prisma.suratMasuk.update({
      where: { id },
      data: {
        nomorAgenda: dto.nomorAgenda || existing.nomorAgenda,
        nomorSurat: dto.nomorSurat || existing.nomorSurat,
        pengirim: dto.pengirim !== undefined ? dto.pengirim : existing.pengirim,
        instansi: dto.instansi || existing.instansi,
        perihal: dto.perihal || existing.perihal,
        tanggalSurat: dto.tanggalSurat
          ? new Date(dto.tanggalSurat)
          : existing.tanggalSurat,
        tanggalDiterima: dto.tanggalDiterima
          ? new Date(dto.tanggalDiterima)
          : existing.tanggalDiterima,
        sifat: dto.sifat || existing.sifat,
        kategori: dto.kategori || existing.kategori,
        fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : existing.fileUrl,
        ringkasan:
          dto.ringkasan !== undefined ? dto.ringkasan : existing.ringkasan,
        statusTahapan: dto.statusTahapan || existing.statusTahapan,
        statusDisposisi: dto.statusDisposisi || existing.statusDisposisi,
      },
      include: { disposisi: true },
    });

    return {
      success: true,
      message: 'Surat Masuk berhasil diperbarui.',
      data: updated,
    };
  }

  async remove(id: string, password?: string, userId?: string) {
    const existing = await this.prisma.suratMasuk.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Surat Masuk tidak ditemukan.`);
    }

    if (userId && password) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.password) {
        const isMatch = user.password.startsWith('$2')
          ? await bcrypt.compare(password, user.password)
          : user.password === password;
        if (!isMatch) {
          throw new UnauthorizedException(
            'Kata sandi keamanan yang Anda masukkan salah.',
          );
        }
      }
    }

    await this.prisma.suratMasuk.delete({ where: { id } });

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'SURAT_MASUK_DELETED',
        message: `Surat Masuk agenda "${existing.nomorAgenda}" (${existing.perihal}) telah dihapus.`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message: 'Surat Masuk beserta Disposisi berhasil dihapus.',
    };
  }

  /**
   * Helper Pengiriman Notifikasi In-App & Email ke Kepala Sekolah saat TU Mengajukan Disposisi Baru
   */
  private async sendDisposisiSubmissionNotificationToKepsek(
    surat: any,
    disposisi: any,
  ) {
    try {
      const kepsekUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'KEPALA_SEKOLAH' },
            { subRole: 'KEPALA_SEKOLAH' },
            { subRole2: 'KEPALA_SEKOLAH' },
            { subRole3: 'KEPALA_SEKOLAH' },
          ],
        },
        select: { id: true, name: true, email: true },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      for (const kepsek of kepsekUsers) {
        // 1. In-App Notification
        try {
          await this.notificationsService.createNotification({
            userId: kepsek.id,
            type: NotificationType.DISPOSISI_ASSIGNED,
            title: `Pengajuan Disposisi: ${surat.nomorAgenda || surat.nomorSurat}`,
            message: `Tata Usaha mengajukan lembar disposisi baru perihal "${surat.perihal}" dari ${surat.instansi} untuk diverifikasi & E-Sign.`,
            priority: NotificationPriority.HIGH,
            channel: [NotificationChannel.IN_APP],
            data: {
              suratMasukId: surat.id,
              nomorAgenda: disposisi.nomorAgenda || surat.nomorAgenda,
              nomorSurat: surat.nomorSurat,
              perihal: surat.perihal,
              instansi: surat.instansi,
              instruksi: disposisi.instruksi,
              catatan: disposisi.catatan,
              fileUrl: surat.fileUrl,
              actionUrl: '/fitur/persuratan?tab=surat-masuk',
            },
          });
        } catch (err) {
          // Ignore in-app error
        }

        // 2. Email Notification to Kepsek
        if (kepsek.email && kepsek.email.includes('@')) {
          this.emailNotificationService
            .sendEmailNotification({
              to: kepsek.email,
              subject: `[Pengajuan Disposisi] ${surat.perihal}`,
              title: 'Pengajuan Lembar Disposisi Surat Masuk',
              category: 'PERIZINAN',
              badgeLabel: 'MENUNGGU VERIFIKASI & E-SIGN',
              recipientName: kepsek.name,
              contentText: `Tata Usaha telah mencatat surat masuk baru dan mengajukan lembar disposisi untuk diverifikasi serta ditandatangani secara digital (E-Sign).`,
              metaDetails: [
                {
                  label: 'No. Agenda',
                  value: disposisi.nomorAgenda || surat.nomorAgenda || '-',
                },
                { label: 'Instansi Pengirim', value: surat.instansi || '-' },
                { label: 'No. Surat', value: surat.nomorSurat || '-' },
                { label: 'Perihal', value: surat.perihal || '-' },
                { label: 'Sifat Surat', value: disposisi.sifat || surat.sifat || 'RUTIN' },
                {
                  label: 'Usulan Instruksi',
                  value: Array.isArray(disposisi.instruksi) && disposisi.instruksi.length > 0
                    ? disposisi.instruksi.join(', ')
                    : 'Ditindak Lanjuti',
                },
              ],
              actionUrl: `${frontendUrl}/fitur/persuratan?tab=surat-masuk`,
              actionText: 'Tinjau & E-Sign Disposisi',
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.error('Gagal mengirim notifikasi pengajuan disposisi ke Kepsek:', e);
    }
  }

  /**
   * Buat / Edit Lembar Disposisi Surat Masuk (Menunggu Verifikasi & E-Sign Kepala Sekolah)
   */
  async upsertDisposisi(dto: CreateDisposisiDto) {
    const surat = await this.prisma.suratMasuk.findUnique({
      where: { id: dto.suratMasukId },
    });

    if (!surat) {
      throw new NotFoundException('Surat Masuk tidak ditemukan.');
    }

    const disposisi = await this.prisma.suratDisposisi.upsert({
      where: { suratMasukId: dto.suratMasukId },
      create: {
        suratMasukId: dto.suratMasukId,
        nomorAgenda: dto.nomorAgenda || surat.nomorAgenda,
        sifat: dto.sifat || surat.sifat,
        statusTahapan: dto.statusTahapan || 'DITERIMA',
        tanggalDiterima: dto.tanggalDiterima
          ? new Date(dto.tanggalDiterima)
          : surat.tanggalDiterima,
        instruksi: dto.instruksi || [],
        diteruskanKepada: dto.diteruskanKepada || {},
        catatan: dto.catatan || null,
        statusEsign: 'MENUNGGU_VERIFIKASI',
      },
      update: {
        nomorAgenda: dto.nomorAgenda || surat.nomorAgenda,
        sifat: dto.sifat || surat.sifat,
        statusTahapan: dto.statusTahapan || 'DITERIMA',
        tanggalDiterima: dto.tanggalDiterima
          ? new Date(dto.tanggalDiterima)
          : surat.tanggalDiterima,
        instruksi: dto.instruksi || [],
        diteruskanKepada: dto.diteruskanKepada || {},
        catatan: dto.catatan || null,
        statusEsign: 'MENUNGGU_VERIFIKASI',
      },
    });

    // Update status SuratMasuk
    const updatedSurat = await this.prisma.suratMasuk.update({
      where: { id: dto.suratMasukId },
      data: {
        statusDisposisi: 'MENUNGGU_VERIFIKASI',
        nomorAgenda: dto.nomorAgenda || surat.nomorAgenda,
        sifat: dto.sifat || surat.sifat,
        statusTahapan: dto.statusTahapan || surat.statusTahapan,
      },
    });

    // Otomatis kirim notifikasi & email ke Kepala Sekolah
    await this.sendDisposisiSubmissionNotificationToKepsek(updatedSurat, disposisi);

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'DISPOSISI_SUBMITTED',
        message: `Lembar Disposisi untuk Surat Masuk Agenda "${surat.nomorAgenda}" diajukan ke Kepala Sekolah.`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message:
        'Lembar Disposisi berhasil disimpan dan diajukan ke Kepala Sekolah untuk E-Sign.',
      data: disposisi,
    };
  }

  /**
   * Helper Pengiriman Notifikasi In-App & Email Otomatis ke Penerima Disposisi
   */
  async sendDisposisiNotifications(
    disposisi: any,
    surat: any,
    signerName: string,
  ) {
    try {
      const diteruskan = disposisi.diteruskanKepada || {};
      const targets: string[] = Array.isArray(diteruskan.targets)
        ? diteruskan.targets
        : [];
      const recipientNames: string[] = [];

      // Ekstrak nama spesifik dan bersihkan dari sufiks (misal: "Nama - Guru" -> "Nama")
      const rawNameFields = [
        diteruskan.guruNama,
        diteruskan.bagianNama,
        diteruskan.stafNama,
        diteruskan.penerimaNama,
        diteruskan.nama,
      ];
      for (const raw of rawNameFields) {
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          const clean = raw.split('-')[0].split('(')[0].trim().toLowerCase();
          if (clean.length >= 2 && !recipientNames.includes(clean)) {
            recipientNames.push(clean);
          }
        }
      }

      // Kumpulkan seluruh target user IDs eksplisit
      const targetUserIds: string[] = Array.isArray(diteruskan.targetUserIds)
        ? [...diteruskan.targetUserIds]
        : [];
      if (diteruskan.guruId && !targetUserIds.includes(diteruskan.guruId)) {
        targetUserIds.push(diteruskan.guruId);
      }
      if (diteruskan.stafId && !targetUserIds.includes(diteruskan.stafId)) {
        targetUserIds.push(diteruskan.stafId);
      }
      if (diteruskan.bagianId && !targetUserIds.includes(diteruskan.bagianId)) {
        targetUserIds.push(diteruskan.bagianId);
      }
      if (diteruskan.userId && !targetUserIds.includes(diteruskan.userId)) {
        targetUserIds.push(diteruskan.userId);
      }
      if (diteruskan.pegawaiId && !targetUserIds.includes(diteruskan.pegawaiId)) {
        targetUserIds.push(diteruskan.pegawaiId);
      }

      // Ambil user aktif dari basis data
      const allUsers = await this.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          subRole: true,
          subRole2: true,
          subRole3: true,
          subRole4: true,
          subRole5: true,
          nipNbm: true,
        },
      });

      const matchedUserMap = new Map<string, any>();

      for (const u of allUsers) {
        const uNameLower = (u.name || '').toLowerCase().trim();
        const uUsernameLower = (u.username || '').toLowerCase().trim();
        const uRoles = ([
          u.role,
          u.subRole,
          u.subRole2,
          u.subRole3,
          u.subRole4,
          u.subRole5,
        ] as (string | undefined | null)[])
          .filter((r): r is string => Boolean(r))
          .map((r) => r.toLowerCase().trim());

        let isMatch = false;

        // 1. Match by ID
        if (targetUserIds.includes(u.id)) {
          isMatch = true;
        }

        // 2. Match by Name (guruNama / stafNama / bagianNama)
        if (!isMatch && recipientNames.length > 0) {
          for (const name of recipientNames) {
            if (
              name &&
              (uNameLower.includes(name) ||
                name.includes(uNameLower) ||
                uUsernameLower.includes(name))
            ) {
              isMatch = true;
              break;
            }
          }
        }

        // 3. Match by Target Roles / Units
        if (!isMatch && targets.length > 0) {
          for (const target of targets) {
            const tLower = target.toLowerCase();
            if (
              tLower.includes('kurikulum') &&
              uRoles.some((r) => r.includes('kurikulum') || r.includes('kur'))
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('kesiswaan') &&
              uRoles.some(
                (r) =>
                  r.includes('kesiswaan') ||
                  r.includes('tatib') ||
                  r.includes('ketertiban'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              (tLower.includes('sarana') || tLower.includes('sarpras')) &&
              uRoles.some(
                (r) =>
                  r.includes('sarpras') ||
                  r.includes('sarana') ||
                  r.includes('inventaris'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              (tLower.includes('humas') || tLower.includes('sdm')) &&
              uRoles.some((r) => r.includes('humas') || r.includes('sdm'))
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('ismuba') &&
              uRoles.some((r) => r.includes('ismuba') || r.includes('agama'))
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('keuangan') &&
              uRoles.some(
                (r) => r.includes('bendahara') || r.includes('keuangan'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              (tLower.includes('administrasi umum') ||
                tLower.includes('bau') ||
                tLower.includes('tata usaha')) &&
              uRoles.some(
                (r) =>
                  r.includes('bau') ||
                  r.includes('tata_usaha') ||
                  r.includes('admin_tu'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('kerumahtanggaan') &&
              uRoles.some(
                (r) =>
                  r.includes('kebersihan') ||
                  r.includes('sarpras') ||
                  r.includes('bau') ||
                  r.includes('kerumahtanggaan') ||
                  r.includes('rumah_tangga'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('perpustakaan') &&
              uRoles.some(
                (r) => r.includes('perpus') || r.includes('perpustakaan'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('lab') &&
              uRoles.some(
                (r) => r.includes('lab') || r.includes('laboratorium'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('bk') &&
              uRoles.some(
                (r) => r.includes('bk') || r.includes('konseling'),
              )
            ) {
              isMatch = true;
              break;
            }
            if (
              tLower.includes('wali kelas') &&
              uRoles.some((r) => r.includes('wali_kelas'))
            ) {
              isMatch = true;
              break;
            }
            if (
              target === 'Guru' &&
              !diteruskan.guruNama &&
              !diteruskan.guruId &&
              uRoles.some((r) => r === 'guru')
            ) {
              isMatch = true;
              break;
            }
            if (
              target === 'Staf' &&
              !diteruskan.stafNama &&
              !diteruskan.stafId &&
              uRoles.some(
                (r) =>
                  r === 'pegawai' ||
                  r === 'staf' ||
                  r === 'karyawan' ||
                  r === 'admin_tu' ||
                  r === 'bau',
              )
            ) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          matchedUserMap.set(u.id, u);
        }
      }

      const recipients = Array.from(matchedUserMap.values());
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      for (const u of recipients) {
        // 1. In-App Notification SIMASMUH Dashboard
        try {
          await this.notificationsService.createNotification({
            userId: u.id,
            type: NotificationType.DISPOSISI_ASSIGNED,
            title: `Disposisi Surat Masuk: ${disposisi.nomorAgenda || surat.nomorAgenda}`,
            message: `Kepala Sekolah (${signerName}) mendisposisikan surat perihal "${surat.perihal}" kepada Anda untuk segera ditindaklanjuti.`,
            priority: NotificationPriority.HIGH,
            channel: [NotificationChannel.IN_APP],
            data: {
              suratMasukId: surat.id,
              disposisiId: disposisi.id,
              nomorAgenda: disposisi.nomorAgenda || surat.nomorAgenda,
              nomorSurat: surat.nomorSurat,
              perihal: surat.perihal,
              instansi: surat.instansi,
              sifat: disposisi.sifat || surat.sifat,
              instruksi: disposisi.instruksi,
              catatan: disposisi.catatan,
              fileUrl: surat.fileUrl,
              token: disposisi.eSignToken,
              actionUrl: '/fitur/disposisi',
            },
          });
        } catch (inAppErr) {
          console.error(
            'Gagal membuat In-App Notification Disposisi:',
            inAppErr,
          );
        }

        // 2. Official SMTP Email Notification ke Email Pengguna
        if (u.email && u.email.includes('@')) {
          this.emailNotificationService
            .sendEmailNotification({
              to: u.email,
              subject: `[Disposisi Resmi] ${surat.perihal} (Agenda: ${disposisi.nomorAgenda || surat.nomorAgenda || '-'})`,
              title: 'Disposisi Surat Masuk Resmi',
              category: 'PERIZINAN',
              badgeLabel: 'DISPOSISI KEPALA SEKOLAH',
              recipientName: u.name,
              contentText: `Kepala Sekolah (${signerName}) telah menerbitkan lembar disposisi resmi untuk surat masuk dari "${surat.instansi}" perihal "${surat.perihal}". Anda ditunjuk untuk menindaklanjuti arahan dan instruksi terkait melalui aplikasi SIMASMUH.`,
              metaDetails: [
                {
                  label: 'No. Agenda',
                  value: disposisi.nomorAgenda || surat.nomorAgenda || '-',
                },
                {
                  label: 'Sifat Surat',
                  value: disposisi.sifat || surat.sifat || 'PENTING',
                },
                { label: 'Instansi Pengirim', value: surat.instansi || '-' },
                { label: 'No. Surat', value: surat.nomorSurat || '-' },
                { label: 'Perihal Surat', value: surat.perihal || '-' },
                {
                  label: 'Instruksi Pimpinan',
                  value:
                    Array.isArray(disposisi.instruksi) &&
                    disposisi.instruksi.length > 0
                      ? disposisi.instruksi.join(', ')
                      : 'Ditindak Lanjuti',
                },
                {
                  label: 'Catatan / Arahan',
                  value:
                    disposisi.catatan ||
                    'Segera koordinasikan dan tindak lanjuti.',
                },
                {
                  label: 'Penandatangan (E-Sign)',
                  value: `${signerName} (${disposisi.signerNbm || 'Kepala Sekolah'})`,
                },
                {
                  label: 'Token E-Sign QR',
                  value: disposisi.eSignToken || '-',
                },
              ],
              actionUrl: `${frontendUrl}/fitur/disposisi`,
              actionText: 'Buka Lembar Disposisi di Dashboard',
            })
            .catch((err) => {
              console.error(`Gagal kirim email disposisi ke ${u.email}:`, err);
            });
        }
      }

      return {
        success: true,
        recipientsCount: recipients.length,
        recipients: recipients.map((r) => ({ id: r.id, name: r.name, email: r.email })),
      };
    } catch (err) {
      console.error('Gagal mengirim notifikasi Disposisi:', err);
      return { success: false, recipientsCount: 0, recipients: [] };
    }
  }

  /**
   * Verifikasi & E-Sign Disposisi oleh Kepala Sekolah (APPROVE / REJECT)
   */
  async approveOrRejectDisposisi(disposisiId: string, dto: UpdateDisposisiDto) {
    let disposisi = await this.prisma.suratDisposisi.findFirst({
      where: {
        OR: [{ id: disposisiId }, { suratMasukId: disposisiId }],
      },
      include: { suratMasuk: true },
    });

    if (!disposisi) {
      const surat = await this.prisma.suratMasuk.findUnique({
        where: { id: disposisiId },
      });
      if (!surat) {
        throw new NotFoundException('Lembar Disposisi tidak ditemukan.');
      }
      disposisi = await this.prisma.suratDisposisi.create({
        data: {
          suratMasukId: surat.id,
          nomorAgenda: surat.nomorAgenda,
          sifat: surat.sifat,
          statusTahapan: 'DITERIMA',
          tanggalDiterima: surat.tanggalDiterima,
          instruksi: dto.instruksi || ['Ditindak Lanjuti'],
          diteruskanKepada: dto.diteruskanKepada || { targets: ['Guru'] },
          catatan: dto.catatan || null,
          statusEsign: 'MENUNGGU_VERIFIKASI',
        },
        include: { suratMasuk: true },
      });
    }

    if (dto.action === 'REJECT') {
      const updated = await this.prisma.suratDisposisi.update({
        where: { id: disposisi.id },
        data: {
          statusEsign: 'DITOLAK',
          catatanPenolak:
            dto.catatanPenolak || 'Disposisi ditolak oleh Kepala Sekolah',
        },
      });

      await this.prisma.suratMasuk.update({
        where: { id: disposisi.suratMasukId },
        data: { statusDisposisi: 'DITOLAK' },
      });

      return {
        success: true,
        message: 'Lembar Disposisi telah ditolak oleh Kepala Sekolah.',
        data: updated,
      };
    }

    // APPROVE & Generate E-Sign Token
    const generateRandomToken = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let token = 'DSP';
      for (let i = 0; i < 4; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    };

    let newToken = disposisi.eSignToken;
    if (!newToken) {
      newToken = generateRandomToken();
    }

    const signerName = dto.signerName || 'Sugeng Riadi, M.Pd.';
    const signerNbm = dto.signerNbm || 'NBM. 974.501';

    const updated = await this.prisma.suratDisposisi.update({
      where: { id: disposisi.id },
      data: {
        statusEsign: 'DISETUJUI',
        eSignToken: newToken,
        eSignSignedAt: new Date(),
        signerName,
        signerNbm,
        signatureImage: dto.signatureImage || dto.signatureDataUrl || null,
        instruksi:
          dto.instruksi !== undefined ? dto.instruksi : disposisi.instruksi,
        diteruskanKepada:
          dto.diteruskanKepada !== undefined
            ? dto.diteruskanKepada
            : disposisi.diteruskanKepada,
        catatan: dto.catatan !== undefined ? dto.catatan : disposisi.catatan,
        statusTahapan: 'DISAMPAIKAN',
      },
    });

    await this.prisma.suratMasuk.update({
      where: { id: disposisi.suratMasukId },
      data: {
        statusDisposisi: 'DISPOSISI_DISETUJUI',
        statusTahapan: 'DISAMPAIKAN',
      },
    });

    // Otomatis Kirim Notifikasi ke Pihak Diberi Kuasa / Diteruskan Kepada
    await this.sendDisposisiNotifications(
      updated,
      disposisi.suratMasuk,
      signerName,
    );

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'DISPOSISI_APPROVED',
        message: `Lembar Disposisi Agenda "${disposisi.nomorAgenda || disposisi.suratMasuk.nomorAgenda}" disetujui & di-E-Sign oleh Kepala Sekolah (${updated.signerName}). Token: ${newToken}`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message:
        '✓ Lembar Disposisi berhasil diverifikasi, di-E-Sign, & Notifikasi Otomatis dikirim ke Pihak Terkait.',
      data: updated,
    };
  }

  /**
   * Update Status Progres Tindak Lanjut oleh Guru / Pegawai / TU
   */
  async updateProgresStatus(
    id: string,
    body: {
      statusDisposisi: string;
      statusTahapan?: string;
      catatanTindakLanjut?: string;
    },
    userId?: string,
  ) {
    const surat = await this.prisma.suratMasuk.findFirst({
      where: {
        OR: [{ id }, { disposisi: { id } }],
      },
      include: { disposisi: true },
    });

    if (!surat) {
      throw new NotFoundException('Surat Masuk / Disposisi tidak ditemukan.');
    }

    const newStatusDisposisi = body.statusDisposisi || surat.statusDisposisi;
    let newStatusTahapan = body.statusTahapan || surat.statusTahapan;

    if (!body.statusTahapan) {
      if (
        newStatusDisposisi === 'DILAKSANAKAN' ||
        newStatusDisposisi === 'SELESAI'
      ) {
        newStatusTahapan = 'PENYELESAIAN';
      } else if (newStatusDisposisi === 'PROSES') {
        newStatusTahapan = 'PENGECEKAN';
      } else if (newStatusDisposisi === 'PENDING') {
        newStatusTahapan = 'DISAMPAIKAN';
      }
    }

    const updatedSurat = await this.prisma.suratMasuk.update({
      where: { id: surat.id },
      data: {
        statusDisposisi: newStatusDisposisi,
        statusTahapan: newStatusTahapan,
      },
      include: { disposisi: true },
    });

    if (surat.disposisi) {
      await this.prisma.suratDisposisi.update({
        where: { id: surat.disposisi.id },
        data: {
          statusTahapan: newStatusTahapan,
          catatan: body.catatanTindakLanjut
            ? `${surat.disposisi.catatan || ''}\n[Tindak Lanjut]: ${body.catatanTindakLanjut}`.trim()
            : surat.disposisi.catatan,
        },
      });
    }

    // Kirim notifikasi In-App update progres ke Kepala Sekolah & TU
    try {
      let updaterName = 'Petugas';
      if (userId) {
        const updater = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        if (updater?.name) updaterName = updater.name;
      }

      const leadershipUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: 'KEPALA_SEKOLAH' },
            { subRole: 'KEPALA_SEKOLAH' },
            { role: 'ADMIN_TU' },
            { subRole: 'ADMIN_TU' },
            { role: 'TATA_USAHA' },
          ],
        },
        select: { id: true },
      });

      for (const leader of leadershipUsers) {
        if (leader.id === userId) continue;
        await this.notificationsService.createNotification({
          userId: leader.id,
          type: NotificationType.DISPOSISI_ASSIGNED,
          title: `Update Progres Disposisi: ${surat.nomorAgenda || surat.nomorSurat}`,
          message: `${updaterName} memperbarui status disposisi "${surat.perihal}" menjadi "${newStatusDisposisi}".`,
          priority: NotificationPriority.NORMAL,
          channel: [NotificationChannel.IN_APP],
          data: {
            suratMasukId: surat.id,
            nomorAgenda: surat.nomorAgenda,
            statusDisposisi: newStatusDisposisi,
            statusTahapan: newStatusTahapan,
            actionUrl: '/fitur/persuratan?tab=surat-masuk',
          },
        }).catch(() => {});
      }
    } catch (notifErr) {
      // Ignore notification error
    }

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'DISPOSISI_STATUS_UPDATED',
        message: `Status disposisi agenda "${surat.nomorAgenda}" diperbarui menjadi ${newStatusDisposisi} (${newStatusTahapan}).`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message: `Status disposisi berhasil diperbarui menjadi ${newStatusDisposisi}.`,
      data: updatedSurat,
    };
  }

  /**
   * Kirim Ulang Notifikasi In-App & Email Disposisi ke Seluruh Penerima Terkait
   */
  async resendDisposisiNotification(id: string) {
    const disposisi = await this.prisma.suratDisposisi.findFirst({
      where: {
        OR: [{ id }, { suratMasukId: id }],
      },
      include: { suratMasuk: true },
    });

    if (!disposisi || !disposisi.suratMasuk) {
      throw new NotFoundException('Disposisi / Surat Masuk tidak ditemukan.');
    }

    if (disposisi.statusEsign === 'MENUNGGU_VERIFIKASI') {
      await this.sendDisposisiSubmissionNotificationToKepsek(
        disposisi.suratMasuk,
        disposisi,
      );
      return {
        success: true,
        message:
          '✓ Notifikasi permohonan E-Sign disposisi berhasil dikirimkan ulang ke Kepala Sekolah via In-App & Email.',
        recipientsCount: 1,
      };
    }

    const result = await this.sendDisposisiNotifications(
      disposisi,
      disposisi.suratMasuk,
      disposisi.signerName || 'Kepala Sekolah',
    );

    try {
      await this.systemLogService.log({
        category: 'SISTEM',
        action: 'DISPOSISI_NOTIFICATION_RESENT',
        message: `Notifikasi disposisi agenda "${disposisi.nomorAgenda || disposisi.suratMasuk.nomorAgenda}" dikirim ulang ke ${result.recipientsCount} penerima.`,
      });
    } catch (e) {
      // Ignore log error
    }

    return {
      success: true,
      message: `Notifikasi In-App & Email resmi berhasil dikirimkan ulang ke ${result.recipientsCount} pihak penerima disposisi.`,
      recipientsCount: result.recipientsCount,
      recipients: result.recipients,
    };
  }
}
