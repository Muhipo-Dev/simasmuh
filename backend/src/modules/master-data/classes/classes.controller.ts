import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ClassesService } from './classes.service';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  create(
    @Body() data: { name: string; gradeLevel: number; academicYear: string },
  ) {
    return this.classesService.create(data);
  }

  @Post('bulk')
  createBulk(
    @Body()
    dataArray: { name: string; gradeLevel: number; academicYear: string }[],
  ) {
    return this.classesService.createBulk(dataArray);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.classesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
