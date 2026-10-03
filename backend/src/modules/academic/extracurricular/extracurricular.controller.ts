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
import { ExtracurricularService } from './extracurricular.service';
import {
  CreateExtracurricularDto,
  UpdateExtracurricularDto,
  AddMemberDto,
  CreateSessionDto,
  UpdateSessionDto,
  BulkSaveAttendanceDto,
  BulkSaveGradesDto,
} from './dto/extracurricular.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('extracurricular')
@UseGuards(JwtAuthGuard)
export class ExtracurricularController {
  constructor(private readonly extracurricularService: ExtracurricularService) {}

  /**
   * Helper verifikasi hak akses Kesiswaan, Seluruh Waka, Kepala Sekolah, dan Superadmin
   */
  private checkKesiswaanPermission(user: any) {
    const roles = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    const isAllowed = roles.some((r: string) =>
      [
        'SUPERADMIN',
        'ADMIN_IT',
        'KEPALA_SEKOLAH',
        'KESISWAAN',
        'WAKA_KESISWAAN',
        'KETERTIBAN',
        'BK',
        'BK_BP',
        'WAKA_KURIKULUM',
        'KURIKULUM',
        'WAKA_HUMAS_SDM',
        'HUMAS_SDM',
        'WAKA_SARPRAS',
        'SARPRAS',
        'WAKA_ISMUBA',
        'ISMUBA',
        'BAU',
        'ADMIN_TU',
      ].includes(r) || r.startsWith('WAKA_') || r.includes('WAKA')
    );

    if (!isAllowed) {
      throw new ForbiddenException('Anda tidak memiliki wewenang untuk mengelola master data ekstrakurikuler.');
    }
  }

  /**
   * Helper verifikasi hak akses Pembina atau Kesiswaan/Admin
   */
  private checkPembinaOrStaffPermission(user: any) {
    const roles = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    const isAllowed = roles.some((r: string) =>
      [
        'SUPERADMIN',
        'ADMIN_IT',
        'KEPALA_SEKOLAH',
        'KESISWAAN',
        'WAKA_KESISWAAN',
        'GURU',
        'PEMBINA_EKSTRA',
        'PEMBINA_EXTRA',
        'BAU',
        'ADMIN_TU',
      ].includes(r) || r.startsWith('WAKA_') || r.includes('WAKA')
    );

    if (!isAllowed) {
      throw new ForbiddenException('Akses khusus pembina ekstrakurikuler atau staf kesiswaan.');
    }
  }

  // ==================== SISWA ENDPOINTS ====================

  @Get('student/my-activities')
  getMyActivities(@Request() req: any) {
    return this.extracurricularService.getStudentActivities(req.user);
  }

  // ==================== PEMBINA ENDPOINTS ====================

  @Get('pembina/my-binaan')
  getMyBinaan(@Request() req: any) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.getMyBinaan(req.user);
  }

  @Get('stats')
  getStats() {
    return this.extracurricularService.getStats();
  }

  @Get('supervision')
  getSupervisionSummary(@Request() req: any) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.getSupervisionSummary();
  }

  // ==================== MASTER & DETAIL ====================

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.extracurricularService.findAll(category, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.extracurricularService.findOne(id);
  }

  @Get(':id/recap')
  getRecap(@Param('id') id: string, @Request() req: any) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.getRecap(id);
  }

  @Post()
  create(@Body() dto: CreateExtracurricularDto, @Request() req: any) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExtracurricularDto,
    @Request() req: any,
  ) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.update(id, dto, req.user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.delete(id, req.user);
  }

  // ==================== ANGGOTA ====================

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Request() req: any,
  ) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.addMember(id, dto, req.user);
  }

  @Delete('members/:memberId')
  removeMember(@Param('memberId') memberId: string, @Request() req: any) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.removeMember(memberId, req.user);
  }

  // ==================== SESI & PRESENSI ====================

  @Post(':id/sessions')
  createSession(
    @Param('id') id: string,
    @Body() dto: CreateSessionDto,
    @Request() req: any,
  ) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.createSession(id, dto, req.user);
  }

  @Get('sessions/:sessionId')
  getSessionDetail(@Param('sessionId') sessionId: string) {
    return this.extracurricularService.getSessionDetail(sessionId);
  }

  @Patch('sessions/:sessionId')
  updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @Request() req: any,
  ) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.updateSession(sessionId, dto, req.user);
  }

  @Delete('sessions/:sessionId')
  deleteSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.deleteSession(sessionId, req.user);
  }

  @Post('sessions/:sessionId/attendance')
  saveSessionAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: BulkSaveAttendanceDto,
    @Request() req: any,
  ) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.saveSessionAttendance(sessionId, dto, req.user);
  }

  // ==================== PENILAIAN ====================

  @Post(':id/grades')
  saveGrades(
    @Param('id') id: string,
    @Body() dto: BulkSaveGradesDto,
    @Request() req: any,
  ) {
    this.checkPembinaOrStaffPermission(req.user);
    return this.extracurricularService.saveGrades(id, dto, req.user);
  }
}
