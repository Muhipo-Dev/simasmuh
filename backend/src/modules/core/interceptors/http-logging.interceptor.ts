import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RuntimeLogStreamerService } from '../services/runtime-log-streamer.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly runtimeStreamer: RuntimeLogStreamerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (!req) {
      return next.handle();
    }

    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode || 200;

          // Jangan catat health check / static polling secara berlebihan
          if (originalUrl === '/api/health' || originalUrl === '/health') return;

          this.runtimeStreamer.pushLog(
            statusCode >= 400 ? 'WARN' : 'INFO',
            'HTTP',
            `${method} ${originalUrl} ${statusCode} [${duration}ms] - IP: ${ip || req.socket?.remoteAddress || '-'}`,
            {
              method,
              url: originalUrl,
              statusCode,
              durationMs: duration,
              user: req.user?.username || null,
            },
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const statusCode = err?.status || 500;
          this.runtimeStreamer.pushLog(
            'ERROR',
            'HTTP_ERROR',
            `${method} ${originalUrl} ${statusCode} [${duration}ms] - Error: ${err?.message || err}`,
            {
              method,
              url: originalUrl,
              statusCode,
              durationMs: duration,
              error: err?.message || String(err),
            },
          );
        },
      }),
    );
  }
}
