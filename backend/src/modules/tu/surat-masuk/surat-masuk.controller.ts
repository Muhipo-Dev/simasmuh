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
import { SuratMasukService } from './surat-masuk.service';
import { CreateSuratMasukDto } from './dto/create-surat-masuk.dto';
import { UpdateSuratMasukDto } from './dto/update-surat-masuk.dto';
import { CreateDisposisiDto } from './dto/create-disposisi.dto';
import { UpdateDisposisiDto } from './dto/update-disposisi.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('surat-masuk')
export class SuratMasukController {
  constructor(private readonly suratMasukService: SuratMasukService) {}

  /**
   * Endpoint Publik: Verifikasi Tanda Tangan Digital Lembar Disposisi Surat Masuk
   */
  @Get('disposisi/verify/:token')
  verifyDisposisiToken(@Param('token') token: string) {
    return this.suratMasukService.verifyToken(token);
  }

  /**
   * Endpoint Terproteksi: List Surat Masuk
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('search') search?: string,
    @Query('sifat') sifat?: string,
    @Query('statusDisposisi') statusDisposisi?: string,
  ) {
    return this.suratMasukService.findAll({ search, sifat, statusDisposisi });
  }

  /**
   * Endpoint Terproteksi: Detail Surat Masuk
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.suratMasukService.findOne(id);
  }

  /**
   * Endpoint Terproteksi: Tambah Surat Masuk Baru
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateSuratMasukDto) {
    return this.suratMasukService.create(createDto);
  }

  /**
   * Endpoint Terproteksi: Update Surat Masuk
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateSuratMasukDto) {
    return this.suratMasukService.update(id, updateDto);
  }

  /**
   * Endpoint Terproteksi: Hapus Surat Masuk dengan Verifikasi Password
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @Body() body: { password?: string },
    @Request() req: any,
  ) {
    return this.suratMasukService.remove(id, body?.password, req?.user?.id);
  }

  /**
   * Endpoint Terproteksi: Simpan / Ajukan Lembar Disposisi
   */
  @Post('disposisi')
  @UseGuards(JwtAuthGuard)
  upsertDisposisi(@Body() createDisposisiDto: CreateDisposisiDto) {
    return this.suratMasukService.upsertDisposisi(createDisposisiDto);
  }

  /**
   * Endpoint Terproteksi: Verifikasi E-Sign Disposisi oleh Kepala Sekolah (Approve/Reject)
   */
  @Patch('disposisi/:id/approve')
  @UseGuards(JwtAuthGuard)
  approveOrRejectDisposisi(
    @Param('id') id: string,
    @Body() updateDisposisiDto: UpdateDisposisiDto,
  ) {
    return this.suratMasukService.approveOrRejectDisposisi(
      id,
      updateDisposisiDto,
    );
  }
}
