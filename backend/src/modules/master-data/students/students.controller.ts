import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  UseGuards,
  Res,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { Roles, UserRole } from '../../core/auth/roles.decorator';
import { SuperadminGuard } from '../../core/auth/permission.guard';
import type { Response } from 'express';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('by-user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.studentsService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    data: {
      nisn: string;
      nis: string;
      name: string;
      gender: string;
      classId: string;
    },
  ) {
    return this.studentsService.create(data);
  }

  @Post('bulk')
  createBulk(@Body() dataArray: any[]) {
    return this.studentsService.createBulk(dataArray);
  }

  @Post('promote-bulk')
  promoteBulk(
    @Body()
    dto: {
      fromClassId?: string;
      studentIds?: string[];
      toClassId: string;
    },
  ) {
    return this.studentsService.promoteBulk(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.studentsService.update(id, data);
  }

  /**
   * PATCH /students/:id/program
   * Hanya SUPERADMIN yang bisa mengubah label program siswa.
   * Gunakan { "program": "tahfidz" } atau { "program": null } untuk menghapus label.
   */
  @Patch(':id/program')
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  updateProgram(
    @Param('id') id: string,
    @Body() body: { program: string | null },
  ) {
    return this.studentsService.updateProgram(id, body.program ?? null);
  }

  /**
   * PATCH /students/:id/beasiswa
   * Pengaturan Beasiswa Default Siswa oleh Bagian Keuangan / Admin
   */
  @Patch(':id/beasiswa')
  @UseGuards(JwtAuthGuard)
  updateBeasiswa(
    @Param('id') id: string,
    @Body() body: { beasiswaPercentage: number; beasiswaReason?: string },
  ) {
    return this.studentsService.updateBeasiswa(
      id,
      body.beasiswaPercentage,
      body.beasiswaReason,
    );
  }

  @Post('bulk-beasiswa')
  @UseGuards(JwtAuthGuard)
  bulkUpdateBeasiswa(
    @Body()
    body: {
      studentIds: string[];
      beasiswaSeragamPct?: number;
      beasiswaSppPct?: number;
      beasiswaDppPct?: number;
      beasiswaPercentage?: number;
      beasiswaReason?: string;
    },
  ) {
    return this.studentsService.bulkUpdateBeasiswa(body);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.ADMIN_TU, 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM', 'KESISWAAN', 'WAKA_KESISWAAN')
  toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.studentsService.toggleActive(id, isActive);
  }

  @Post('bulk-toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.ADMIN_TU, 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM', 'KESISWAAN', 'WAKA_KESISWAAN')
  bulkToggleActive(
    @Body('ids') ids: string[],
    @Body('isActive') isActive: boolean,
  ) {
    return this.studentsService.bulkToggleActive(ids, isActive);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.ADMIN_TU, 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM', 'KESISWAAN', 'WAKA_KESISWAAN')
  setStudentStatus(
    @Param('id') id: string,
    @Body('status')
    status: 'AKTIF' | 'NONAKTIF' | 'LULUS' | 'ALUMNI' | 'KELUAR',
    @Body('details') details?: any,
  ) {
    return this.studentsService.setStudentStatus(id, status, details);
  }

  @Post('bulk-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', UserRole.ADMIN_IT, UserRole.ADMIN_TU, 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM', 'KESISWAAN', 'WAKA_KESISWAAN')
  bulkSetStudentStatus(
    @Body('ids') ids: string[],
    @Body('status')
    status: 'AKTIF' | 'NONAKTIF' | 'LULUS' | 'ALUMNI' | 'KELUAR',
    @Body('details') details?: any,
  ) {
    return this.studentsService.bulkSetStudentStatus(ids, status, details);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  /**
   * GET /students/template
   * Generate Excel template for bulk student import with Program column and data validation
   */
  @Get('template')
  async generateTemplate(@Res() res: Response) {
    const buffer = await this.studentsService.generateExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template_import_siswa.xlsx',
    );
    res.send(buffer);
  }
}
