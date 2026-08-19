import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { OnEvent } from '@nestjs/event-emitter';

export interface SendWhatsAppDto {
  to: string;
  message: string;
  recipientName?: string;
  recipientRole?: string;
  category?: 'ABSENSI' | 'TAGIHAN' | 'PEMBAYARAN' | 'INFORMASI' | 'SISTEM' | 'IZIN';
  title?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  public static readonly DEFAULT_SENDER_NUMBER = '088293733330';

  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  /**
   * Format nomor telepon ke standar internasional Indonesia (628xxx)
   */
  public normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    } else if (cleaned.startsWith('+62')) {
      cleaned = cleaned.replace('+', '');
    }
    return cleaned;
  }

  /**
   * Mengambil konfigurasi pengirim WhatsApp dari Setting atau default
   */
  async getWhatsAppConfig() {
    try {
      const setting = await this.prisma.setting.findFirst();
      return {
        senderNumber: setting?.whatsappSenderNumber || process.env.WHATSAPP_SENDER_NUMBER || WhatsAppService.DEFAULT_SENDER_NUMBER,
        apiUrl: setting?.whatsappApiUrl || process.env.WHATSAPP_API_URL || null,
        apiKey: setting?.whatsappApiKey || process.env.WHATSAPP_API_KEY || null,
        schoolName: setting?.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
      };
    } catch (e) {
      return {
        senderNumber: WhatsAppService.DEFAULT_SENDER_NUMBER,
        apiUrl: null,
        apiKey: null,
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
      };
    }
  }

  /**
   * Kirim pesan WhatsApp langsung
   */
  async sendDirectMessage(data: SendWhatsAppDto): Promise<{ success: boolean; logId?: string; status: string; error?: string }> {
    const rawTo = data.to;
    const normalizedPhone = this.normalizePhoneNumber(rawTo);

    if (!normalizedPhone || normalizedPhone.length < 8) {
      this.logger.warn(`Nomor WhatsApp tujuan tidak valid: ${rawTo}`);
      return { success: false, status: 'FAILED', error: 'Nomor tujuan tidak valid' };
    }

    const config = await this.getWhatsAppConfig();
    const category = data.category || 'SISTEM';
    let status = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (config.apiUrl && config.apiKey) {
        // Integrasi Real REST API WhatsApp Gateway (Fonnte / Wablas / WABA / Custom)
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': config.apiKey,
          },
          body: JSON.stringify({
            target: normalizedPhone,
            phone: normalizedPhone,
            message: data.message,
            sender: config.senderNumber,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        status = 'SENT';
        this.logger.log(`✅ [WhatsApp Sent API] to ${normalizedPhone} (${data.recipientName || 'User'}): ${data.title || category}`);
      } else {
        // Mode Simulasi / Gateway Local Development
        status = 'SIMULATED';
        this.logger.log(`📱 [WhatsApp Gateway System (${config.senderNumber}) -> ${normalizedPhone}]`);
        this.logger.log(`   Penerima: ${data.recipientName || 'User'} [${data.recipientRole || '-'}]`);
        this.logger.log(`   Kategori: [${category}] ${data.title || ''}`);
        this.logger.log(`   Pesan:\n${data.message}`);
      }
    } catch (error: any) {
      status = 'FAILED';
      errorMessage = error?.message || 'Gagal mengirim pesan WhatsApp';
      this.logger.error(`❌ [WhatsApp Gateway Error] to ${normalizedPhone}: ${errorMessage}`);
    }

    // Catat riwayat pengiriman ke tabel WhatsAppLog
    try {
      const log = await this.prisma.whatsAppLog.create({
        data: {
          recipientPhone: normalizedPhone,
          recipientName: data.recipientName || null,
          recipientRole: data.recipientRole || null,
          category,
          title: data.title || null,
          message: data.message,
          senderNumber: config.senderNumber,
          status,
          error: errorMessage,
        },
      });

      // Simpan juga ke antrean log sistem
      await this.systemLogService.log({
        category: 'WHATSAPP',
        level: status === 'FAILED' ? 'ERROR' : 'INFO',
        action: `WHATSAPP_${status}`,
        message: `Pesan WhatsApp ke ${normalizedPhone} (${data.recipientName || 'User'}): ${data.title || category} [${status}]`,
        details: {
          recipientPhone: normalizedPhone,
          recipientName: data.recipientName,
          recipientRole: data.recipientRole,
          category,
          status,
          error: errorMessage,
        },
      });

      return { success: status === 'SENT' || status === 'SIMULATED', logId: log.id, status, error: errorMessage || undefined };
    } catch (dbError: any) {
      this.logger.error(`Gagal mencatat log WhatsApp ke DB: ${dbError.message}`);
      return { success: status === 'SENT' || status === 'SIMULATED', status, error: errorMessage || undefined };
    }
  }

  /**
   * Template: Notifikasi Presensi / Absensi (Masuk / Pulang / Terlambat / Izin)
   */
  async sendAttendanceNotification(params: {
    studentOrUserName: string;
    role: string;
    phone?: string;
    parentPhone?: string;
    className?: string;
    scanType: 'MASUK' | 'PULANG' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA';
    time: string;
    date: string;
    notes?: string;
    method?: string; // QR / Face Recognition / Manual
  }) {
    const config = await this.getWhatsAppConfig();
    const emojiStatus = params.scanType === 'MASUK' ? '🟢' : params.scanType === 'PULANG' ? '🔵' : '🟡';

    const message = `*PRESENSI KEHADIRAN - ${config.schoolName.toUpperCase()}*
${emojiStatus} Status: *PRESENSI ${params.scanType}*

Nama: *${params.studentOrUserName}*
Peran/Kelas: *${params.className ? params.className : params.role}*
Waktu: *${params.time} WIB*
Tanggal: *${params.date}*
Metode: *${params.method || 'Sistem Terintegrasi SIMASMUH'}*
${params.notes ? `Catatan: ${params.notes}\n` : ''}
Pesan ini dikirim secara otomatis oleh SIMASMUH sebagai rekaman data kehadiran resmi sekolah.`;

    const phonesToSend = new Set<string>();
    if (params.phone && params.phone.trim() !== '') phonesToSend.add(params.phone.trim());
    if (params.parentPhone && params.parentPhone.trim() !== '') phonesToSend.add(params.parentPhone.trim());

    if (phonesToSend.size === 0) {
      phonesToSend.add(WhatsAppService.DEFAULT_SENDER_NUMBER);
    }

    for (const phone of phonesToSend) {
      await this.sendDirectMessage({
        to: phone,
        recipientName: params.studentOrUserName,
        recipientRole: params.role,
        category: 'ABSENSI',
        title: `Presensi ${params.scanType} - ${params.studentOrUserName}`,
        message,
      });
    }
  }

  /**
   * Template: Notifikasi Tagihan Baru
   */
  async sendTagihanNotification(params: {
    studentName: string;
    className?: string;
    tagihanType: string;
    amount: number;
    dueDate?: string;
    phone?: string;
    parentPhone?: string;
    bankInfo?: string;
  }) {
    const config = await this.getWhatsAppConfig();
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(params.amount);

    const message = `*PEMBERITAHUAN TAGIHAN KEUANGAN - ${config.schoolName.toUpperCase()}*
💳 Rincian Tagihan Siswa:

Nama Siswa: *${params.studentName}* ${params.className ? `(${params.className})` : ''}
Jenis Tagihan: *${params.tagihanType}*
Total Tagihan: *${formattedAmount}*
${params.dueDate ? `Jatuh Tempo: *${params.dueDate}*\n` : ''}
Pembayaran dapat dilakukan melalui portal SIMASMUH atau transfer ke rekening resmi sekolah.
${params.bankInfo ? `Informasi Rekening: ${params.bankInfo}\n` : ''}
Mohon abaikan jika Anda telah menyelesaikan pembayaran tagihan ini.`;

    const phonesToSend = new Set<string>();
    if (params.phone && params.phone.trim() !== '') phonesToSend.add(params.phone.trim());
    if (params.parentPhone && params.parentPhone.trim() !== '') phonesToSend.add(params.parentPhone.trim());

    if (phonesToSend.size === 0) phonesToSend.add(WhatsAppService.DEFAULT_SENDER_NUMBER);

    for (const phone of phonesToSend) {
      await this.sendDirectMessage({
        to: phone,
        recipientName: params.studentName,
        recipientRole: 'ORANG_TUA/SISWA',
        category: 'TAGIHAN',
        title: `Tagihan ${params.tagihanType} - ${params.studentName}`,
        message,
      });
    }
  }

  /**
   * Template: Notifikasi Pembayaran & Verifikasi
   */
  async sendPaymentNotification(params: {
    studentName: string;
    tagihanType: string;
    amount: number;
    status: 'MENUNGGU_VERIFIKASI' | 'DIVERIFIKASI' | 'DITOLAK' | 'LUNAS';
    verifiedBy?: string;
    notes?: string;
    phone?: string;
    parentPhone?: string;
  }) {
    const config = await this.getWhatsAppConfig();
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(params.amount);
    
    let statusText = 'DITERIMA (LUNAS)';
    let emoji = '✅';
    if (params.status === 'DITOLAK') {
      statusText = 'DITOLAK';
      emoji = '❌';
    } else if (params.status === 'MENUNGGU_VERIFIKASI') {
      statusText = 'SEDANG DIVERIFIKASI BENDAHARA';
      emoji = '⏳';
    }

    const message = `*KONFIRMASI PEMBAYARAN - ${config.schoolName.toUpperCase()}*
${emoji} Status Pembayaran: *${statusText}*

Nama Siswa: *${params.studentName}*
Jenis Pembayaran: *${params.tagihanType}*
Nominal: *${formattedAmount}*
${params.notes ? `Catatan Petugas: ${params.notes}\n` : ''}
Terima kasih atas partisipasi dan kepedulian Anda dalam administrasi pendidikan di ${config.schoolName}.`;

    const phonesToSend = new Set<string>();
    if (params.phone && params.phone.trim() !== '') phonesToSend.add(params.phone.trim());
    if (params.parentPhone && params.parentPhone.trim() !== '') phonesToSend.add(params.parentPhone.trim());

    if (phonesToSend.size === 0) phonesToSend.add(WhatsAppService.DEFAULT_SENDER_NUMBER);

    for (const phone of phonesToSend) {
      await this.sendDirectMessage({
        to: phone,
        recipientName: params.studentName,
        recipientRole: 'ORANG_TUA/SISWA',
        category: 'PEMBAYARAN',
        title: `Status Pembayaran ${params.tagihanType} - ${params.studentName}`,
        message,
      });
    }
  }

  /**
   * Template: Notifikasi Berita / Pengumuman Informasi
   */
  async sendAnnouncementBroadcast(params: {
    title: string;
    content: string;
    authorName?: string;
    target: string;
    type?: string;
    eventDate?: string;
  }) {
    const config = await this.getWhatsAppConfig();
    const cleanContent = params.content.replace(/<[^>]*>?/gm, ''); // remove HTML tags if any

    const message = `*PENGUMUMAN & INFORMASI RESMI - ${config.schoolName.toUpperCase()}*
📢 *${params.title}*

Kategori: *${params.type || 'INFORMASI UMUM'}*
Ditujukan Untuk: *${params.target}*
${params.eventDate ? `Tanggal Kegiatan: *${params.eventDate}*\n` : ''}
Ringkasan:
${cleanContent.length > 300 ? cleanContent.substring(0, 300) + '...' : cleanContent}

Informasi dan detail lengkap dapat dibaca melalui Portal Aplikasi SIMASMUH.
Diterbitkan oleh: *${params.authorName || 'Pihak Sekolah'}*`;

    // Ambil daftar nomor penerima sesuai target
    const targetRoles: string[] = [];
    if (params.target === 'SEMUA' || params.target === 'ALL') {
      targetRoles.push('SUPERADMIN', 'ADMIN', 'GURU', 'SISWA', 'ORANG_TUA');
    } else if (params.target === 'GURU') {
      targetRoles.push('GURU', 'ADMIN', 'SUPERADMIN');
    } else if (params.target === 'SISWA') {
      targetRoles.push('SISWA');
    } else {
      targetRoles.push(params.target);
    }

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: targetRoles },
        phone: { not: null },
      },
      select: { phone: true, name: true, role: true },
      take: 100, // Batasi untuk broadcast batch
    });

    for (const u of users) {
      if (u.phone && u.phone.trim() !== '') {
        await this.sendDirectMessage({
          to: u.phone,
          recipientName: u.name,
          recipientRole: u.role,
          category: 'INFORMASI',
          title: params.title,
          message,
        });
      }
    }
  }

  /**
   * Listen for standard in-app notifications created event and mirror to WhatsApp
   */
  @OnEvent('notification.created')
  async handleNotificationCreated(notification: any) {
    try {
      if (!notification || !notification.userId) return;

      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        include: {
          student: true,
          teacherProfile: true,
        },
      });

      if (!user) return;

      const phone = user.phone || user.teacherProfile?.phone || user.student?.phone || user.student?.parentPhone || WhatsAppService.DEFAULT_SENDER_NUMBER;

      const config = await this.getWhatsAppConfig();
      const message = `*NOTIFIKASI SIMASMUH - ${config.schoolName.toUpperCase()}*
🔔 *${notification.title}*

Yth. *${user.name}*
${notification.message}

Silakan cek portal aplikasi SIMASMUH untuk melihat detail aktivitas ini.`;

      await this.sendDirectMessage({
        to: phone,
        recipientName: user.name,
        recipientRole: user.role,
        category: 'SISTEM',
        title: notification.title,
        message,
      });
    } catch (e: any) {
      this.logger.error(`Error mirroring notification to WhatsApp: ${e?.message}`);
    }
  }

  /**
   * Listen for Tagihan Created Event
   */
  @OnEvent('tagihan.created')
  async handleTagihanCreatedEvent(event: any) {
    try {
      if (!event.studentId) return;
      const student = await this.prisma.student.findUnique({
        where: { id: event.studentId },
        include: { class: true },
      });
      if (!student) return;

      const tagihan = event.tagihanId ? await this.prisma.tagihan.findUnique({ where: { id: event.tagihanId } }) : null;

      await this.sendTagihanNotification({
        studentName: student.name,
        className: student.class?.name,
        tagihanType: tagihan?.type || event.bulkData?.tagihanType || 'Tagihan Sekolah',
        amount: tagihan?.amount || event.bulkData?.amount || 0,
        dueDate: tagihan?.dueDate ? tagihan.dueDate.toLocaleDateString('id-ID') : undefined,
        phone: student.phone || undefined,
        parentPhone: student.parentPhone || undefined,
      });
    } catch (e: any) {
      this.logger.error(`Error handling tagihan WhatsApp notification: ${e?.message}`);
    }
  }

  /**
   * Listen for Payment Proof Verified Event
   */
  @OnEvent('payment-proof.verified')
  async handlePaymentProofVerifiedEvent(event: any) {
    try {
      if (!event.proofId) return;
      const proof = await this.prisma.paymentProof.findUnique({
        where: { id: event.proofId },
        include: {
          student: true,
          tagihan: true,
        },
      });
      if (!proof || !proof.student) return;

      await this.sendPaymentNotification({
        studentName: proof.student.name,
        tagihanType: proof.tagihan?.type || 'Pembayaran Sekolah',
        amount: proof.amount,
        status: event.status === 'DIVERIFIKASI' ? 'DIVERIFIKASI' : 'DITOLAK',
        notes: event.notes,
        phone: proof.student.phone || undefined,
        parentPhone: proof.student.parentPhone || undefined,
      });
    } catch (e: any) {
      this.logger.error(`Error handling payment verified WhatsApp notification: ${e?.message}`);
    }
  }

  /**
   * Get realtime WhatsApp Gateway connection status from self-hosted microservice
   */
  async getGatewayStatus() {
    const config = await this.getWhatsAppConfig();
    try {
      const gatewayBaseUrl = config.apiUrl ? config.apiUrl.replace(/\/api\/send\/?$/i, '') : 'http://localhost:3002';
      const res = await fetch(`${gatewayBaseUrl}/api/status`, {
        headers: {
          ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        return {
          online: true,
          ...data,
          config,
        };
      }
    } catch (e: any) {
      // Fallback
    }

    return {
      online: false,
      status: 'DISCONNECTED',
      connectedPhone: null,
      message: 'Layanan WhatsApp Gateway lokal belum terhubung.',
      config,
    };
  }

  /**
   * Update WhatsApp Settings
   */
  async updateWhatsAppConfig(data: {
    whatsappSenderNumber?: string;
    whatsappApiUrl?: string;
    whatsappApiKey?: string;
  }) {
    const setting = await this.prisma.setting.findFirst();
    if (setting) {
      return this.prisma.setting.update({
        where: { id: setting.id },
        data: {
          ...(data.whatsappSenderNumber !== undefined ? { whatsappSenderNumber: data.whatsappSenderNumber } : {}),
          ...(data.whatsappApiUrl !== undefined ? { whatsappApiUrl: data.whatsappApiUrl } : {}),
          ...(data.whatsappApiKey !== undefined ? { whatsappApiKey: data.whatsappApiKey } : {}),
        },
      });
    }
    return null;
  }

  /**
   * Send Manual Broadcast to selected Audience
   */
  async broadcastManual(params: {
    target: 'SEMUA' | 'GURU' | 'SISWA' | 'ORANG_TUA' | 'PEGAWAI';
    title: string;
    message: string;
  }) {
    const config = await this.getWhatsAppConfig();
    const formattedMessage = `*PENGUMUMAN SIMASMUH - ${config.schoolName.toUpperCase()}*
📢 *${params.title}*

${params.message}

Pesan ini dikirim secara terpusat oleh Administrator SIMASMUH.`;

    const phonesToSend = new Map<string, { name: string; role: string }>();

    if (params.target === 'SEMUA' || params.target === 'GURU' || params.target === 'PEGAWAI') {
      const targetRoles = params.target === 'SEMUA' ? ['SUPERADMIN', 'ADMIN', 'GURU', 'PEGAWAI', 'SISWA'] : params.target === 'GURU' ? ['GURU'] : ['PEGAWAI'];
      const users = await this.prisma.user.findMany({
        where: { role: { in: targetRoles }, phone: { not: null } },
        select: { phone: true, name: true, role: true },
      });
      for (const u of users) {
        if (u.phone && u.phone.trim() !== '') {
          phonesToSend.set(u.phone.trim(), { name: u.name, role: u.role });
        }
      }
    }

    if (params.target === 'SEMUA' || params.target === 'SISWA' || params.target === 'ORANG_TUA') {
      const students = await this.prisma.student.findMany({
        select: { name: true, phone: true, parentPhone: true },
      });
      for (const s of students) {
        if (params.target === 'SEMUA' || params.target === 'SISWA') {
          if (s.phone && s.phone.trim() !== '') {
            phonesToSend.set(s.phone.trim(), { name: s.name, role: 'SISWA' });
          }
        }
        if (params.target === 'SEMUA' || params.target === 'ORANG_TUA') {
          if (s.parentPhone && s.parentPhone.trim() !== '') {
            phonesToSend.set(s.parentPhone.trim(), { name: `Wali dari ${s.name}`, role: 'ORANG_TUA' });
          }
        }
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const [phone, info] of phonesToSend) {
      const res = await this.sendDirectMessage({
        to: phone,
        recipientName: info.name,
        recipientRole: info.role,
        category: 'INFORMASI',
        title: params.title,
        message: formattedMessage,
      });

      if (res.success) successCount++;
      else failCount++;
    }

    return {
      totalTarget: phonesToSend.size,
      successCount,
      failCount,
    };
  }

  /**
   * Retry sending a logged message
   */
  async retryLog(logId: string) {
    const log = await this.prisma.whatsAppLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new Error('Data log tidak ditemukan');

    return this.sendDirectMessage({
      to: log.recipientPhone,
      recipientName: log.recipientName || undefined,
      recipientRole: log.recipientRole || undefined,
      category: (log.category as any) || 'SISTEM',
      title: log.title ? `[RETRY] ${log.title}` : undefined,
      message: log.message,
    });
  }

  /**
   * Clear WhatsApp logs
   */
  async clearLogs() {
    const result = await this.prisma.whatsAppLog.deleteMany();
    return { count: result.count };
  }

  /**
   * Get WhatsApp logs for admin monitoring
   */
  async getLogs(limit = 50, offset = 0, category?: string, status?: string) {
    const where: any = {};
    if (category && category !== 'ALL') where.category = category;
    if (status && status !== 'ALL') where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.whatsAppLog.count({ where }),
    ]);

    return { logs, total };
  }
}
