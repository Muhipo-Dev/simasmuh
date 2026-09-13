import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface ChatbotSession {
  phone: string;
  step: 'IDLE' | 'AWAIT_STUDENT_SELECT' | 'AWAIT_IZIN_TYPE' | 'AWAIT_DATES' | 'AWAIT_REASON' | 'AWAIT_CONFIRM';
  parentUser?: any;
  students?: any[];
  selectedStudent?: any;
  jenisIzin?: 'SAKIT' | 'KEPERLUAN_KELUARGA' | 'IZIN_LAIN';
  tanggalMulai?: string;
  tanggalSelesai?: string;
  alasan?: string;
  lastActive: number;
}

export interface WebhookIncomingMessage {
  from: string; // Nomor WhatsApp pengirim (e.g. 6288293733330 or 088293733330)
  name?: string;
  message: string;
  timestamp?: number;
}

@Injectable()
export class WhatsappChatbotService {
  private readonly logger = new Logger(WhatsappChatbotService.name);
  private sessions = new Map<string, ChatbotSession>();

  constructor(private prisma: PrismaService) {}

  /**
   * Normalisasi nomor telepon ke format lokal dan internasional
   */
  private cleanPhone(phone: string): string {
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.startsWith('62')) {
      clean = '0' + clean.slice(2);
    }
    return clean;
  }

  /**
   * Ambil session user atau inisialisasi baru
   */
  private getSession(phone: string): ChatbotSession {
    const clean = this.cleanPhone(phone);
    const existing = this.sessions.get(clean);
    const now = Date.now();
    // Reset session jika idle lebih dari 15 menit
    if (existing && now - existing.lastActive < 15 * 60 * 1000) {
      existing.lastActive = now;
      return existing;
    }

    const newSession: ChatbotSession = {
      phone: clean,
      step: 'IDLE',
      lastActive: now,
    };
    this.sessions.set(clean, newSession);
    return newSession;
  }

  /**
   * Reset session user
   */
  private resetSession(phone: string) {
    const clean = this.cleanPhone(phone);
    this.sessions.delete(clean);
  }

  /**
   * Handler utama pesan masuk WhatsApp webhook
   */
  async handleIncomingMessage(payload: WebhookIncomingMessage): Promise<{
    replyMessage: string;
    shouldSend: boolean;
    status: 'PROCESSED' | 'SAVED' | 'UNRECOGNIZED' | 'RESET';
    createdIzin?: any;
  }> {
    const senderRaw = payload.from || '';
    const text = (payload.message || '').trim();
    const cleanSender = this.cleanPhone(senderRaw);

    this.logger.log(`[WA CHATBOT] Pesan Masuk dari ${cleanSender}: "${text}"`);

    // Perintah Batal / Reset
    if (
      text.toLowerCase() === 'batal' ||
      text.toLowerCase() === 'cancel' ||
      text.toLowerCase() === 'keluar' ||
      text.toLowerCase() === 'reset'
    ) {
      this.resetSession(cleanSender);
      return {
        replyMessage:
          '👋 Sesi pelaporan izin via WhatsApp telah dibatalkan.\n\nKetik *IZIN* atau *HALO* kapan saja jika Bapak/Ibu ingin mengajukan permohonan izin ketidakhadiran siswa kembali.',
        shouldSend: true,
        status: 'RESET',
      };
    }

    // 1. Identifikasi profil wali murid berdasarkan nomor WA pengirim di basis data SIMASMUH
    const parentUser = await this.findParentByPhone(cleanSender);

    const session = this.getSession(cleanSender);
    session.parentUser = parentUser;

    // Perintah Menu Bantuan
    if (
      text.toLowerCase() === 'menu' ||
      text.toLowerCase() === 'bantuan' ||
      text.toLowerCase() === 'help' ||
      text.toLowerCase() === 'halo' ||
      text.toLowerCase() === 'hai' ||
      text.toLowerCase() === 'p'
    ) {
      return {
        replyMessage: this.buildGreetingMessage(parentUser),
        shouldSend: true,
        status: 'PROCESSED',
      };
    }

    // Workflow Form Wizard Percakapan Chatbot Izin
    return await this.processConversationStep(session, text, cleanSender);
  }

  /**
   * Cari data Orang Tua / Siswa berdasarkan nomor telepon
   */
  private async findParentByPhone(cleanPhone: string) {
    // Cari dari User dengan role WALI_MURID atau no telepon/username yang cocok
    const variations = [
      cleanPhone,
      cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : '0' + cleanPhone,
      cleanPhone.replace(/^0/, ''),
    ];

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: { in: variations } },
          { username: { in: variations } },
        ],
      },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: true,
                    user: true,
                  },
                },
              },
            },
          },
        },
        student: {
          include: {
            class: true,
            user: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Greeting message & panduan
   */
  private buildGreetingMessage(parentUser: any): string {
    const parentName = parentUser?.name || 'Bapak/Ibu Wali Murid';
    return (
      `Assalamu'alaikum Wr. Wb. Selamat datang di *Layanan WhatsApp Chatbot SIMASMUH*\n` +
      `SMA Muhammadiyah 1 Ponorogo 🏫\n\n` +
      `Halo *${parentName}*,\n` +
      `Layanan ini siap membantu Anda mengajukan izin ketidakhadiran (Sakit / Izin Keperluan Keluarga) ananda secara otomatis dan langsung tersinkronisasi ke sistem sekolah.\n\n` +
      `📌 *Panduan Penggunaan:*\n` +
      `• Ketik *IZIN* untuk mulai melaporkan izin/sakit ananda\n` +
      `• Ketik *BATAL* untuk membatalkan proses kapan saja\n` +
      `• Ketik *BANTUAN* untuk menampilkan pesan ini kembali\n\n` +
      `Layanan resmi SIMASMUH SMA Muhammadiyah 1 Ponorogo.`
    );
  }

  /**
   * Alur State Machine Percakapan Wizard Izin
   */
  private async processConversationStep(
    session: ChatbotSession,
    input: string,
    senderPhone: string,
  ): Promise<{
    replyMessage: string;
    shouldSend: boolean;
    status: 'PROCESSED' | 'SAVED' | 'UNRECOGNIZED' | 'RESET';
    createdIzin?: any;
  }> {
    const textLower = input.toLowerCase();

    // STEP 0: Inisiasi Permohonan Izin
    if (session.step === 'IDLE') {
      if (
        textLower.includes('izin') ||
        textLower.includes('sakit') ||
        textLower.includes('absen') ||
        textLower.includes('lapor')
      ) {
        // Ambil daftar siswa yang terhubung dengan akun orang tua ini
        let studentsList: any[] = [];
        if (session.parentUser?.parentProfile?.students?.length) {
          studentsList = session.parentUser.parentProfile.students.map(
            (ps: any) => ps.student,
          );
        } else if (session.parentUser?.student) {
          studentsList = [session.parentUser.student];
        } else {
          // Jika nomor WA belum terdaftar sebagai wali murid spesifik, cari berdasarkan NIS atau nama
          session.step = 'AWAIT_STUDENT_SELECT';
          return {
            replyMessage:
              `📋 *Pelaporan Izin Ketidakhadiran Siswa*\n\n` +
              `Nomor WhatsApp Anda belum terdaftar otomatis pada akun wali murid.\n` +
              `Silakan ketik *NIS (Nomor Induk Siswa)* atau *Nama Lengkap Siswa* yang ingin dilaporkan:`,
            shouldSend: true,
            status: 'PROCESSED',
          };
        }

        session.students = studentsList;

        if (studentsList.length === 1) {
          session.selectedStudent = studentsList[0];
          session.step = 'AWAIT_IZIN_TYPE';
          return {
            replyMessage:
              `📋 *Pelaporan Izin Siswa SIMASMUH*\n\n` +
              `Siswa Terpilih: *${session.selectedStudent.name}* (Kelas: ${session.selectedStudent.class?.name || '-'})\n\n` +
              `Silakan pilih jenis permohonan izin (Ketik angka atau kata):\n` +
              `1️⃣ *SAKIT* (Ketik 1 atau Sakit)\n` +
              `2️⃣ *KEPERLUAN KELUARGA* (Ketik 2 atau Izin)\n` +
              `3️⃣ *IZIN LAINNYA* (Ketik 3)`,
            shouldSend: true,
            status: 'PROCESSED',
          };
        } else {
          // Jika ada lebih dari 1 siswa terhubung
          session.step = 'AWAIT_STUDENT_SELECT';
          let optionsText = `📋 *Pilih Ananda yang Ingin Dilaporkan Izin:*\n\n`;
          studentsList.forEach((st, idx) => {
            optionsText += `${idx + 1}️⃣ *${st.name}* (NIS: ${st.nis}, Kelas: ${st.class?.name || '-'})\n`;
          });
          optionsText += `\nSilakan ketik nomor urut ananda (misal: 1 atau 2):`;
          return {
            replyMessage: optionsText,
            shouldSend: true,
            status: 'PROCESSED',
          };
        }
      } else {
        return {
          replyMessage:
            `👋 Halo! Ketik *IZIN* untuk mulai melaporkan permohonan izin/sakit ananda ke sistem SIMASMUH, atau ketik *BANTUAN* untuk panduan lengkap.`,
          shouldSend: true,
          status: 'UNRECOGNIZED',
        };
      }
    }

    // STEP 1: Pemilihan Siswa (Jika manual atau multi-siswa)
    if (session.step === 'AWAIT_STUDENT_SELECT') {
      if (session.students && session.students.length > 0) {
        const choice = parseInt(input, 10);
        if (!isNaN(choice) && choice >= 1 && choice <= session.students.length) {
          session.selectedStudent = session.students[choice - 1];
          session.step = 'AWAIT_IZIN_TYPE';
          return {
            replyMessage:
              `✅ Siswa Terpilih: *${session.selectedStudent.name}* (${session.selectedStudent.class?.name || '-'})\n\n` +
              `Silakan pilih jenis permohonan izin (Ketik angka atau kata):\n` +
              `1️⃣ *SAKIT* (Ketik 1 atau Sakit)\n` +
              `2️⃣ *KEPERLUAN KELUARGA* (Ketik 2 atau Izin)\n` +
              `3️⃣ *IZIN LAINNYA* (Ketik 3)`,
            shouldSend: true,
            status: 'PROCESSED',
          };
        }
      }

      // Cari siswa di database berdasarkan NIS atau Nama
      const cleanKeyword = input.trim();
      const matchedStudents = await this.prisma.student.findMany({
        where: {
          OR: [
            { nis: cleanKeyword },
            { nisn: cleanKeyword },
            { name: { contains: cleanKeyword, mode: 'insensitive' } },
          ],
        },
        include: { class: true, user: true },
        take: 5,
      });

      if (matchedStudents.length === 0) {
        return {
          replyMessage:
            `⚠️ Siswa dengan NIS/Nama "*${cleanKeyword}*" tidak ditemukan di sistem SIMASMUH.\n\n` +
            `Silakan periksa kembali dan ketik NIS yang benar, atau ketik *BATAL* untuk keluar.`,
          shouldSend: true,
          status: 'PROCESSED',
        };
      }

      if (matchedStudents.length === 1) {
        session.selectedStudent = matchedStudents[0];
        session.step = 'AWAIT_IZIN_TYPE';
        return {
          replyMessage:
            `✅ Ditemukan Siswa: *${session.selectedStudent.name}* (NIS: ${session.selectedStudent.nis}, Kelas: ${session.selectedStudent.class?.name || '-'})\n\n` +
            `Silakan pilih jenis izin:\n` +
            `1️⃣ *SAKIT* (Ketik 1 atau Sakit)\n` +
            `2️⃣ *KEPERLUAN KELUARGA* (Ketik 2 atau Izin)\n` +
            `3️⃣ *IZIN LAINNYA* (Ketik 3)`,
          shouldSend: true,
          status: 'PROCESSED',
        };
      } else {
        session.students = matchedStudents;
        let listText = `🔍 Ditemukan beberapa siswa yang cocok:\n\n`;
        matchedStudents.forEach((st, idx) => {
          listText += `${idx + 1}️⃣ *${st.name}* (NIS: ${st.nis}, Kelas: ${st.class?.name || '-'})\n`;
        });
        listText += `\nSilakan balas dengan mengetik nomor urut siswa (misal: 1):`;
        return {
          replyMessage: listText,
          shouldSend: true,
          status: 'PROCESSED',
        };
      }
    }

    // STEP 2: Pemilihan Jenis Izin
    if (session.step === 'AWAIT_IZIN_TYPE') {
      if (textLower === '1' || textLower.includes('sakit')) {
        session.jenisIzin = 'SAKIT';
      } else if (
        textLower === '2' ||
        textLower.includes('keluarga') ||
        textLower.includes('izin')
      ) {
        session.jenisIzin = 'KEPERLUAN_KELUARGA';
      } else if (textLower === '3' || textLower.includes('lain')) {
        session.jenisIzin = 'IZIN_LAIN';
      } else {
        return {
          replyMessage:
            `⚠️ Pilihan tidak valid. Silakan balas dengan:\n` +
            `• Ketik *1* untuk Sakit\n` +
            `• Ketik *2* untuk Keperluan Keluarga\n` +
            `• Ketik *3* untuk Izin Lainnya`,
          shouldSend: true,
          status: 'PROCESSED',
        };
      }

      session.step = 'AWAIT_DATES';
      const todayStr = new Date().toISOString().split('T')[0];
      return {
        replyMessage:
          `🗓️ *Tanggal Izin / Tidak Masuk Sekolah*\n\n` +
          `Jenis Izin: *${session.jenisIzin === 'SAKIT' ? 'SAKIT' : session.jenisIzin === 'KEPERLUAN_KELUARGA' ? 'KEPERLUAN KELUARGA' : 'IZIN'}*\n\n` +
          `Silakan ketik tanggal izin. Contoh:\n` +
          `• Ketik *HARI INI* (atau *${todayStr}*)\n` +
          `• Atau ketik rentang jika lebih dari 1 hari, misal: *2026-09-06 s/d 2026-09-07*`,
        shouldSend: true,
        status: 'PROCESSED',
      };
    }

    // STEP 3: Tanggal Izin
    if (session.step === 'AWAIT_DATES') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (
        textLower === 'hari ini' ||
        textLower === 'sekarang' ||
        textLower === 'today'
      ) {
        session.tanggalMulai = todayStr;
        session.tanggalSelesai = todayStr;
      } else if (textLower.includes('s/d') || textLower.includes('sampai')) {
        const parts = input.split(/s\/d|sampai|-/i).map((s) => s.trim());
        session.tanggalMulai = parts[0] || todayStr;
        session.tanggalSelesai = parts[1] || session.tanggalMulai;
      } else {
        session.tanggalMulai = input.trim();
        session.tanggalSelesai = input.trim();
      }

      session.step = 'AWAIT_REASON';
      return {
        replyMessage:
          `📝 *Keterangan / Alasan Lengkap*\n\n` +
          `Silakan tuliskan alasan atau keterangan izin secara singkat dan jelas.\n` +
          `Contoh: *"Demam tinggi sejak malam dan sedang istirahat dokter"* atau *"Menghadiri acara pernikahan keluarga di luar kota"*`,
        shouldSend: true,
        status: 'PROCESSED',
      };
    }

    // STEP 4: Keterangan / Alasan & Konfirmasi Akhir
    if (session.step === 'AWAIT_REASON') {
      session.alasan = input.trim();
      session.step = 'AWAIT_CONFIRM';

      const typeLabel =
        session.jenisIzin === 'SAKIT'
          ? 'Sakit'
          : session.jenisIzin === 'KEPERLUAN_KELUARGA'
            ? 'Keperluan Keluarga'
            : 'Izin Ketidakhadiran';

      return {
        replyMessage:
          `📋 *Konfirmasi Permohonan Izin Siswa*\n\n` +
          `• *Nama Siswa*: ${session.selectedStudent.name}\n` +
          `• *Kelas*: ${session.selectedStudent.class?.name || '-'}\n` +
          `• *NIS*: ${session.selectedStudent.nis}\n` +
          `• *Kategori*: ${typeLabel}\n` +
          `• *Tanggal*: ${session.tanggalMulai} ${session.tanggalSelesai && session.tanggalSelesai !== session.tanggalMulai ? `s/d ${session.tanggalSelesai}` : ''}\n` +
          `• *Keterangan*: ${session.alasan}\n\n` +
          `Apakah data di atas sudah benar dan ingin dikirimkan ke sistem sekolah?\n\n` +
          `👉 Balas *YA* untuk memproses dan menyimpan ke SIMASMUH\n` +
          `👉 Balas *BATAL* untuk membatalkan`,
        shouldSend: true,
        status: 'PROCESSED',
      };
    }

    // STEP 5: Simpan ke Basis Data SIMASMUH
    if (session.step === 'AWAIT_CONFIRM') {
      if (
        textLower === 'ya' ||
        textLower === 'yes' ||
        textLower === 'ok' ||
        textLower === 'oke' ||
        textLower === 'benar' ||
        textLower === 'setuju' ||
        textLower === 'kirim'
      ) {
        try {
          const student = session.selectedStudent;
          const studentUserId = student.userId || student.user?.id;

          // Tanggal izin
          let targetDate = new Date();
          if (session.tanggalMulai) {
            const parsed = new Date(session.tanggalMulai);
            if (!isNaN(parsed.getTime())) targetDate = parsed;
          }
          targetDate.setHours(0, 0, 0, 0);

          // Siapkan alasan terstruktur
          const typePrefix =
            session.jenisIzin === 'SAKIT'
              ? '[IZIN SAKIT]'
              : '[IZIN KEPERLUAN KELUARGA]';
          const senderInfo = session.parentUser?.name
            ? ` (Dilaporkan oleh Wali: ${session.parentUser.name} via WhatsApp Chatbot)`
            : ` (Dilaporkan via WhatsApp Chatbot)`;

          const formattedAlasan = `${typePrefix} ${session.alasan}${senderInfo}`;

          // Pastikan akun user siswa ada untuk relasi IzinKeluar
          let finalUserId = studentUserId;
          if (!finalUserId) {
            // Ambil dari user student
            const studentWithUser = await this.prisma.student.findUnique({
              where: { id: student.id },
              include: { user: true },
            });
            finalUserId = studentWithUser?.user?.id || studentWithUser?.userId;
          }

          if (!finalUserId) {
            throw new Error('Akun pengguna siswa tidak ditemukan.');
          }

          // Simpan rekam izin ke model IzinKeluar
          const newIzin = await this.prisma.izinKeluar.create({
            data: {
              date: targetDate,
              waktuKeluar: '07:00',
              estimasiKembali: '15:00',
              alasan: formattedAlasan,
              status: 'MENUNGGU',
              catatanAdmin: `Permohonan otomatis masuk via WhatsApp Chatbot (+${senderPhone})`,
              userId: finalUserId,
            },
            include: {
              user: {
                select: {
                  name: true,
                  role: true,
                  student: {
                    select: {
                      name: true,
                      nis: true,
                      class: { select: { name: true } },
                    },
                  },
                },
              },
            },
          });

          // Otomatis buat rekaman log WhatsApp untuk audit
          await this.prisma.whatsAppLog.create({
            data: {
              recipientPhone: senderPhone,
              recipientName: session.parentUser?.name || student.name,
              recipientRole: 'WALI_MURID',
              category: 'ABSENSI',
              title: 'Laporan Izin Siswa WhatsApp Chatbot',
              message: `Izin untuk ananda ${student.name} berhasil disimpan di sistem SIMASMUH (ID: ${newIzin.id}).`,
              senderNumber: '088293733330',
              status: 'SENT',
            },
          });

          // Notifikasi In-App untuk Tim BK, Ketertiban & Wali Kelas
          const staffReviewers = await this.prisma.user.findMany({
            where: {
              OR: [
                { role: 'SUPERADMIN' },
                { role: 'KETERTIBAN' },
                { role: 'BK_BP' },
                { subRole: 'KETERTIBAN' },
                { subRole: 'BK_BP' },
                { subRole: 'WALI_KELAS' },
              ],
            },
            select: { id: true },
            take: 10,
          });

          for (const staff of staffReviewers) {
            await this.prisma.notification
              .create({
                data: {
                  userId: staff.id,
                  title: 'Permohonan Izin Siswa Masuk (WhatsApp Chatbot)',
                  message: `Wali murid ananda ${student.name} (Kelas ${student.class?.name || '-'}) telah melaporkan permohonan izin via WhatsApp: ${session.alasan}`,
                  type: 'PERIZINAN',
                  isRead: false,
                },
              })
              .catch(() => {});
          }

          // Reset sesi
          this.resetSession(senderPhone);

          return {
            replyMessage:
              `✅ *Alhamdulillah, Permohonan Izin Berhasil Tercatat!*\n\n` +
              `Data izin atas nama *${student.name}* (Kelas: ${student.class?.name || '-'}) telah tersimpan dengan aman di basis data SIMASMUH dan langsung tersinkronisasi di dashboard sekolah, guru piket, dan wali kelas.\n\n` +
              `📌 *Nomor Tiket Izin*: \`#IZIN-${newIzin.id.slice(0, 8).toUpperCase()}\`\n` +
              `Status: *MENUNGGU VERIFIKASI SEKOLAH*\n\n` +
              `Terima kasih telah memberitahukan pihak sekolah melalui layanan SIMASMUH SMA Muhammadiyah 1 Ponorogo. Semoga ananda lekas sehat / urusan keluarga dimudahkan. Wassalamu'alaikum Wr. Wb.`,
            shouldSend: true,
            status: 'SAVED',
            createdIzin: newIzin,
          };
        } catch (error: any) {
          this.logger.error(`Error saving izin from chatbot: ${error.message}`);
          this.resetSession(senderPhone);
          return {
            replyMessage:
              `❌ Mohon maaf, terjadi kendala teknis saat menyimpan data izin ke sistem (${error.message}). Silakan ulangi dengan mengetik *IZIN* atau hubungi pihak sekolah.`,
            shouldSend: true,
            status: 'PROCESSED',
          };
        }
      } else {
        this.resetSession(senderPhone);
        return {
          replyMessage:
            `Permohonan izin telah dibatalkan. Ketik *IZIN* kapan saja jika ingin memulai kembali.`,
          shouldSend: true,
          status: 'RESET',
        };
      }
    }

    return {
      replyMessage: `Ketik *IZIN* untuk melaporkan izin ketidakhadiran siswa atau *BANTUAN* untuk petunjuk.`,
      shouldSend: true,
      status: 'PROCESSED',
    };
  }

  /**
   * Status kesehatan service chatbot
   */
  getStatus() {
    return {
      status: 'ONLINE',
      botNumber: '+62 882-9373-3330',
      activeSessions: this.sessions.size,
      service: 'SIMASMUH WhatsApp Chatbot Interactive Leave Service',
      version: '1.0.0',
    };
  }
}
