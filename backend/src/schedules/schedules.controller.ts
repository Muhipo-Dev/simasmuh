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
import { SchedulesService } from './schedules.service';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.schedulesService.findAll({ userId, teacherId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.schedulesService.create(data);
  }

  @Post('bulk')
  createBulk(@Body() dataArray: any[]) {
    return this.schedulesService.createBulk(dataArray);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.schedulesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
