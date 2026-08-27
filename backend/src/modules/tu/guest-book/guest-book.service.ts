import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';
import { CreateGuestBookDto } from './dto/create-guest-book.dto';
import { UpdateGuestBookStatusDto } from './dto/update-guest-book-status.dto';

@Injectable()
export class GuestBookService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
    private whatsAppService: WhatsAppService,
  ) {}

  private getWibTimeString(): string {
    const now = new Date();
    // WIB is UTC+7
    const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const hours = String(wibDate.getUTCHours()).padStart(2, '0');
    const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes} WIB`;
  }

  async createPublic(dto: CreateGuestBookDto) {
    const waktu = dto.waktu || this.getWibTimeString();

    const guest = await this.prisma.guestBook.create({
      data: {
        namaTamu: dto.namaTamu,
        instansi: dto.instansi,
        kategori: dto.kategori || 'STUDI_TIRU',
        tujuan: dto.tujuan,
        dituju: dto.dituju || 'Tata Usaha',
        kontak: dto.kontak || null,
        waktu,
        status: 'TIBA',
        catatan: dto.catatan || null,
      },
    });

    // 1. Log ke SystemLog
    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'GUEST_BOOK_SUBMITTED_VIA_QR',
      message: `Tamu baru "${guest.namaTamu}" (${guest.instansi}) telah mengisi formulir QR kedatangan.`,
      details: {
        guestId: guest.id,
        namaTamu: guest.namaTamu,
        instansi: guest.instansi,
        kategori: guest.kategori,
        tujuan: guest.tujuan,
        dituju: guest.dituju,
      },
    });

    // 2. Notifikasi WhatsApp ke Petugas TU / Log WA
    try {
      const waMessage =
        `🔔 *NOTIFIKASI TAMU BARU (BUKU TAMU SIMASMUH)* 🔔\n\n` +
        `👤 *Nama*: ${guest.namaTamu}\n` +
        `🏢 *Instansi/Asal*: ${guest.instansi}\n` +
        `🏷️ *Kategori*: ${guest.kategori}\n` +
        `🎯 *Tujuan/Keperluan*: ${guest.tujuan}\n` +
        `🤝 *Dituju*: ${guest.dituju}\n` +
        `📞 *Kontak (WA)*: ${guest.kontak || '-'}\n` +
        `⏰ *Waktu Tiba*: ${guest.waktu}\n\n` +
        `_Pesan otomatis dicatat dari Formulir QR Buku Tamu SIMASMUH._`;

      await this.whatsAppService.sendDirectMessage({
        to: guest.kontak || '088293733330',
        message: waMessage,
        category: 'INFORMASI',
        recipientName: guest.namaTamu,
        title: 'Pencatatan Buku Tamu',
      });
    } catch (err) {
      // Non-blocking error logging
    }

    return {
      success: true,
      message: 'Data kunjungan tamu berhasil dicatat.',
      data: guest,
    };
  }

  async create(dto: CreateGuestBookDto) {
    const waktu = dto.waktu || this.getWibTimeString();

    const guest = await this.prisma.guestBook.create({
      data: {
        namaTamu: dto.namaTamu,
        instansi: dto.instansi,
        kategori: dto.kategori || 'STUDI_TIRU',
        tujuan: dto.tujuan,
        dituju: dto.dituju || 'Tata Usaha',
        kontak: dto.kontak || null,
        waktu,
        status: 'TIBA',
        catatan: dto.catatan || null,
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'GUEST_BOOK_MANUAL_ADD',
      message: `Admin TU menambahkan data tamu "${guest.namaTamu}" secara manual.`,
      details: { guestId: guest.id },
    });

    return {
      success: true,
      message: 'Data tamu berhasil ditambahkan.',
      data: guest,
    };
  }

  async findAll(query: {
    search?: string;
    kategori?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      kategori,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { namaTamu: { contains: search, mode: 'insensitive' } },
        { instansi: { contains: search, mode: 'insensitive' } },
        { tujuan: { contains: search, mode: 'insensitive' } },
        { dituju: { contains: search, mode: 'insensitive' } },
        { kontak: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (kategori && kategori !== 'ALL') {
      where.kategori = kategori;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) {
        where.tanggal.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.guestBook.count({ where }),
      this.prisma.guestBook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const guest = await this.prisma.guestBook.findUnique({ where: { id } });
    if (!guest) {
      throw new NotFoundException(`Data tamu dengan ID ${id} tidak ditemukan.`);
    }
    return { success: true, data: guest };
  }

  async updateStatus(id: string, dto: UpdateGuestBookStatusDto) {
    const existing = await this.prisma.guestBook.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Data tamu tidak ditemukan.`);
    }

    const updated = await this.prisma.guestBook.update({
      where: { id },
      data: {
        status: dto.status,
        catatan: dto.catatan !== undefined ? dto.catatan : existing.catatan,
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'GUEST_BOOK_STATUS_UPDATED',
      message: `Status tamu "${updated.namaTamu}" diubah menjadi ${updated.status}.`,
      details: {
        guestId: id,
        oldStatus: existing.status,
        newStatus: updated.status,
      },
    });

    return {
      success: true,
      message: `Status kedatangan tamu diperbarui menjadi ${updated.status}.`,
      data: updated,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.guestBook.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Data tamu tidak ditemukan.`);
    }

    await this.prisma.guestBook.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'GUEST_BOOK_DELETED',
      message: `Data tamu "${existing.namaTamu}" telah dihapus.`,
      details: { guestId: id },
    });

    return {
      success: true,
      message: 'Data tamu berhasil dihapus.',
    };
  }
}
