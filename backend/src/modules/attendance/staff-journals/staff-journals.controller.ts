import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { StaffJournalsService } from './staff-journals.service';

@Controller('staff-journals')
export class StaffJournalsController {
  constructor(private readonly staffJournalsService: StaffJournalsService) {}

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.staffJournalsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffJournalsService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.staffJournalsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.staffJournalsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staffJournalsService.remove(id);
  }
}
