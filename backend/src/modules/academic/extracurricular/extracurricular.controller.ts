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
import { CreateExtracurricularDto, UpdateExtracurricularDto, AddMemberDto } from './dto/extracurricular.dto';
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
      throw new ForbiddenException('Anda tidak memiliki wewenang untuk mengelola data ekstrakurikuler.');
    }
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.extracurricularService.findAll(category, search);
  }

  @Get('stats')
  getStats() {
    return this.extracurricularService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.extracurricularService.findOne(id);
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

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Request() req: any,
  ) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.addMember(id, dto);
  }

  @Delete('members/:memberId')
  removeMember(@Param('memberId') memberId: string, @Request() req: any) {
    this.checkKesiswaanPermission(req.user);
    return this.extracurricularService.removeMember(memberId);
  }
}
