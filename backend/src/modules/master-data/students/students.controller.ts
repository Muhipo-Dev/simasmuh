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
   * PATCH /students/:id/discount
   * Pengaturan Diskon Default Siswa oleh Bagian Keuangan / Admin
   */
  @Patch(':id/discount')
  @UseGuards(JwtAuthGuard)
  updateDiscount(
    @Param('id') id: string,
    @Body() body: { discountPercentage: number; discountReason?: string },
  ) {
    return this.studentsService.updateDiscount(
      id,
      body.discountPercentage,
      body.discountReason,
    );
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
