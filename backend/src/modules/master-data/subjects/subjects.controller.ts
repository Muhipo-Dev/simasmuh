import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  create(@Body() data: { name: string; code: string }) {
    return this.subjectsService.create(data);
  }

  @Post('bulk')
  createBulk(@Body() dataArray: { name: string; code: string }[]) {
    return this.subjectsService.createBulk(dataArray);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.subjectsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
