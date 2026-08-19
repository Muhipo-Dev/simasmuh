import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const authHeader = request.headers['authorization'];

    const validApiKeys = [
      process.env.API_KEY || 'siakad_secret_api_key_2026',
      process.env.WHATSAPP_API_KEY || 'simasmuh_wa_secret_2026',
      'siakad_secret_api_key_2026',
      'simasmuh_wa_secret_2026',
    ];

    if (
      (apiKey && validApiKeys.includes(apiKey)) ||
      (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) ||
      request.url.startsWith('/announcements/public') ||
      request.url.startsWith('/uploads/') ||
      request.url === '/'
    ) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing API Key');
  }
}
