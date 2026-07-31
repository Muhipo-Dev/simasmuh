import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const { username, password } = body;
    // We expect frontend to send either username or email in the `username` field
    return this.authService.login(username, password);
  }

  @Post('google-login')
  async googleLogin(@Body() body: { email: string }) {
    return this.authService.googleLogin(body.email);
  }

  @Post('link-google')
  async linkGoogle(@Body() body: any) {
    const { email, username, password } = body;
    return this.authService.linkGoogleAccount(email, username, password);
  }
}
