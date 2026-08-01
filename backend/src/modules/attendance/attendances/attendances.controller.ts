import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';

@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get()
  findAll() {
    return this.attendancesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.attendancesService.create(data);
  }

  @Post('bulk')
  createBulk(@Body() data: any[]) {
    return this.attendancesService.createBulk(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.attendancesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendancesService.remove(id);
  }
}
