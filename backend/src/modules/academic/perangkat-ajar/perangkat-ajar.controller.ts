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
} from '@nestjs/common';
import { PerangkatAjarService } from './perangkat-ajar.service';
import {
  CreatePerangkatAjarDto,
  UpdatePerangkatAjarDto,
  VerifyPerangkatAjarDto,
} from './dto/perangkat-ajar.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('perangkat-ajar')
@UseGuards(JwtAuthGuard)
export class PerangkatAjarController {
  constructor(private readonly perangkatAjarService: PerangkatAjarService) {}

  @Post()
  create(@Body() dto: CreatePerangkatAjarDto, @Request() req: any) {
    return this.perangkatAjarService.create(dto, req.user);
  }

  @Get()
  findAll(
    @Query('teacherId') teacherId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('jenisPerangkat') jenisPerangkat?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    return this.perangkatAjarService.findAll({
      teacherId,
      academicYear,
      semester,
      jenisPerangkat,
      status,
      search,
      currentUser: req?.user,
    });
  }

  @Get('stats-rekap')
  getStatsRekap(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
  ) {
    return this.perangkatAjarService.getStatsRekap(academicYear, semester);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.perangkatAjarService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePerangkatAjarDto,
    @Request() req: any,
  ) {
    return this.perangkatAjarService.update(id, dto, req.user);
  }

  @Patch(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyPerangkatAjarDto,
    @Request() req: any,
  ) {
    return this.perangkatAjarService.verify(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.perangkatAjarService.remove(id, req.user);
  }
}
