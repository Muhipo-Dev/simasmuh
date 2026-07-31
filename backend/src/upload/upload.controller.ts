import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { UploadService } from './upload.service';

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
  async uploadCarouselImage(@Body() data: { image: string }) {
    if (!data.image) {
      return { error: 'No image provided' };
    }
    const url = await this.uploadService.saveCarouselImage(data.image);
    return { url };
  }

  @Delete('carousel/:filename')
  async deleteCarouselImage(@Param('filename') filename: string) {
    const success = await this.uploadService.deleteCarouselImage(filename);
    if (!success) {
      return { success: false, message: 'File not found or cannot be deleted' };
    }
    return { success: true };
  }
}
