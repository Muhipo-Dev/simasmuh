import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, UserRole } from '../auth/roles.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  async uploadFile(@Body() data: { image: string }) {
    if (!data.image) {
      return { error: 'No image provided' };
    }
    const url = await this.uploadService.saveBase64Image(data.image);
    return { url };
  }

  // ==========================================
  // CAROUSEL MANAGEMENT
  // ==========================================
  @Get('carousel')
  async listCarouselImages() {
    const images = await this.uploadService.listCarouselImages();
    return { images };
  }

  @Post('carousel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_WEB, UserRole.ADMIN_IT)
  async uploadCarouselImage(@Body() data: { image: string }) {
    if (!data.image) {
      return { error: 'No image provided' };
    }
    const url = await this.uploadService.saveCarouselImage(data.image);
    return { url };
  }

  @Delete('carousel/:filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_WEB, UserRole.ADMIN_IT)
  async deleteCarouselImage(@Param('filename') filename: string) {
    const success = await this.uploadService.deleteCarouselImage(filename);
    if (!success) {
      return { success: false, message: 'File not found or cannot be deleted' };
    }
    return { success: true };
  }
}
