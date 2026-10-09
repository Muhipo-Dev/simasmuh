import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface EmailOptions {
  to: string;
  subject: string;
  title?: string;
  category?: 'PRESENSI' | 'KEUANGAN' | 'PENGUMUMAN' | 'KEDISIPLINAN' | 'PERIZINAN' | 'DISPENSASI' | 'AKADEMIK' | 'PAYROLL' | 'DISPOSISI' | 'CUTI' | 'SISTEM';
  recipientName?: string;
  contentHtml?: string;
  contentText?: string;
  actionUrl?: string;
  actionText?: string;
  badgeLabel?: string;
  metaDetails?: { label: string; value: string }[];
}

@Injectable()
export class EmailNotificationService implements OnModuleInit {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter | null = null;

  private publicDomainUrl: string = process.env.PUBLIC_DOMAIN_URL || 'https://simasmuh.razagopo.my.id';

  private smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.smamuhipo.sch.id',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER || 'dev@smamuhipo.sch.id',
    pass: process.env.SMTP_PASS || '',
    senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || 'dev@smamuhipo.sch.id',
    senderName: 'SIMASMUH SMA Muhammadiyah 1 Ponorogo',
  };

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadConfigFromDb();
  }

  /**
   * Load SMTP settings and public domain permanently from Setting table in database
   */
  async loadConfigFromDb() {
    try {
      const setting: any = await this.prisma.setting.findFirst();
      if (setting) {
        if (setting.publicDomainUrl) this.publicDomainUrl = setting.publicDomainUrl.trim().replace(/\/+$/, '');
        if (setting.smtpHost) this.smtpConfig.host = setting.smtpHost;
        if (setting.smtpPort) this.smtpConfig.port = Number(setting.smtpPort);
        if (setting.smtpUser) this.smtpConfig.user = setting.smtpUser;
        if (setting.smtpPass) this.smtpConfig.pass = setting.smtpPass;
        if (setting.smtpFrom) this.smtpConfig.senderEmail = setting.smtpFrom;
        if (setting.smtpFromName) this.smtpConfig.senderName = setting.smtpFromName;
        this.logger.log(`[SMTP DB LOADED] Loaded SMTP config from database (Public Domain: ${this.publicDomainUrl})`);
      }
    } catch (e: any) {
      this.logger.warn(`Could not load SMTP config from database: ${e.message}`);
    }

    if (!this.smtpConfig.senderEmail || this.smtpConfig.senderEmail.includes('gmail.com')) {
      if (this.smtpConfig.user && this.smtpConfig.user.includes('@')) {
        this.smtpConfig.senderEmail = this.smtpConfig.user;
      }
    }
    this.initTransporter();
  }

  private initTransporter() {
    const { host, port, user, pass } = this.smtpConfig;

    if (user && pass) {
      const cleanPass = pass.trim().replace(/\s+/g, '');
      const cleanUser = user.trim();
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: cleanUser, pass: cleanPass },
        pool: true, // Reuse existing SMTP socket connection for zero-delay instant dispatch
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
        connectionTimeout: 10000, // 10s timeout
        greetingTimeout: 5000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false, // Prevent SSL handshake delays on shared cPanel hosts
        },
      });
      this.logger.log(`[LIVE MODE] SMTP Email Transporter (Pooled / Instant) active with user: ${cleanUser}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        '[SMTP STANDBY] SMTP credentials (user/pass) pending setup in Superadmin Settings. Live emails will dispatch once App Password is provided.',
      );
    }
  }

  /**
   * Get current SMTP configuration (password masked)
   */
  async getSmtpConfig() {
    // Refresh from DB if needed
    try {
      const setting: any = await this.prisma.setting.findFirst();
      if (setting && setting.smtpHost) {
        this.smtpConfig.host = setting.smtpHost;
        this.smtpConfig.port = Number(setting.smtpPort || 465);
        this.smtpConfig.user = setting.smtpUser || '';
        if (setting.smtpPass) this.smtpConfig.pass = setting.smtpPass;
        this.smtpConfig.senderEmail = setting.smtpFrom || setting.smtpUser || '';
        this.smtpConfig.senderName = setting.smtpFromName || 'SIMASMUH SMA Muhammadiyah 1 Ponorogo';
      }
    } catch {}

    return {
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      user: this.smtpConfig.user,
      hasPassword: !!this.smtpConfig.pass,
      senderEmail: this.smtpConfig.senderEmail,
      senderName: this.smtpConfig.senderName,
      isConfigured: !!(this.smtpConfig.user && this.smtpConfig.pass),
      provider: this.smtpConfig.host.includes('gmail') ? 'GMAIL' : 'CUSTOM',
    };
  }

  /**
   * Update SMTP configuration dynamically and persist to Database & .env
   */
  async updateSmtpConfig(config: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    senderEmail?: string;
    senderName?: string;
  }) {
    if (config.host) this.smtpConfig.host = config.host;
    if (config.port) this.smtpConfig.port = Number(config.port);
    if (config.user !== undefined) this.smtpConfig.user = config.user.trim();
    if (config.pass) this.smtpConfig.pass = config.pass.trim().replace(/\s+/g, '');
    if (config.senderEmail) this.smtpConfig.senderEmail = config.senderEmail.trim();
    if (config.senderName) this.smtpConfig.senderName = config.senderName;

    // 1. Persist Permanently to Database (Setting Table)
    try {
      const existingSetting = await this.prisma.setting.findFirst();
      if (existingSetting) {
        await this.prisma.setting.update({
          where: { id: existingSetting.id },
          data: {
            smtpHost: this.smtpConfig.host,
            smtpPort: this.smtpConfig.port,
            smtpUser: this.smtpConfig.user,
            smtpPass: this.smtpConfig.pass,
            smtpFrom: this.smtpConfig.senderEmail || this.smtpConfig.user,
            smtpFromName: this.smtpConfig.senderName,
          } as any,
        });
        this.logger.log('SMTP configuration successfully saved permanently to Database (Setting table)');
      }
    } catch (e: any) {
      this.logger.error(`Failed to save SMTP config to Database: ${e.message}`);
    }

    // 2. Persist to .env for fallback
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        const updateEnvVar = (key: string, value: string) => {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}="${value}"`);
          } else {
            envContent += `\n${key}="${value}"`;
          }
        };

        if (this.smtpConfig.host) updateEnvVar('SMTP_HOST', this.smtpConfig.host);
        if (this.smtpConfig.port) updateEnvVar('SMTP_PORT', this.smtpConfig.port.toString());
        if (this.smtpConfig.user) updateEnvVar('SMTP_USER', this.smtpConfig.user);
        if (this.smtpConfig.pass) updateEnvVar('SMTP_PASS', this.smtpConfig.pass);
        if (this.smtpConfig.senderEmail) updateEnvVar('SMTP_FROM', this.smtpConfig.senderEmail);

        fs.writeFileSync(envPath, envContent, 'utf-8');
        this.logger.log('SMTP configuration successfully persisted to backend/.env');
      }
    } catch (e: any) {
      this.logger.warn(`Could not persist SMTP to .env: ${e.message}`);
    }

    this.initTransporter();
    return this.getSmtpConfig();
  }

  /**
   * Test SMTP connection with optional real-time test parameters
   */
  async testSmtpConnection(tempConfig?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
  }): Promise<{ success: boolean; message: string; diagnostic?: string }> {
    const host = tempConfig?.host || this.smtpConfig.host;
    const port = Number(tempConfig?.port || this.smtpConfig.port);
    const user = (tempConfig?.user !== undefined ? tempConfig.user : this.smtpConfig.user)?.trim();
    let pass = (tempConfig?.pass !== undefined ? tempConfig.pass : this.smtpConfig.pass);
    if (pass) pass = pass.trim().replace(/\s+/g, '');

    if (!user || !pass) {
      return {
        success: false,
        message: 'Kredensial SMTP (Email Pengirim & Sandi Aplikasi) belum lengkap. Masukkan alamat Gmail dan 16-karakter Sandi Aplikasi (App Password).',
      };
    }

    const testTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    try {
      await testTransporter.verify();
      // If temporary credentials succeeded, apply them automatically to active config
      if (tempConfig && (tempConfig.user || tempConfig.pass)) {
        this.updateSmtpConfig({ host, port, user, pass });
      }
      return {
        success: true,
        message: 'Koneksi ke SMTP Server Google / Mailer berhasil diverifikasi & terhubung aktif!',
      };
    } catch (error: any) {
      const errMsg = error.message || '';
      let diagnostic = '';

      if (
        errMsg.includes('535') ||
        errMsg.includes('BadCredentials') ||
        errMsg.includes('Invalid login')
      ) {
        diagnostic =
          'Google menolak login (Invalid login: 535-5.7.8).\n\nSolusi Resmi:\n1. Jangan gunakan kata sandi akun Google biasa.\n2. Pastikan Verifikasi 2 Langkah (2-Step Verification) telah AKTIF di akun Google Anda.\n3. Buat dan salin 16-karakter Sandi Aplikasi (App Password) dari https://myaccount.google.com/apppasswords lalu tempelkan ke kolom Sandi Aplikasi.';
      } else if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT')) {
        diagnostic = `Koneksi ke host ${host}:${port} terputus / timeout. Pastikan koneksi internet aktif dan port ${port} tidak diblokir ISP.`;
      }

      return {
        success: false,
        message: diagnostic || `Gagal menghubungkan ke SMTP Server: ${errMsg}`,
        diagnostic,
      };
    }
  }

  /**
   * Format template HTML email yang responsif, modern, dan bernuansa SIMASMUH SMA Muhammadiyah 1 Ponorogo
   */
  private generateHtmlTemplate(options: EmailOptions): string {
    const schoolName = 'SMA Muhammadiyah 1 Ponorogo';
    const currentYear = new Date().getFullYear();
    const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
      PRESENSI: { bg: '#ECFDF5', text: '#065F46', border: '#10B981' },
      KEUANGAN: { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
      PAYROLL: { bg: '#FAF5FF', text: '#6B21A8', border: '#A855F7' },
      PENGUMUMAN: { bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6' },
      KEDISIPLINAN: { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B' },
      PERIZINAN: { bg: '#F0FDF4', text: '#166534', border: '#22C55E' },
      DISPENSASI: { bg: '#FFF7ED', text: '#9A3412', border: '#F97316' },
      CUTI: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
      DISPOSISI: { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
      AKADEMIK: { bg: '#EFF6FF', text: '#1E3A8A', border: '#2563EB' },
      SISTEM: { bg: '#F8FAFC', text: '#334155', border: '#64748B' },
    };

    const catStyle = categoryColors[options.category || 'SISTEM'] || categoryColors.SISTEM;

    const metaRows = options.metaDetails && options.metaDetails.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        ${options.metaDetails
          .map(
            (m) => `
          <tr>
            <td style="padding: 10px 14px; color: #64748b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 38%;">${m.label}</td>
            <td style="padding: 10px 14px; color: #1e293b; font-size: 13px; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${m.value}</td>
          </tr>`,
          )
          .join('')}
      </table>
    `
      : '';

    let finalActionUrl = options.actionUrl;
    if (finalActionUrl && finalActionUrl.startsWith('/')) {
      const baseUrl = (this.publicDomainUrl || process.env.PUBLIC_DOMAIN_URL || process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id').replace(/\/+$/, '');
      finalActionUrl = `${baseUrl}${finalActionUrl}`;
    }

    const actionButton = finalActionUrl && options.actionText
      ? `
      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="${finalActionUrl}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
          ${options.actionText} &rarr;
        </a>
      </div>
    `
      : '';

    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${options.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%); padding: 24px 28px; text-align: left;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display: inline-block; font-size: 11px; font-weight: 800; color: #93c5fd; text-transform: uppercase; letter-spacing: 1.5px;">NOTIFIKASI SIMASMUH</span>
                  <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 4px 0 0 0; line-height: 1.3;">${schoolName}</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 28px 28px 20px 28px;">
            <!-- Category Badge -->
            <div style="margin-bottom: 16px;">
              <span style="display: inline-block; padding: 4px 12px; background-color: ${catStyle.bg}; color: ${catStyle.text}; font-size: 12px; font-weight: 700; border-radius: 6px; border: 1px solid ${catStyle.border};">
                ${options.badgeLabel || options.category || 'PEMBERITAHUAN'}
              </span>
            </div>

            <!-- Title -->
            <h2 style="color: #0f172a; font-size: 17px; font-weight: 700; margin: 0 0 14px 0; line-height: 1.4;">
              ${options.title || options.subject}
            </h2>

            <!-- Greeting -->
            <p style="font-size: 14px; color: #475569; margin: 0 0 14px 0; line-height: 1.6;">
              Yth. <strong>${options.recipientName || 'Bapak/Ibu/Siswa'}</strong>,
            </p>

            <!-- Main Body -->
            <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
              ${options.contentHtml || `<p style="margin:0;">${options.contentText || ''}</p>`}
            </div>

            <!-- Meta Details Table -->
            ${metaRows}

            <!-- Action Button -->
            ${actionButton}

            <!-- Note Box -->
            <div style="margin-top: 24px; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                ℹ️ Email otomatis dari <strong>SIMASMUH</strong> — SMA Muhammadiyah 1 Ponorogo.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
              © ${currentYear} ${schoolName}. Semua hak dilindungi.
            </p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
              Kelola notifikasi via menu Pengaturan di SIMASMUH.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  /**
   * Kirim notifikasi email ke alamat tujuan (Google / Gmail)
   */
  async sendEmailNotification(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
    const senderEmail =
      this.smtpConfig.senderEmail ||
      this.smtpConfig.user ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'dev@smamuhipo.sch.id';
    const fromName =
      this.smtpConfig.senderName || 'SIMASMUH SMA Muhammadiyah 1 Ponorogo';
    const htmlBody = this.generateHtmlTemplate(options);

    try {
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: `"${fromName}" <${senderEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.contentText || options.title || options.subject,
          html: htmlBody,
        });

        this.logger.log(`[EMAIL DISPATCHED] To: ${options.to} | Subject: ${options.subject} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId, simulated: false };
      } else {
        // Mode Simulasi dengan output terstruktur aman
        this.logger.log(`[SIMULATED EMAIL PUSH] To: ${options.to} | Subject: ${options.subject} | Category: ${options.category || 'SISTEM'}`);
        return { success: true, messageId: `sim-${Date.now()}`, simulated: true };
      }
    } catch (error: any) {
      this.logger.error(`[EMAIL ERROR] Failed sending to ${options.to}: ${error.message}`);
      return { success: false, error: error.message, simulated: false };
    }
  }

  /**
   * Kirim Email Notifikasi Presensi Siswa/Guru
   */
  async sendAttendanceNotification(params: {
    toEmail: string;
    studentOrUserName: string;
    status: string;
    time: string;
    dateFormatted: string;
    role?: string;
    type?: 'MASUK' | 'PULANG' | 'TERLAMBAT' | 'IZIN';
  }) {
    const isMasuk = params.type === 'MASUK' || params.status.toUpperCase() === 'HADIR';
    const badge = isMasuk ? 'PRESENSI MASUK' : 'PRESENSI PULANG';
    const subject = `[Presensi] ${params.studentOrUserName} - ${params.dateFormatted}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Presensi: ${params.studentOrUserName}`,
      category: 'PRESENSI',
      badgeLabel: badge,
      recipientName: params.studentOrUserName,
      contentText: `Presensi tercatat: ${params.status}.`,
      metaDetails: [
        { label: 'Nama', value: params.studentOrUserName },
        { label: 'Tanggal', value: params.dateFormatted },
        { label: 'Waktu Tercatat', value: params.time },
        { label: 'Status Kehadiran', value: params.status },
      ],
      actionUrl: '/presensi/harian',
      actionText: 'Lihat Presensi',
    });
  }

  /**
   * Kirim Email Notifikasi Tagihan / SPP Baru
   */
  async sendTagihanNotification(params: {
    toEmail: string;
    recipientName: string;
    studentName: string;
    tagihanType: string;
    amountFormatted: string;
    monthYear: string;
    dueDateFormatted?: string;
  }) {
    const subject = `[Tagihan] ${params.tagihanType} - ${params.studentName}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Tagihan ${params.tagihanType}`,
      category: 'KEUANGAN',
      badgeLabel: 'TAGIHAN KEUANGAN',
      recipientName: params.recipientName,
      contentText: `Tagihan ${params.tagihanType} a.n. ${params.studentName} periode ${params.monthYear} telah terbit.`,
      metaDetails: [
        { label: 'Nama Siswa', value: params.studentName },
        { label: 'Jenis Tagihan', value: params.tagihanType },
        { label: 'Periode', value: params.monthYear },
        { label: 'Total Nominal', value: params.amountFormatted },
        { label: 'Jatuh Tempo', value: params.dueDateFormatted || 'Tanggal 10 setiap bulan' },
      ],
      actionUrl: '/keuangan/tagihan-saya',
      actionText: 'Lihat Tagihan',
    });
  }

  /**
   * Kirim Email Notifikasi Bukti Bayar / Kwitansi Lunas
   */
  async sendPaymentReceiptNotification(params: {
    toEmail: string;
    recipientName: string;
    studentName: string;
    tagihanType: string;
    amountFormatted: string;
    paidDateFormatted: string;
    receiptNumber: string;
  }) {
    const subject = `[Lunas] ${params.tagihanType} - ${params.studentName}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Kwitansi Lunas (${params.receiptNumber})`,
      category: 'KEUANGAN',
      badgeLabel: 'LUNAS / VERIFIED',
      recipientName: params.recipientName,
      contentText: `Pembayaran ${params.tagihanType} sebesar ${params.amountFormatted} telah diverifikasi lunas.`,
      metaDetails: [
        { label: 'Nomor Kwitansi', value: params.receiptNumber },
        { label: 'Nama Siswa', value: params.studentName },
        { label: 'Pembayaran', value: params.tagihanType },
        { label: 'Nominal Terverifikasi', value: params.amountFormatted },
        { label: 'Tanggal Verifikasi', value: params.paidDateFormatted },
      ],
      actionUrl: '/keuangan/riwayat',
      actionText: 'Lihat Kwitansi',
    });
  }

  /**
   * Kirim Email Notifikasi Penerbitan Slip Gaji & Tunjangan Bulanan (Payroll) Pegawai
   */
  async sendPayrollNotification(params: {
    toEmail: string;
    employeeName: string;
    periodFormatted: string;
    netSalaryFormatted: string;
    totalHours?: number;
    attendanceDays?: number;
    bankAccountInfo?: string;
  }) {
    const subject = `[Slip Gaji] Penggajian Periode ${params.periodFormatted} - ${params.employeeName}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Slip Gaji & Honorarium (${params.periodFormatted})`,
      category: 'PAYROLL',
      badgeLabel: 'SLIP GAJI RESMI',
      recipientName: params.employeeName,
      contentText: `Rincian slip gaji, honorarium mengajar, dan tunjangan kehadiran bulan <strong>${params.periodFormatted}</strong> telah diterbitkan secara resmi oleh Bagian Keuangan.`,
      metaDetails: [
        { label: 'Nama Pegawai', value: params.employeeName },
        { label: 'Periode Bulan', value: params.periodFormatted },
        { label: 'Gaji Bersih (Take Home Pay)', value: params.netSalaryFormatted },
        ...(params.attendanceDays ? [{ label: 'Kehadiran Kerja', value: `${params.attendanceDays} Hari` }] : []),
        ...(params.totalHours ? [{ label: 'Total Jam Mengajar', value: `${params.totalHours} Jam` }] : []),
        ...(params.bankAccountInfo ? [{ label: 'Rekening Penyaluran', value: params.bankAccountInfo }] : []),
      ],
      actionUrl: '/keuangan/slip-gaji-saya',
      actionText: 'Buka & Unduh Slip Gaji',
    });
  }

  /**
   * Kirim Email Notifikasi Disposisi & Surat Tugas Pegawai
   */
  async sendDisposisiNotification(params: {
    toEmail: string;
    employeeName: string;
    mailNumber: string;
    perihal: string;
    senderAgency: string;
    instructionText: string;
  }) {
    const subject = `[Disposisi] Surat Masuk: ${params.mailNumber} - ${params.perihal}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Disposisi Surat Masuk: ${params.mailNumber}`,
      category: 'DISPOSISI',
      badgeLabel: 'DISPOSISI DINAS',
      recipientName: params.employeeName,
      contentText: `Anda menerima instruksi lembar disposisi baru dari Kepala Sekolah / Pimpinan.`,
      metaDetails: [
        { label: 'Nomor Surat', value: params.mailNumber },
        { label: 'Asal Surat', value: params.senderAgency },
        { label: 'Perihal', value: params.perihal },
        { label: 'Instruksi / Catatan', value: params.instructionText },
      ],
      actionUrl: '/tu/surat-masuk',
      actionText: 'Lihat Lembar Disposisi',
    });
  }

  /**
   * Kirim Email Notifikasi Status Persetujuan Cuti & Izin Pegawai
   */
  async sendLeaveNotification(params: {
    toEmail: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: 'DISETUJUI' | 'DITOLAK' | 'MENUNGGU';
    approverName?: string;
    notes?: string;
  }) {
    const subject = `[Cuti Pegawai] Pengajuan ${params.leaveType} (${params.status})`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Pengajuan Cuti / Izin Pegawai`,
      category: 'CUTI',
      badgeLabel: `CUTI: ${params.status}`,
      recipientName: params.employeeName,
      contentText: `Status permohonan ${params.leaveType} Anda telah diperbarui menjadi <strong>${params.status}</strong>.`,
      metaDetails: [
        { label: 'Nama Pegawai', value: params.employeeName },
        { label: 'Jenis Permohonan', value: params.leaveType },
        { label: 'Rentang Tanggal', value: `${params.startDate} s/d ${params.endDate}` },
        { label: 'Status Verifikasi', value: params.status },
        ...(params.approverName ? [{ label: 'Diverifikasi Oleh', value: params.approverName }] : []),
        ...(params.notes ? [{ label: 'Catatan / Alasan', value: params.notes }] : []),
      ],
      actionUrl: '/kepegawaian/cuti',
      actionText: 'Lihat Riwayat Cuti',
    });
  }

  /**
   * Kirim Email Notifikasi Supervisi / Verifikasi Perangkat Ajar Guru
   */
  async sendTeachingDeviceNotification(params: {
    toEmail: string;
    teacherName: string;
    subjectName: string;
    className: string;
    deviceType: string;
    status: string;
    supervisorName: string;
    feedback?: string;
  }) {
    const subject = `[Perangkat Ajar] ${params.deviceType} ${params.subjectName} - ${params.status}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Supervisi Perangkat Ajar (${params.subjectName})`,
      category: 'AKADEMIK',
      badgeLabel: 'PERANGKAT AJAR',
      recipientName: params.teacherName,
      contentText: `Dokumen ${params.deviceType} untuk mata pelajaran <strong>${params.subjectName}</strong> kelas <strong>${params.className}</strong> telah diverifikasi oleh tim supervisi akademik.`,
      metaDetails: [
        { label: 'Guru Pengampu', value: params.teacherName },
        { label: 'Mata Pelajaran', value: params.subjectName },
        { label: 'Kelas', value: params.className },
        { label: 'Dokumen', value: params.deviceType },
        { label: 'Status Supervisi', value: params.status },
        { label: 'Supervisor / Penilai', value: params.supervisorName },
        ...(params.feedback ? [{ label: 'Umpan Balik / Catatan', value: params.feedback }] : []),
      ],
      actionUrl: '/akademik/perangkat-ajar',
      actionText: 'Buka Perangkat Ajar',
    });
  }

  /**
   * Kirim Email Notifikasi Poin Kedisiplinan, Prestasi, dan Bimbingan Siswa ke Siswa / Wali Murid
   */
  async sendDisciplineNotification(params: {
    toEmail: string;
    recipientName: string;
    studentName: string;
    className: string;
    category: string;
    title: string;
    points: number;
    description?: string;
    actionTaken?: string;
    evaluatorOrVerifierName?: string;
    currentScore?: number;
    currentGrade?: string;
  }) {
    const isPelanggaran = params.category === 'PELANGGARAN' || params.points < 0;
    const isPrestasi = params.category === 'PRESTASI_PENGHARGAAN' || params.points > 0;
    const pointLabel = `${params.points > 0 ? '+' : ''}${params.points} Poin`;
    const subjectPrefix = isPelanggaran
      ? '[Catatan Kedisiplinan]'
      : isPrestasi
      ? '[Prestasi Siswa]'
      : '[Bimbingan Karakter]';
    const subject = `${subjectPrefix} ${params.studentName} (${params.className}) - ${params.title}`;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `${params.category.replace('_', ' ')}: ${params.title}`,
      category: 'KEDISIPLINAN',
      badgeLabel: `${params.category.replace('_', ' ')} (${pointLabel})`,
      recipientName: params.recipientName,
      contentText: params.description
        ? `${params.description}. Poin evaluasi: <strong>${pointLabel}</strong>.`
        : `Tercatat evaluasi ${params.title} dengan bobot <strong>${pointLabel}</strong>.`,
      metaDetails: [
        { label: 'Nama Siswa', value: params.studentName },
        { label: 'Kelas', value: params.className },
        { label: 'Kategori Evaluasi', value: params.category.replace('_', ' ') },
        { label: 'Bobot Poin', value: pointLabel },
        ...(params.actionTaken ? [{ label: 'Tindak Lanjut / Pembinaan', value: params.actionTaken }] : []),
        ...(params.evaluatorOrVerifierName ? [{ label: 'Pencatat / Pembina', value: params.evaluatorOrVerifierName }] : []),
        ...(params.currentScore !== undefined ? [{ label: 'Total Skor Kedisiplinan', value: `${params.currentScore} Poin ${params.currentGrade ? `(${params.currentGrade})` : ''}` }] : []),
      ],
      actionUrl: '/akademik/etika-tatib',
      actionText: 'Buka Catatan Siswa',
    });
  }

  /**
   * Kirim Email Notifikasi Ringkasan Jadwal Mengajar Harian Guru
   */
  async sendTeacherDailyScheduleNotification(params: {
    toEmail: string;
    teacherName: string;
    dayName: string;
    dateFormatted: string;
    totalSessions: number;
    scheduleTableHtml: string;
  }) {
    const subject = `[Jadwal Mengajar] ${params.dayName}, ${params.dateFormatted} - ${params.teacherName}`;

    const contentHtml = `
      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Yth. <strong>${params.teacherName}</strong>, berikut adalah agenda dan jadwal mengajar Anda untuk hari <strong>${params.dayName}, ${params.dateFormatted}</strong>:
        </p>
        <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 12px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #0f766e; color: #ffffff;">
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Waktu</th>
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Kelas</th>
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Mata Pelajaran</th>
                <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Ruang / Lokasi</th>
              </tr>
            </thead>
            <tbody>
              ${params.scheduleTableHtml}
            </tbody>
          </table>
        </div>
        <p style="margin: 14px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
          📝 <em>Jangan lupa untuk mengisi jurnal mengajar & presensi kelas setelah sesi pembelajaran berakhir. Selamat bertugas!</em>
        </p>
      </div>
    `;

    return this.sendEmailNotification({
      to: params.toEmail,
      subject,
      title: `Jadwal Mengajar Hari ${params.dayName}`,
      category: 'AKADEMIK',
      badgeLabel: 'JADWAL MENGAJAR GURU',
      recipientName: params.teacherName,
      contentHtml,
      metaDetails: [
        { label: 'Nama Guru', value: params.teacherName },
        { label: 'Hari & Tanggal', value: `${params.dayName}, ${params.dateFormatted}` },
        { label: 'Total Sesi Mengajar', value: `${params.totalSessions} Sesi Kelas` },
      ],
      actionUrl: '/akademik/jadwal-mengajar',
      actionText: 'Buka Jadwal Mengajar',
    });
  }
}
