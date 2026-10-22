import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Blokir mutasi data (POST, PUT, PATCH, DELETE) jika sesi berada dalam mode Spectator (Read-Only)
    if (user.isReadOnly === true || user.overrideMode === 'spectator') {
      const request = context.switchToHttp().getRequest();
      const method = (request.method || '').toUpperCase();
      const url = request.url || '';

      // Izinkan switch mode atau logout
      const isAllowedSpectatorEndpoint =
        url.includes('/override-token') ||
        url.includes('/auth/logout') ||
        url.includes('/auth/login');

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !isAllowedSpectatorEndpoint) {
        throw new UnauthorizedException(
          'Aksi ditolak. Akun sedang diakses dalam Mode Spectator (Hanya Lihat). Anda tidak memiliki izin untuk menambah, mengedit, atau menghapus data.',
        );
      }
    }

    return user;
  }
}
