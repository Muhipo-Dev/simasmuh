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
import { KegiatanSekolahService } from './kegiatan-sekolah.service';
import { CreateKegiatanDto } from './dto/create-kegiatan.dto';
import { UpdateKegiatanDto } from './dto/update-kegiatan.dto';
import { ScanPresensiKegiatanDto, ManualPresensiKegiatanDto } from './dto/presensi-kegiatan.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('kegiatan-sekolah')
@UseGuards(JwtAuthGuard)
export class KegiatanSekolahController {
  constructor(private readonly kegiatanSekolahService: KegiatanSekolahService) {}

  @Post()
  create(@Body() createDto: CreateKegiatanDto, @Request() req: any) {
    const userId = req.user?.id;
    return this.kegiatanSekolahService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('kategori') kategori?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kegiatanSekolahService.findAll({
      search,
      kategori,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kegiatanSekolahService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateKegiatanDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.kegiatanSekolahService.update(id, updateDto, userId);
  }

  @Post(':id/refresh-qr')
  refreshQr(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.kegiatanSekolahService.refreshQrToken(id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.kegiatanSekolahService.remove(id, userId);
  }

  // ===== PRESENSI SCAN & MANUAL ===== //

  @Post('presensi/scan')
  scanPresensi(@Body() dto: ScanPresensiKegiatanDto, @Request() req: any) {
    const authUserId = req.user?.id;
    return this.kegiatanSekolahService.scanPresensi(dto, authUserId);
  }

  @Post(':id/presensi/manual')
  addManual(
    @Param('id') id: string,
    @Body() dto: ManualPresensiKegiatanDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user?.id;
    return this.kegiatanSekolahService.addManualPresensi(id, dto, adminUserId);
  }

  @Delete('presensi/:presensiId')
  removePresensi(@Param('presensiId') presensiId: string, @Request() req: any) {
    const adminUserId = req.user?.id;
    return this.kegiatanSekolahService.removePresensi(presensiId, adminUserId);
  }
}
