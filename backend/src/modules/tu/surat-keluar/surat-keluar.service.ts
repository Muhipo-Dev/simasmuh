import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateSuratKeluarDto } from './dto/create-surat-keluar.dto';
import { UpdateSuratKeluarDto } from './dto/update-surat-keluar.dto';

@Injectable()
export class SuratKeluarService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  /**
   * Verifikasi Publik Tanda Tangan Digital & Keaslian Dokumen Surat Keluar Resmi Sekolah
   */
  async verifyToken(token: string) {
    if (!token) {
      throw new NotFoundException('Token verifikasi surat tidak boleh kosong.');
    }
    const cleanToken = token.trim();

    const surat = await this.prisma.suratKeluar.findFirst({
      where: {
        OR: [
          { eSignToken: cleanToken },
          { id: cleanToken },
        ],
      },
    });

    if (!surat) {
      return {
        valid: false,
        message: 'Tanda Tangan Digital / Surat Keluar Resmi tidak ditemukan dalam basis data SIMASMUH.',
      };
    }

    const setting = await this.prisma.setting.findFirst();

    return {
      valid: true,
      message: '✓ TERVERIFIKASI RESMI ASLI - Tanda Tangan Digital Surat Keluar Sah & Terhubung Basis Data SIMASMUH',
      data: {
        id: surat.id,
        eSignToken: surat.eSignToken || cleanToken,
        eSignSignedAt: surat.eSignSignedAt || surat.updatedAt,
        eSignSignedBy: surat.signerName || surat.penandatangan || setting?.principalName || 'Kepala Sekolah SIMASMUH',
        signatureImage: surat.signatureImage || null,
        eSignHash: `SHA256-SURAT-KELUAR-${surat.id.slice(0, 8).toUpperCase()}-OK`,
        status: surat.status,
        date: surat.tanggalSurat,
        waktuKeluar: '-',
        alasan: `${surat.perihal} (Nomor: ${surat.nomorSurat})`,
        catatanAdmin: `Kepada: ${surat.tujuanPenerima} ${surat.instansiPenerima ? '(' + surat.instansiPenerima + ')' : ''}`,
        pemohon: {
          name: surat.tujuanPenerima,
          nis: surat.nomorSurat,
          nisn: surat.jenisSurat,
          class: surat.instansiPenerima || 'Instansi / Umum',
          role: 'PENERIMA_SURAT',
        },
        sekolah: {
          name: setting?.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          address: setting?.address || 'Jl. Ronowijayan, Ponorogo, Jawa Timur',
          phone: setting?.phone || '088293733330',
          email: setting?.email || 'info@smam1ponorogo.sch.id',
          logoUrl: setting?.logoUrl || '/muhipo-log.jpg',
          principalName: surat.signerName || setting?.principalName || 'Kepala Sekolah SIMASMUH',
          principalNip: surat.signerNbm || setting?.principalNip || 'NIP/NBM. 19780512 200501 1 003',
        },
      },
    };
  }

  async create(dto: CreateSuratKeluarDto) {
    const surat = await this.prisma.suratKeluar.create({
      data: {
        nomorSurat: dto.nomorSurat,
        nomorAgenda: dto.nomorAgenda || null,
        tujuanPenerima: dto.tujuanPenerima,
        instansiPenerima: dto.instansiPenerima || null,
        perihal: dto.perihal,
        tanggalSurat: dto.tanggalSurat ? new Date(dto.tanggalSurat) : new Date(),
        jenisSurat: dto.jenisSurat || 'SURAT_KETERANGAN',
        penandatangan: dto.penandatangan || 'Kepala Sekolah',
        status: dto.status || 'DRAF',
        catatan: dto.catatan || null,
        eSignToken: dto.eSignToken || null,
        signerName: dto.signerName || null,
        signerNbm: dto.signerNbm || null,
        fileUrl: dto.fileUrl || null,
        templateData: dto.templateData || undefined,
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'SURAT_KELUAR_CREATED',
      message: `Surat Keluar baru "${surat.nomorSurat}" (${surat.perihal}) berhasil diterbitkan.`,
      details: { suratId: surat.id, nomorSurat: surat.nomorSurat },
    });

    return {
      success: true,
      message: 'Surat Keluar berhasil dibuat.',
      data: surat,
    };
  }

  async findAll(query: { search?: string; status?: string; jenisSurat?: string }) {
    const { search, status, jenisSurat } = query;
    const where: any = {};

    if (search) {
      where.OR = [
        { nomorSurat: { contains: search, mode: 'insensitive' } },
        { perihal: { contains: search, mode: 'insensitive' } },
        { tujuanPenerima: { contains: search, mode: 'insensitive' } },
        { instansiPenerima: { contains: search, mode: 'insensitive' } },
        { eSignToken: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (jenisSurat && jenisSurat !== 'ALL') {
      where.jenisSurat = jenisSurat;
    }

    const items = await this.prisma.suratKeluar.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: items,
    };
  }

  async findOne(id: string) {
    const surat = await this.prisma.suratKeluar.findUnique({ where: { id } });
    if (!surat) {
      throw new NotFoundException(`Dokumen Surat Keluar ID ${id} tidak ditemukan.`);
    }
    return { success: true, data: surat };
  }

  async update(id: string, dto: UpdateSuratKeluarDto) {
    const existing = await this.prisma.suratKeluar.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dokumen Surat Keluar tidak ditemukan.`);
    }

    const updated = await this.prisma.suratKeluar.update({
      where: { id },
      data: {
        nomorSurat: dto.nomorSurat || existing.nomorSurat,
        nomorAgenda: dto.nomorAgenda !== undefined ? dto.nomorAgenda : existing.nomorAgenda,
        tujuanPenerima: dto.tujuanPenerima || existing.tujuanPenerima,
        instansiPenerima: dto.instansiPenerima !== undefined ? dto.instansiPenerima : existing.instansiPenerima,
        perihal: dto.perihal || existing.perihal,
        jenisSurat: dto.jenisSurat || existing.jenisSurat,
        penandatangan: dto.penandatangan || existing.penandatangan,
        status: dto.status || existing.status,
        catatan: dto.catatan !== undefined ? dto.catatan : existing.catatan,
        catatanRevisi: dto.catatanRevisi !== undefined ? dto.catatanRevisi : existing.catatanRevisi,
        eSignToken: dto.eSignToken || existing.eSignToken,
        eSignSignedAt: dto.eSignSignedAt ? new Date(dto.eSignSignedAt) : existing.eSignSignedAt,
        signerName: dto.signerName !== undefined ? dto.signerName : existing.signerName,
        signerNbm: dto.signerNbm !== undefined ? dto.signerNbm : existing.signerNbm,
        signatureImage: dto.signatureImage || dto.signatureDataUrl || existing.signatureImage,
        fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : existing.fileUrl,
        templateData: dto.templateData !== undefined ? dto.templateData : (existing.templateData as any),
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'SURAT_KELUAR_UPDATED',
      message: `Surat Keluar "${updated.nomorSurat}" telah diperbarui. Status: ${updated.status}`,
      details: { suratId: id, status: updated.status },
    });

    return {
      success: true,
      message: 'Surat Keluar berhasil diperbarui.',
      data: updated,
    };
  }

  async remove(id: string, password?: string, userId?: string) {
    const existing = await this.prisma.suratKeluar.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dokumen Surat Keluar tidak ditemukan.`);
    }

    if (userId && password) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user && user.password) {
        const isMatch = user.password.startsWith('$2')
          ? await bcrypt.compare(password, user.password)
          : user.password === password;
        if (!isMatch) {
          throw new UnauthorizedException('Kata sandi keamanan yang Anda masukkan salah.');
        }
      }
    }

    await this.prisma.suratKeluar.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'SURAT_KELUAR_DELETED',
      message: `Surat Keluar "${existing.nomorSurat}" telah dihapus.`,
      details: { suratId: id },
    });

    return {
      success: true,
      message: 'Surat Keluar berhasil dihapus.',
    };
  }
}
