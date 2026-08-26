import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SuratKeluarService } from './surat-keluar.service';
import { CreateSuratKeluarDto } from './dto/create-surat-keluar.dto';
import { UpdateSuratKeluarDto } from './dto/update-surat-keluar.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('surat-keluar')
export class SuratKeluarController {
  constructor(private readonly suratKeluarService: SuratKeluarService) {}

  /**
   * Endpoint Publik: Verifikasi Tanda Tangan Digital & Keaslian Surat Keluar Resmi Sekolah
   */
  @Get('verify/:token')
  verifyToken(@Param('token') token: string) {
    return this.suratKeluarService.verifyToken(token);
  }

  /**
   * Endpoint Terproteksi: Menampilkan Seluruh Log Surat Keluar
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('jenisSurat') jenisSurat?: string,
  ) {
    return this.suratKeluarService.findAll({ search, status, jenisSurat });
  }

  /**
   * Endpoint Terproteksi: Detail Surat Keluar
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.suratKeluarService.findOne(id);
  }

  /**
   * Endpoint Terproteksi: Tambah Surat Keluar Baru / Draf
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateSuratKeluarDto) {
    return this.suratKeluarService.create(createDto);
  }

  /**
   * Endpoint Terproteksi: Update Data / Status / TTD Digital Surat Keluar
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateSuratKeluarDto) {
    return this.suratKeluarService.update(id, updateDto);
  }

  /**
   * Endpoint Terproteksi: Hapus Surat Keluar / Draf Persuratan dengan Verifikasi Password
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @Body() body: { password?: string },
    @Request() req: any,
  ) {
    return this.suratKeluarService.remove(id, body?.password, req?.user?.id);
  }
}
