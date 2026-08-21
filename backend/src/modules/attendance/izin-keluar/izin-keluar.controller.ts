import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { IzinKeluarService } from './izin-keluar.service';
import { JwtService } from '@nestjs/jwt';

@Controller('izin-keluar')
export class IzinKeluarController {
  constructor(
    private readonly izinKeluarService: IzinKeluarService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserFromToken(
    authorization: string,
  ): { userId: string; role: string } | null {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) return null;
      const token = authorization.replace('Bearer ', '');
      const payload: any = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'secretKey',
      });
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  // Ajukan izin (Siswa, Pegawai, Guru, Wali Murid)
  @Post()
  create(
    @Headers('authorization') auth: string,
    @Body()
    body: {
      date: string;
      waktuKeluar: string;
      estimasiKembali?: string;
      alasan: string;
      targetUserId?: string;
      lampiranUrl?: string;
      tipeIzin?: 'SAKIT' | 'KEGIATAN' | 'DISPENSASI' | 'KELUARGA' | 'LAINNYA';
    },
  ) {
    const user = this.getUserFromToken(auth);
    if (!user) return { error: 'Unauthorized' };
    return this.izinKeluarService.create(user.userId, body);
  }

  // Lihat izin saya sendiri (atau anak saya jika wali murid)
  @Get('my')
  findMy(@Headers('authorization') auth: string) {
    const user = this.getUserFromToken(auth);
    if (!user) return { error: 'Unauthorized' };
    return this.izinKeluarService.findMy(user.userId);
  }

  // Admin/Superadmin/Guru: lihat semua izin (bisa difilter SISWA vs PEGAWAI)
  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('category') category?: 'SISWA' | 'PEGAWAI' | 'ALL',
  ) {
    return this.izinKeluarService.findAll(date, category);
  }

  // Setujui izin
  @Put(':id/approve')
  approve(@Param('id') id: string, @Body('catatanAdmin') catatan?: string) {
    return this.izinKeluarService.approve(id, catatan);
  }

  // Tolak izin
  @Put(':id/reject')
  reject(@Param('id') id: string, @Body('catatanAdmin') catatan?: string) {
    return this.izinKeluarService.reject(id, catatan);
  }

  // Hapus izin
  @Delete(':id')
  remove(@Param('id') id: string, @Headers('authorization') auth: string) {
    const user = this.getUserFromToken(auth);
    if (!user) return { error: 'Unauthorized' };
    return this.izinKeluarService.remove(id, user.userId, user.role);
  }
}

