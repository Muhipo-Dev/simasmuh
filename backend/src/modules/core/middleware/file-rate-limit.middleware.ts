import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class FileRateLimitMiddleware implements NestMiddleware {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly maxUploadsPerHour = 10; // Max 10 uploads per hour per user
  private readonly windowMs = 60 * 60 * 1000; // 1 hour

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to file upload routes
    if (!req.path.includes('upload') || req.method !== 'POST') {
      return next();
    }

    const userKey = this.getUserKey(req);
    if (!userKey) {
      return next(); // Let auth guard handle unauthenticated requests
    }

    const now = Date.now();
    const userRateLimit = this.rateLimitMap.get(userKey);

    if (!userRateLimit || now > userRateLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(userKey, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return next();
    }

    if (userRateLimit.count >= this.maxUploadsPerHour) {
      const resetTimeStr = new Date(
        userRateLimit.resetTime,
      ).toLocaleTimeString();
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many file uploads. Try again after ${resetTimeStr}`,
          retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    userRateLimit.count++;
    this.rateLimitMap.set(userKey, userRateLimit);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxUploadsPerHour.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      (this.maxUploadsPerHour - userRateLimit.count).toString(),
    );
    res.setHeader('X-RateLimit-Reset', userRateLimit.resetTime.toString());

    next();
  }

  private getUserKey(req: Request): string | null {
    // Try to get user from various sources
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Fallback to IP address for unauthenticated requests
    const ip = req.ip || req.connection.remoteAddress;
    return ip ? `ip:${ip}` : null;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}
