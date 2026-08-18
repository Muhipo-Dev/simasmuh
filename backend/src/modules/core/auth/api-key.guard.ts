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

    const validApiKey = process.env.API_KEY || 'siakad_secret_api_key_2026';
    const authHeader = request.headers['authorization'];

    if (apiKey === validApiKey || (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer '))) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing API Key');
  }
}
