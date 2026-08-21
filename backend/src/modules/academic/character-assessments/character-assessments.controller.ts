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
import { CharacterAssessmentsService, CreateAssessmentDto } from './character-assessments.service';

@Controller('character-assessments')
@UseGuards(JwtAuthGuard)
export class CharacterAssessmentsController {
  constructor(private readonly assessmentsService: CharacterAssessmentsService) {}

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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateAssessmentDto>,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.assessmentsService.update(id, body, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.assessmentsService.remove(id, userId);
  }
}
