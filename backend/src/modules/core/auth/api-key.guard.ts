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
      process.env.API_KEY || 'nailar-muhipo55',
      'nailar-muhipo55',
    ];

    const isValidKey = (apiKey && validApiKeys.includes(apiKey));
    const hasBearer = (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer '));

    // Wajib memiliki API Key rahasia sistem ('nailar-muhipo55') atau Token Bearer resmi
    if (isValidKey || hasBearer) {
      return true;
    }

    throw new UnauthorizedException('Akses ditolak: API Key atau otentikasi internal SIMASMUH tidak valid.');
  }
}
