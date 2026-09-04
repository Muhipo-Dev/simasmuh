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
import { NotulensiRapatService } from './notulensi-rapat.service';
import { CreateNotulensiDto } from './dto/create-notulensi.dto';
import { UpdateNotulensiDto } from './dto/update-notulensi.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('notulensi-rapat')
@UseGuards(JwtAuthGuard)
export class NotulensiRapatController {
  constructor(private readonly notulensiRapatService: NotulensiRapatService) {}

  @Post()
  create(@Body() createDto: CreateNotulensiDto, @Request() req: any) {
    const userId = req.user?.id;
    return this.notulensiRapatService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('kategori') kategori?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notulensiRapatService.findAll({
      search,
      kategori,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notulensiRapatService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNotulensiDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.notulensiRapatService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.notulensiRapatService.remove(id, userId);
  }
}
