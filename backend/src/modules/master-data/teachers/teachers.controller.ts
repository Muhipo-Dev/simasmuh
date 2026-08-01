import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.teachersService.create(data);
  }

  @Post('bulk')
  createBulk(@Body() dataArray: any[]) {
    return this.teachersService.createBulk(dataArray);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.teachersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
