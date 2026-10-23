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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { KurikulumMerdekaService } from './kurikulum-merdeka.service';
import {
  CreatePerangkatKurikulumDto,
  CloneParallelDto,
  CreateTujuanPembelajaranDto,
  UpdateTujuanPembelajaranDto,
  SavePromesMatrixDto,
  GeneratePerangkatDocDto,
  BatchInputNilaiTPDto,
  WizardAutoFillJenjangDto,
} from './dto/kurikulum-merdeka.dto';
import { JwtAuthGuard } from '../../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/roles.guard';
import { Roles, UserRole, SubRole } from '../../../core/auth/roles.decorator';

@Controller('kurikulum-merdeka')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.GURU,
  UserRole.HONORER,
  UserRole.SUPERADMIN,
  UserRole.ADMIN_IT,
  UserRole.KEPALA_SEKOLAH,
  SubRole.KURIKULUM,
  SubRole.WAKA_KURIKULUM,
  SubRole.WAKA_KESISWAAN,
  SubRole.WAKA_HUMAS_SDM,
  SubRole.WAKA_SARPRAS,
  SubRole.WAKA_ISMUBA,
  SubRole.WALI_KELAS,
)
export class KurikulumMerdekaController {
  constructor(private readonly kmService: KurikulumMerdekaService) {}

  @Get('guru-context')
  getGuruContext(@Request() req: any) {
    return this.kmService.getGuruContext(req.user);
  }

  @Post('setup')
  createPerangkat(@Body() dto: CreatePerangkatKurikulumDto, @Request() req: any) {
    return this.kmService.createPerangkat(dto, req.user);
  }

  @Post('auto-sync-schedules')
  autoSyncSchedules(@Request() req: any) {
    return this.kmService.autoSyncFromSchedules(req.user);
  }

  @Get('perangkat/:id')
  getPerangkatDetail(@Param('id') id: string) {
    return this.kmService.getPerangkatDetail(id);
  }

  @Post('clone-parallel')
  cloneParallel(@Body() dto: CloneParallelDto, @Request() req: any) {
    return this.kmService.cloneParallel(dto, req.user);
  }

  @Post('reuse-archive')
  reuseArchive(@Body() dto: { archivePerangkatId: string; targetClassId: string; targetAcademicYear?: string; targetSemester?: string }, @Request() req: any) {
    return this.kmService.reuseArchivePerangkat(dto, req.user);
  }

  @Get('capaian-pembelajaran')
  getCapaianPembelajaran(
    @Query('fase') fase?: string,
    @Query('subjectName') subjectName?: string,
  ) {
    return this.kmService.getCapaianPembelajaran(fase, subjectName);
  }

  @Post('tujuan-pembelajaran')
  createTujuanPembelajaran(@Body() dto: CreateTujuanPembelajaranDto) {
    return this.kmService.createTujuanPembelajaran(dto);
  }

  @Patch('tujuan-pembelajaran/:id')
  updateTujuanPembelajaran(
    @Param('id') id: string,
    @Body() dto: UpdateTujuanPembelajaranDto,
  ) {
    return this.kmService.updateTujuanPembelajaran(id, dto);
  }

  @Delete('tujuan-pembelajaran/:id')
  deleteTujuanPembelajaran(@Param('id') id: string) {
    return this.kmService.deleteTujuanPembelajaran(id);
  }

  @Delete('dokumen-item/:id')
  deleteDokumenAjarItem(@Param('id') id: string) {
    return this.kmService.deleteDokumenAjarItem(id);
  }

  @Post('dokumen-item')
  createDokumenAjarItemManual(
    @Body()
    dto: {
      perangkatKurikulumId: string;
      tpId?: string;
      kategori: string;
      judul: string;
      kontenJson?: any;
      fileDocxUrl?: string;
      filePdfUrl?: string;
    },
  ) {
    return this.kmService.createDokumenAjarItemManual(dto);
  }

  @Delete('promes-matrix/:perangkatId')
  resetPromesMatrix(@Param('perangkatId') perangkatId: string) {
    return this.kmService.resetPromesMatrix(perangkatId);
  }

  @Post('promes-matrix')
  savePromesMatrix(@Body() dto: SavePromesMatrixDto) {
    return this.kmService.savePromesMatrix(dto);
  }

  @Post('generate-doc')
  generateDoc(@Body() dto: GeneratePerangkatDocDto) {
    return this.kmService.generatePerangkatDoc(dto);
  }

  @Get('export/docx')
  async exportDocx(
    @Query('perangkatKurikulumId') perangkatKurikulumId: string,
    @Query('kategori') kategori: string,
    @Query('tpId') tpId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.kmService.exportDocumentDocx(
      perangkatKurikulumId,
      kategori,
      tpId,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${kategori}_${Date.now()}.docx"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Get('export/supervisi-zip')
  async exportSupervisiZip(
    @Query('perangkatKurikulumId') perangkatKurikulumId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.kmService.exportSupervisiZip(perangkatKurikulumId);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Paket_Supervisi_${Date.now()}.zip"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Post('batch-nilai-tp')
  batchInputNilaiTP(@Body() dto: BatchInputNilaiTPDto) {
    return this.kmService.batchInputNilaiTP(dto);
  }

  @Get('daily-view')
  getDailyClassView(
    @Query('scheduleId') scheduleId: string,
    @Query('date') date?: string,
  ) {
    return this.kmService.getDailyClassView(scheduleId, date);
  }

  @Post('wizard-jenjang')
  wizardAutoFillJenjang(@Body() dto: WizardAutoFillJenjangDto, @Request() req: any) {
    return this.kmService.wizardAutoFillJenjang(dto, req.user);
  }
}
