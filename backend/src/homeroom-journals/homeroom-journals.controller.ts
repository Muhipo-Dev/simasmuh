import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { HomeroomJournalsService } from './homeroom-journals.service';

@Controller('homeroom-journals')
export class HomeroomJournalsController {
  constructor(private readonly journalsService: HomeroomJournalsService) {}

  @Get()
  findAll() {
    return this.journalsService.findAll();
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
