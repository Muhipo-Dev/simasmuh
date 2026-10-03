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
  ForbiddenException,
} from '@nestjs/common';
import { SupervisiService } from './supervisi.service';
import { CreateSupervisiDto, CreateJadwalSupervisiDto } from './dto/supervisi.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('supervisi')
@UseGuards(JwtAuthGuard)
export class SupervisiController {
  constructor(private readonly supervisiService: SupervisiService) {}

  private checkPimpinanPermission(user: any) {
    const roles: string[] = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    const isAllowed = roles.some((rawRole: string) => {
      const r = (rawRole || '').toUpperCase();
      return (
        [
          'SUPERADMIN',
          'ADMIN_IT',
          'KEPALA_SEKOLAH',
          'KURIKULUM',
          'WAKA_KURIKULUM',
          'KESISWAAN',
          'WAKA_KESISWAAN',
          'HUMAS_SDM',
          'WAKA_HUMAS_SDM',
          'KEPEGAWAIAN',
          'SDM',
          'SARPRAS',
          'WAKA_SARPRAS',
          'ISMUBA',
          'WAKA_ISMUBA',
          'KETERTIBAN',
          'TATIB',
          'BK_BP',
          'BK',
        ].includes(r) ||
        r.startsWith('WAKA_') ||
        r.includes('WAKA') ||
        r.includes('KESISWAAN') ||
        r.includes('KURIKULUM') ||
        r.includes('PIMPINAN')
      );
    });

    if (!isAllowed) {
      throw new ForbiddenException('Akses supervisi GTK khusus untuk Kepala Sekolah dan Waka.');
    }
  }

  // --- Supervisi Targets (Guru & Seluruh Staf Pegawai / Tendik) ---
  @Get('targets')
  getSupervisiTargets(@Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.getSupervisiTargets();
  }

  // --- Supervisi Records ---
  @Post()
  createSupervisi(@Body() dto: CreateSupervisiDto, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.createSupervisi(dto, req.user);
  }

  @Get()
  findAllSupervisi(
    @Query('teacherId') teacherId?: string,
    @Query('jenisId') jenisId?: string,
    @Query('kategori') kategori?: string,
    @Query('tahun') tahun?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    this.checkPimpinanPermission(req?.user);
    return this.supervisiService.findAllSupervisi({
      teacherId,
      jenisId,
      kategori,
      tahun: tahun ? parseInt(tahun) : undefined,
      search,
    });
  }

  @Get(':id')
  findOneSupervisi(@Param('id') id: string, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.findOneSupervisi(id);
  }

  @Patch(':id')
  updateSupervisi(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupervisiDto>,
    @Request() req: any,
  ) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.updateSupervisi(id, dto, req.user);
  }

  @Delete(':id')
  removeSupervisi(@Param('id') id: string, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.removeSupervisi(id, req.user);
  }

  // --- Jadwal Supervisi ---
  @Post('jadwal')
  createJadwal(@Body() dto: CreateJadwalSupervisiDto, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.createJadwal(dto, req.user);
  }

  @Get('jadwal/all')
  findAllJadwal(
    @Query('teacherId') teacherId?: string,
    @Query('status') status?: string,
    @Request() req?: any,
  ) {
    this.checkPimpinanPermission(req?.user);
    return this.supervisiService.findAllJadwal({ teacherId, status });
  }

  @Delete('jadwal/:id')
  removeJadwal(@Param('id') id: string, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.removeJadwal(id);
  }

  // --- Master Data Rubrik & Indikator Supervisi (Diakses & Diubah oleh Semua Waka & Kepala Sekolah) ---
  @Get('rubrik/items')
  getRubrik(@Query('jenisId') jenisId: string, @Request() req: any) {
    this.checkPimpinanPermission(req?.user);
    return this.supervisiService.getRubrik(jenisId);
  }

  @Post('rubrik/items')
  createRubrikItem(
    @Body()
    dto: {
      jenisId: string;
      kategori: string;
      label: string;
      bobot?: number;
      orderIndex?: number;
    },
    @Request() req: any,
  ) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.createRubrikItem(dto, req.user);
  }

  @Patch('rubrik/items/:id')
  updateRubrikItem(
    @Param('id') id: string,
    @Body()
    dto: {
      kategori?: string;
      label?: string;
      bobot?: number;
      orderIndex?: number;
      isActive?: boolean;
    },
    @Request() req: any,
  ) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.updateRubrikItem(id, dto, req.user);
  }

  @Delete('rubrik/items/:id')
  deleteRubrikItem(@Param('id') id: string, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.deleteRubrikItem(id);
  }

  @Post('rubrik/reset-default')
  resetRubrikDefault(@Body('jenisId') jenisId: string, @Request() req: any) {
    this.checkPimpinanPermission(req.user);
    return this.supervisiService.resetRubrikDefault(jenisId, req.user);
  }
}

