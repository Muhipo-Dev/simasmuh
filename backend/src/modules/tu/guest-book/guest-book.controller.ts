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
} from '@nestjs/common';
import { GuestBookService } from './guest-book.service';
import { CreateGuestBookDto } from './dto/create-guest-book.dto';
import { UpdateGuestBookStatusDto } from './dto/update-guest-book-status.dto';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

@Controller('guest-book')
export class GuestBookController {
  constructor(private readonly guestBookService: GuestBookService) {}

  /**
   * Endpoint Publik: Pengisian Formulir Buku Tamu dari QR Code (Tanpa Autentikasi)
   */
  @Post('public')
  createPublic(@Body() createDto: CreateGuestBookDto) {
    return this.guestBookService.createPublic(createDto);
  }

  /**
   * Endpoint Terproteksi: Menampilkan Seluruh Log Buku Tamu untuk Admin/TU
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('search') search?: string,
    @Query('kategori') kategori?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.guestBookService.findAll({
      search,
      kategori,
      status,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  /**
   * Endpoint Terproteksi: Detail Buku Tamu
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.guestBookService.findOne(id);
  }

  /**
   * Endpoint Terproteksi: Tambah Data Tamu Manual oleh Staf TU
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateGuestBookDto) {
    return this.guestBookService.create(createDto);
  }

  /**
   * Endpoint Terproteksi: Update Status Kedatangan (TIBA / PROSES / SELESAI)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateGuestBookStatusDto,
  ) {
    return this.guestBookService.updateStatus(id, updateDto);
  }

  /**
   * Endpoint Terproteksi: Hapus Data Tamu
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.guestBookService.remove(id);
  }
}
