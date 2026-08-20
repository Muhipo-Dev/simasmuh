import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/login-history')
  getLoginHistory(@Param('id') id: string) {
    return this.usersService.getLoginHistory(id);
  }

  @Post(':id/unlink-session')
  unlinkSession(@Param('id') id: string, @Body('sessionId') sessionId: string) {
    return this.usersService.unlinkSession(id, sessionId);
  }

  @Put(':id/profile')
  updateProfile(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateProfile(id, data);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.usersService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[]) {
    return this.usersService.removeMany(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
