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
import { TeachingJournalsService } from './teaching-journals.service';

@Controller('teaching-journals')
export class TeachingJournalsController {
  constructor(private readonly journalsService: TeachingJournalsService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('date') date?: string,
    @Query('scheduleId') scheduleId?: string,
  ) {
    return this.journalsService.findAll({ userId, teacherId, date, scheduleId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.journalsService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.journalsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.journalsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.journalsService.remove(id);
  }
}
