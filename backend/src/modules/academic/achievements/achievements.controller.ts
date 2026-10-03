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
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /**
   * Helper pengecekan hak akses edit / manajemen (Superadmin, Kepala Sekolah, Seluruh Waka, Kesiswaan, Humas, Admin TU)
   */
  private checkManagePermission(user: any) {
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
        'WAKA_HUMAS_SDM',
        'HUMAS_SDM',
        'KEPEGAWAIAN',
        'SDM',
        'WAKA_KURIKULUM',
        'KURIKULUM',
        'WAKA_SARPRAS',
        'SARPRAS',
        'WAKA_ISMUBA',
        'ISMUBA',
        'BAU',
        'ADMIN_TU',
        'TATA_USAHA',
      ].includes(r) || r.startsWith('WAKA_') || r.includes('WAKA')
    );

    if (!isAllowed) {
      throw new ForbiddenException('Anda tidak memiliki hak akses untuk mengelola data prestasi.');
    }
  }

  /**
   * Helper pengecekan hak akses input (Kesiswaan, Humas, Kepala Sekolah, Waka, Superadmin, Admin TU)
   */
  private checkCreatePermission(user: any) {
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
        'KESISWAAN',
        'WAKA_KESISWAAN',
        'WAKA_HUMAS_SDM',
        'HUMAS_SDM',
        'KEPEGAWAIAN',
        'SDM',
        'KEPALA_SEKOLAH',
        'WAKA_KURIKULUM',
        'KURIKULUM',
        'WAKA_SARPRAS',
        'SARPRAS',
        'WAKA_ISMUBA',
        'ISMUBA',
        'BAU',
        'ADMIN_TU',
      ].includes(r) || r.startsWith('WAKA_') || r.includes('WAKA')
    );

    if (!isAllowed) {
      throw new ForbiddenException('Hanya Tim Kesiswaan, Humas, Kepala Sekolah, dan Waka yang dapat menginput data prestasi.');
    }
  }

  /**
   * Endpoint Publik / Umum: Ringkasan statistik & 20 prestasi terakhir
   */
  @Get('statistics')
  getStatistics(
    @Query('tahun') tahun?: string,
    @Query('classId') classId?: string,
  ) {
    return this.achievementsService.getStatistics({
      tahun: tahun ? parseInt(tahun) : undefined,
      classId,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateAchievementDto, @Request() req: any) {
    this.checkCreatePermission(req.user);
    return this.achievementsService.create(createDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('tingkat') tingkat?: string,
    @Query('kategoriBidang') kategoriBidang?: string,
    @Query('tahun') tahun?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.achievementsService.findAll({
      studentId,
      classId,
      tingkat,
      kategoriBidang,
      tahun: tahun ? parseInt(tahun) : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.achievementsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAchievementDto,
    @Request() req: any,
  ) {
    this.checkManagePermission(req.user);
    return this.achievementsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    this.checkManagePermission(req.user);
    return this.achievementsService.remove(id, req.user);
  }
}
