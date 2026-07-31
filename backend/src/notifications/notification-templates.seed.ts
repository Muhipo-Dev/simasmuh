import { PrismaService } from '../prisma/prisma.service';

export const defaultNotificationTemplates = [
  {
    type: 'TAGIHAN_CREATED',
    title: 'Tagihan Baru Dibuat',
    message: 'Tagihan {{tagihanType}} sebesar {{amount}} telah dibuat. Jatuh tempo: {{dueDate}}',
    emailSubject: 'Tagihan Baru - {{tagihanType}}',
    emailBody: `
      <h2>Tagihan Baru Telah Dibuat</h2>
      <p>Yth. {{studentName}},</p>
      <p>Tagihan <strong>{{tagihanType}}</strong> sebesar <strong>{{amount}}</strong> telah dibuat untuk Anda.</p>
      <ul>
        <li>Jenis Tagihan: {{tagihanType}}</li>
        <li>Jumlah: {{amount}}</li>
        <li>Jatuh Tempo: {{dueDate}}</li>
        <li>Bulan: {{month}}</li>
        <li>Tahun: {{year}}</li>
      </ul>
      <p>Mohon segera lakukan pembayaran sebelum jatuh tempo untuk menghindari denda.</p>
      <p>Terima kasih.</p>
    `,
    smsTemplate: 'Tagihan {{tagihanType}} {{amount}} jatuh tempo {{dueDate}}. Mohon segera bayar.',
    isActive: true,
  },
  {
    type: 'PAYMENT_UPLOADED',
    title: 'Bukti Pembayaran Diupload',
    message: 'Bukti pembayaran sebesar {{amount}} telah berhasil diupload dan sedang menunggu verifikasi.',
    emailSubject: 'Bukti Pembayaran Berhasil Diupload',
    emailBody: `
      <h2>Bukti Pembayaran Berhasil Diupload</h2>
      <p>Yth. {{studentName}},</p>
      <p>Bukti pembayaran Anda sebesar <strong>{{amount}}</strong> telah berhasil diupload.</p>
      <p>Status: <strong>Menunggu Verifikasi</strong></p>
      <p>Tim keuangan akan segera memverifikasi pembayaran Anda dalam 1-2 hari kerja.</p>
      <p>Terima kasih.</p>
    `,
    smsTemplate: 'Bukti pembayaran {{amount}} berhasil diupload. Status: Menunggu verifikasi.',
    isActive: true,
  },
  {
    type: 'PAYMENT_VERIFIED',
    title: 'Pembayaran Diverifikasi',
    message: 'Bukti pembayaran sebesar {{amount}} telah diverifikasi dan diterima. Tagihan telah lunas.',
    emailSubject: 'Pembayaran Berhasil Diverifikasi',
    emailBody: `
      <h2>Pembayaran Berhasil Diverifikasi</h2>
      <p>Yth. {{studentName}},</p>
      <p>Selamat! Bukti pembayaran Anda sebesar <strong>{{amount}}</strong> telah diverifikasi dan diterima.</p>
      <p>Status Tagihan: <strong>LUNAS</strong></p>
      <p>Terverifikasi oleh: {{verifiedBy}}</p>
      <p>Terima kasih atas pembayaran tepat waktu Anda.</p>
    `,
    smsTemplate: 'Pembayaran {{amount}} telah diverifikasi. Status: LUNAS. Terima kasih.',
    isActive: true,
  },
  {
    type: 'PAYMENT_REJECTED',
    title: 'Pembayaran Ditolak',
    message: 'Bukti pembayaran sebesar {{amount}} ditolak. {{notes}}',
    emailSubject: 'Bukti Pembayaran Ditolak',
    emailBody: `
      <h2>Bukti Pembayaran Ditolak</h2>
      <p>Yth. {{studentName}},</p>
      <p>Mohon maaf, bukti pembayaran Anda sebesar <strong>{{amount}}</strong> tidak dapat diverifikasi.</p>
      <p><strong>Alasan penolakan:</strong> {{notes}}</p>
      <p>Mohon upload ulang bukti pembayaran yang benar dan jelas.</p>
      <p>Jika ada pertanyaan, silakan hubungi bagian keuangan.</p>
    `,
    smsTemplate: 'Bukti pembayaran {{amount}} ditolak. Alasan: {{notes}}. Mohon upload ulang.',
    isActive: true,
  },
  {
    type: 'PAYMENT_DUE',
    title: 'Pengingat Pembayaran',
    message: 'Tagihan {{tagihanType}} sebesar {{amount}} akan jatuh tempo dalam {{daysUntilDue}} hari.',
    emailSubject: 'Pengingat Jatuh Tempo Pembayaran',
    emailBody: `
      <h2>Pengingat Jatuh Tempo Pembayaran</h2>
      <p>Yth. {{studentName}},</p>
      <p>Kami ingatkan bahwa tagihan <strong>{{tagihanType}}</strong> sebesar <strong>{{amount}}</strong> akan jatuh tempo dalam <strong>{{daysUntilDue}} hari</strong>.</p>
      <p>Jatuh tempo: {{dueDate}}</p>
      <p>Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan.</p>
      <p>Terima kasih.</p>
    `,
    smsTemplate: 'Pengingat: Tagihan {{tagihanType}} {{amount}} jatuh tempo {{daysUntilDue}} hari lagi.',
    isActive: true,
  },
  {
    type: 'PAYMENT_OVERDUE',
    title: 'Pembayaran Terlambat',
    message: 'Tagihan {{tagihanType}} sebesar {{amount}} sudah terlambat {{daysOverdue}} hari.',
    emailSubject: 'URGENT: Pembayaran Terlambat',
    emailBody: `
      <h2>URGENT: Pembayaran Terlambat</h2>
      <p>Yth. {{studentName}},</p>
      <p>Tagihan <strong>{{tagihanType}}</strong> sebesar <strong>{{amount}}</strong> sudah terlambat <strong>{{daysOverdue}} hari</strong> dari jatuh tempo.</p>
      <p>Mohon segera lakukan pembayaran untuk menghindari:</p>
      <ul>
        <li>Denda keterlambatan</li>
        <li>Sanksi akademik</li>
        <li>Pemblokiran layanan akademik</li>
      </ul>
      <p>Segera hubungi bagian keuangan jika ada kendala pembayaran.</p>
    `,
    smsTemplate: 'URGENT: Tagihan {{tagihanType}} {{amount}} terlambat {{daysOverdue}} hari. Segera bayar!',
    isActive: true,
  },
  {
    type: 'BULK_TAGIHAN_CREATED',
    title: 'Tagihan Massal Dibuat',
    message: 'Tagihan {{tagihanType}} sebesar {{amount}} telah dibuat untuk seluruh siswa kelas {{className}}.',
    emailSubject: 'Tagihan Massal - {{tagihanType}}',
    emailBody: `
      <h2>Tagihan Massal Telah Dibuat</h2>
      <p>Yth. Siswa Kelas {{className}},</p>
      <p>Tagihan <strong>{{tagihanType}}</strong> sebesar <strong>{{amount}}</strong> telah dibuat untuk seluruh siswa di kelas Anda.</p>
      <p>Jumlah siswa yang terkena tagihan: {{count}} orang</p>
      <p>Mohon segera cek tagihan Anda dan lakukan pembayaran sesuai jadwal yang ditentukan.</p>
      <p>Terima kasih.</p>
    `,
    smsTemplate: 'Tagihan massal {{tagihanType}} {{amount}} dibuat untuk kelas {{className}}.',
    isActive: true,
  },
  {
    type: 'SUSPICIOUS_ACTIVITY',
    title: 'Aktivitas Mencurigakan Terdeteksi',
    message: 'Aktivitas yang mencurigakan terdeteksi pada akun Anda: {{incidentType}}.',
    emailSubject: 'SECURITY ALERT: Aktivitas Mencurigakan',
    emailBody: `
      <h2>PERINGATAN KEAMANAN</h2>
      <p>Yth. {{userName}},</p>
      <p>Sistem keamanan kami telah mendeteksi aktivitas yang mencurigakan pada akun Anda.</p>
      <p><strong>Jenis Aktivitas:</strong> {{incidentType}}</p>
      <p><strong>Waktu:</strong> {{timestamp}}</p>
      <p>Jika ini bukan aktivitas Anda:</p>
      <ul>
        <li>Segera ganti password akun Anda</li>
        <li>Hubungi administrator sistem</li>
        <li>Periksa aktivitas akun Anda</li>
      </ul>
      <p>Jika ini adalah aktivitas Anda, abaikan pesan ini.</p>
    `,
    smsTemplate: 'ALERT: Aktivitas mencurigakan terdeteksi. {{incidentType}}. Hubungi admin jika bukan Anda.',
    isActive: true,
  },
  {
    type: 'FILE_QUARANTINED',
    title: 'File Dikarantina',
    message: 'File yang Anda upload telah dikarantina karena terdeteksi sebagai file berbahaya.',
    emailSubject: 'File Upload Dikarantina',
    emailBody: `
      <h2>File Upload Dikarantina</h2>
      <p>Yth. {{userName}},</p>
      <p>File yang Anda upload telah dikarantina oleh sistem keamanan kami.</p>
      <p><strong>Nama File:</strong> {{fileName}}</p>
      <p><strong>Alasan:</strong> {{reason}}</p>
      <p>Mohon upload ulang dengan file yang aman dan sesuai ketentuan.</p>
      <p>Jika Anda yakin file tersebut aman, hubungi administrator untuk review manual.</p>
    `,
    smsTemplate: 'File {{fileName}} dikarantina. Alasan: {{reason}}. Upload ulang file yang aman.',
    isActive: true,
  },
];

export async function seedNotificationTemplates(prisma: PrismaService) {
  console.log('Seeding notification templates...');
  
  for (const template of defaultNotificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { type: template.type },
      update: template,
      create: template,
    });
  }
  
  console.log(`Seeded ${defaultNotificationTemplates.length} notification templates`);
}