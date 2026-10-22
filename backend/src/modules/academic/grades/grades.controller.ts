import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { GradesService } from './grades.service';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // ==================== ENDPOINT ASESMEN KURIKULUM MERDEKA ====================

  @Get('assessments')
  findAssessments(
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string,
    @Query('nis') nis?: string,
    @Query('semester') semester?: string,
    @Query('academicYear') academicYear?: string,
    @Query('userId') userId?: string,
    @Query('excludeProgram') excludeProgram?: string,
  ) {
    return this.gradesService.findAssessments({
      classId,
      subjectId,
      studentId,
      nis,
      semester,
      academicYear,
      userId,
      excludeProgram: excludeProgram === 'true' || excludeProgram === '1',
    });
  }

  @Get('teacher-context')
  getTeacherContext(@Query('userId') userId: string) {
    return this.gradesService.getTeacherContext(userId);
  }

  @Post('assessments/batch')
  batchUpsertAssessments(@Body() data: any) {
    return this.gradesService.batchUpsertAssessments(data);
  }

  @Post('assessments/homeroom-descriptions')
  updateHomeroomDescriptions(@Body() data: any) {
    return this.gradesService.updateHomeroomDescriptions(data);
  }

  @Post('assessments/reset')
  resetAssessments(@Body() data: any) {
    return this.gradesService.resetAssessments(data);
  }

  // ==================== ENDPOINT E-RAPOR PROGRAM (TERPISAH NON-DAPODIK) ====================

  @Get('program-assessments')
  findProgramAssessments(
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string,
    @Query('program') program?: string,
    @Query('semester') semester?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.gradesService.findProgramAssessments({
      classId,
      subjectId,
      studentId,
      program,
      semester,
      academicYear,
    });
  }

  @Post('program-assessments/homeroom-descriptions')
  updateProgramDescriptions(@Body() data: any) {
    return this.gradesService.updateHomeroomDescriptions(data);
  }

  @Get('my-grades')
  getStudentMyGrades(
    @Query('userId') userId?: string,
    @Query('studentId') studentId?: string,
    @Query('semester') semester?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.gradesService.getStudentMyGrades(userId, { semester, academicYear, studentId });
  }

  // ==================== ENDPOINT ARSIP E-RAPOR HISTORIS ====================

  @Get('archive-periods')
  getArchivePeriods() {
    return this.gradesService.getArchivePeriods();
  }

  @Get('archive')
  findArchiveAssessments(
    @Query('academicYear') academicYear: string,
    @Query('semester') semester?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string,
    @Query('search') search?: string,
  ) {
    return this.gradesService.findArchiveAssessments({
      academicYear,
      semester,
      classId,
      subjectId,
      studentId,
      search,
    });
  }

  // ==================== LEGACY FALLBACK ENDPOINTS ====================

  @Get()
  findAll(
    @Query('nis') nis?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.gradesService.findAll({ nis, studentId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.gradesService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.gradesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gradesService.remove(id);
  }
}

