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
        const guruNama = (diteruskan.guruNama || '').toLowerCase();
        const bagianNama = (diteruskan.bagianNama || '').toLowerCase();
        const stafNama = (diteruskan.stafNama || '').toLowerCase();
        const targetUserIds = Array.isArray(diteruskan.targetUserIds)
          ? diteruskan.targetUserIds
          : [];

        if (userId && targetUserIds.includes(userId)) return true;

        const matchName =
          (guruNama &&
            myNameLower &&
            (myNameLower.includes(guruNama) ||
              guruNama.includes(myNameLower))) ||
          (stafNama &&
            myNameLower &&
            (myNameLower.includes(stafNama) ||
              stafNama.includes(myNameLower))) ||
          (bagianNama &&
            myNameLower &&
            (myNameLower.includes(bagianNama) ||
              bagianNama.includes(myNameLower)));

        if (matchName) return true;

        // Role & Subrole mapping
        const isKurikulum = myRoles.some((r) => r.includes('kurikulum'));
        const isKesiswaan = myRoles.some(
          (r) =>
            r.includes('kesiswaan') ||
            r.includes('tatib') ||
            r.includes('ketertiban'),
        );
        const isSarpras = myRoles.some(
          (r) => r.includes('sarpras') || r.includes('inventaris'),
        );
        const isHumas = myRoles.some(
          (r) => r.includes('humas') || r.includes('sdm'),
        );
        const isIsmuba = myRoles.some((r) => r.includes('ismuba'));
        const isKeuangan = myRoles.some(
          (r) => r.includes('bendahara') || r.includes('keuangan'),
        );
        const isBau = myRoles.some(
          (r) =>
            r.includes('bau') ||
            r.includes('tata_usaha') ||
            r.includes('admin_tu'),
        );
        const isGuru = userRole === 'GURU' || myRoles.some((r) => r === 'guru');
        const isPegawai =
          userRole === 'PEGAWAI' || myRoles.some((r) => r === 'pegawai');

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
                t.toLowerCase().includes('bau'),
            )) ||
          (isGuru && targets.includes('Guru') && !guruNama) ||
          (isPegawai && targets.includes('Staf') && !stafNama);

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
   * Helper Pengiriman Notifikasi In-App & Email Otomatis ke Penerima Disposisi
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

      const targetUserIds: string[] = Array.isArray(diteruskan.targetUserIds)
        ? diteruskan.targetUserIds
        : [];

      // Ambil user aktif dari basis data
      const allUsers = await this.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subRole: true,
          subRole2: true,
          subRole3: true,
        },
      });

      const matchedUserMap = new Map<string, any>();

      for (const u of allUsers) {
        const uNameLower = (u.name || '').toLowerCase();
        const uRoles = ([u.role, u.subRole, u.subRole2, u.subRole3] as (string | undefined | null)[])
          .filter((r): r is string => Boolean(r))
          .map((r) => r.toLowerCase());

        let isMatch = false;

        // 1. Match by ID
        if (targetUserIds.includes(u.id)) {
          isMatch = true;
        }

        // 2. Match by Name (guruNama / stafNama / bagianNama)
        if (!isMatch) {
          for (const name of recipientNames) {
            const cleanTarget = name.trim().toLowerCase();
            if (
              cleanTarget &&
              (uNameLower.includes(cleanTarget) ||
                cleanTarget.includes(uNameLower))
            ) {
              isMatch = true;
              break;
            }
          }
        }

        // 3. Match by Target Roles / Units
        if (!isMatch) {
          for (const target of targets) {
            const tLower = target.toLowerCase();
            if (
              tLower.includes('kurikulum') &&
              uRoles.some((r) => r.includes('kurikulum'))
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
                (r) => r.includes('sarpras') || r.includes('inventaris'),
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
              uRoles.some((r) => r.includes('ismuba'))
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
                tLower.includes('bau')) &&
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
                  r.includes('bau'),
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

      for (const u of recipients) {
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
          console.error(
            'Gagal membuat In-App Notification Disposisi:',
            inAppErr,
          );
        }

        // 2. Official Email Notification
        if (u.email && u.email.includes('@')) {
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
                {
                  label: 'No. Agenda',
                  value: disposisi.nomorAgenda || surat.nomorAgenda,
                },
                { label: 'Instansi Pengirim', value: surat.instansi },
                { label: 'No. Surat', value: surat.nomorSurat },
                { label: 'Perihal', value: surat.perihal },
                {
                  label: 'Instruksi',
                  value: Array.isArray(disposisi.instruksi)
                    ? disposisi.instruksi.join(', ')
                    : 'Ditindak Lanjuti',
                },
                {
                  label: 'Catatan Pimpinan',
                  value:
                    disposisi.catatan ||
                    'Segera koordinasikan dan tindak lanjuti.',
                },
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
}
