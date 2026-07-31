import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { StudentsService } from './students.service';

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

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.studentsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
