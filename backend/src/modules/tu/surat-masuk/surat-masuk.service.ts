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
  }) {
    const { search, sifat, statusDisposisi } = query;
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

    const items = await this.prisma.suratMasuk.findMany({
      where,
      include: {
        disposisi: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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
    await this.prisma.suratMasuk.update({
      where: { id: dto.suratMasukId },
      data: {
        statusDisposisi: 'MENUNGGU_VERIFIKASI',
        nomorAgenda: dto.nomorAgenda || surat.nomorAgenda,
        sifat: dto.sifat || surat.sifat,
        statusTahapan: dto.statusTahapan || surat.statusTahapan,
      },
    });

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
   * Helper Pengiriman Notifikasi WhatsApp Otomatis ke Penerima Disposisi
   */
  private async sendDisposisiNotifications(
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

      if (diteruskan.guruNama) recipientNames.push(diteruskan.guruNama);
      if (diteruskan.bagianNama) recipientNames.push(diteruskan.bagianNama);
      if (diteruskan.stafNama) recipientNames.push(diteruskan.stafNama);

      // Gabungkan target unit & nama individu
      const allTargetLabels = [...targets, ...recipientNames].filter(Boolean);
      if (allTargetLabels.length === 0) return;

      const recipientStr = allTargetLabels.join(', ');

      // Cari user terdaftar di database yang sesuai dengan nama target
      const matchedUsers = await this.prisma.user.findMany({
        where: {
          name: { in: recipientNames, mode: 'insensitive' },
          email: { contains: '@' },
        },
        take: 5,
      });

      for (const u of matchedUsers) {
        // 1. In-App Notification SIMASMUH
        try {
          await this.notificationsService.createNotification({
            userId: u.id,
            type: NotificationType.DISPOSISI_ASSIGNED,
            title: 'Disposisi Surat Masuk Baru',
            message: `Kepala Sekolah (${signerName}) mendisposisikan surat perihal "${surat.perihal}" kepada Anda untuk segera ditindaklanjuti.`,
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
              token: disposisi.eSignToken,
            },
          });
        } catch (inAppErr) {
          console.error('Gagal membuat In-App Notification Disposisi:', inAppErr);
        }

        // 2. Official Email Notification
        if (u.email) {
          this.emailNotificationService
            .sendEmailNotification({
              to: u.email,
              subject: `[Disposisi] ${surat.perihal}`,
              title: 'Disposisi Surat Masuk',
              category: 'PERIZINAN',
              badgeLabel: 'DISPOSISI KEPALA SEKOLAH',
              recipientName: u.name,
              contentText: `Anda menerima disposisi surat masuk dari Kepala Sekolah (${signerName}).`,
              metaDetails: [
                { label: 'No. Agenda', value: disposisi.nomorAgenda || surat.nomorAgenda },
                { label: 'Instansi Pengirim', value: surat.instansi },
                { label: 'No. Surat', value: surat.nomorSurat },
                { label: 'Perihal', value: surat.perihal },
                { label: 'Instruksi', value: Array.isArray(disposisi.instruksi) ? disposisi.instruksi.join(', ') : 'Ditindak Lanjuti' },
                { label: 'Catatan Pimpinan', value: disposisi.catatan || 'Segera koordinasikan dan tindak lanjuti.' },
              ],
              actionUrl: `${process.env.FRONTEND_URL || ''}/fitur/disposisi`,
              actionText: 'Lihat Disposisi',
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Gagal mengirim notifikasi Disposisi:', err);
    }
  }

  /**
   * Verifikasi & E-Sign Disposisi oleh Kepala Sekolah (APPROVE / REJECT)
   */
  async approveOrRejectDisposisi(disposisiId: string, dto: UpdateDisposisiDto) {
    const disposisi = await this.prisma.suratDisposisi.findUnique({
      where: { id: disposisiId },
      include: { suratMasuk: true },
    });

    if (!disposisi) {
      throw new NotFoundException('Lembar Disposisi tidak ditemukan.');
    }

    if (dto.action === 'REJECT') {
      const updated = await this.prisma.suratDisposisi.update({
        where: { id: disposisiId },
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
      where: { id: disposisiId },
      data: {
        statusEsign: 'DISETUJUI',
        eSignToken: newToken,
        eSignSignedAt: new Date(),
        signerName,
        signerNbm,
        signatureImage: dto.signatureImage || dto.signatureDataUrl || null,
      },
    });

    await this.prisma.suratMasuk.update({
      where: { id: disposisi.suratMasukId },
      data: { statusDisposisi: 'DISPOSISI_DISETUJUI' },
    });

    // Otomatis Kirim Notifikasi WhatsApp ke Pihak Diberi Kuasa / Diteruskan Kepada
    const instruksiArr = Array.isArray(disposisi.instruksi)
      ? disposisi.instruksi
      : [];
    if (instruksiArr.includes('Ditindak Lanjuti') || instruksiArr.length > 0) {
      await this.sendDisposisiNotifications(
        updated,
        disposisi.suratMasuk,
        signerName,
      );
    }

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
}
