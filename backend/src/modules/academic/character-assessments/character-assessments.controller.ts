import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import {
  CharacterAssessmentsService,
  CreateAssessmentDto,
} from './character-assessments.service';

class VerifyAssessmentDto {
  @IsOptional()
  @IsEnum(['TERVERIFIKASI', 'DITOLAK', 'DALAM_PEMBINAAN'])
  status?: 'TERVERIFIKASI' | 'DITOLAK' | 'DALAM_PEMBINAAN';

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class ResetPointsDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('character-assessments')
@UseGuards(JwtAuthGuard)
export class CharacterAssessmentsController {
  constructor(
    private readonly assessmentsService: CharacterAssessmentsService,
  ) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.assessmentsService.findAll(query);
  }

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.assessmentsService.getDashboardStatistics();
  }

  @Get('student/:studentId/summary')
  async getStudentSummary(@Param('studentId') studentId: string) {
    return this.assessmentsService.getStudentSummary(studentId);
  }

  @Get('students-summary')
  async getStudentsSummary(
    @Query() query: { classId?: string; search?: string },
  ) {
    return this.assessmentsService.getStudentsSummary(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateAssessmentDto, @Request() req: any) {
    const evaluatorId = req.user?.id || req.user?.userId;
    if (!evaluatorId) {
      throw new BadRequestException('Pengguna evaluator tidak valid');
    }
    return this.assessmentsService.create(body, evaluatorId);
  }

  @Post(':id/verify')
  async verify(
    @Param('id') id: string,
    @Body() body: VerifyAssessmentDto,
    @Request() req: any,
  ) {
    const verifierId = req.user?.id || req.user?.userId;
    if (!verifierId) {
      throw new BadRequestException('Pengguna verifikator tidak valid');
    }
    return this.assessmentsService.verifyAssessment(id, verifierId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateAssessmentDto>,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.assessmentsService.update(id, body, userId);
  }

  @Post('student/:studentId/reset')
  async resetStudentPoints(
    @Param('studentId') studentId: string,
    @Body() body: ResetPointsDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Pengguna tidak valid');
    }
    return this.assessmentsService.resetStudentPoints(
      studentId,
      userId,
      body.reason,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.assessmentsService.remove(id, userId);
  }
}
