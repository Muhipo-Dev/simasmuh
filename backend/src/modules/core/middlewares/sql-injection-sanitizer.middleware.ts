import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SqlInjectionSanitizerMiddleware implements NestMiddleware {
  // Pola regex deteksi payload umum SQL Injection
  private readonly sqliPatterns: RegExp[] = [
    /(\b(union(\s+all)?)\s+select\b)/i,
    /(\bselect\b.+\bfrom\b.+\bwhere\b)/i,
    /(\b(insert\s+into|update\s+.+\s+set|delete\s+from|drop\s+(table|database|view|index)|truncate\s+table)\b)/i,
    /(;\s*(drop|delete|insert|update|alter|truncate|create)\b)/i,
    /(\bexec(\s|\+)+(s|x)p\w+)/i,
    /((\b(or|and)\b\s+['"\d\w]+(\s*=\s*['"\d\w]+|\s+like\s+['"]|--|#)))/i,
    /(\b(benchmark|sleep)\s*\(\s*\d+\s*\))/i,
    /(\bwaitfor\s+delay\s+['"]\d+:\d+:\d+['"])/i,
    /(--\s*$|\/\*.*\*\/)/,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    // Lewati endpoint static files atau upload binary multipart
    if (req.path.startsWith('/uploads') || req.is('multipart/form-data')) {
      return next();
    }

    try {
      if (req.query && this.containsSqlInjection(req.query)) {
        throw new BadRequestException('Karakter tidak valid atau pola injeksi SQL terdeteksi pada parameter query.');
      }

      if (req.body && typeof req.body === 'object' && this.containsSqlInjection(req.body)) {
        throw new BadRequestException('Karakter tidak valid atau pola injeksi SQL terdeteksi pada data payload.');
      }

      if (req.params && this.containsSqlInjection(req.params)) {
        throw new BadRequestException('Karakter tidak valid atau pola injeksi SQL terdeteksi pada parameter URL.');
      }

      next();
    } catch (err) {
      if (err instanceof BadRequestException) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message,
        });
      }
      next(err);
    }
  }

  private containsSqlInjection(data: unknown): boolean {
    if (!data) return false;

    if (typeof data === 'string') {
      return this.isSqliString(data);
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        if (this.containsSqlInjection(item)) return true;
      }
      return false;
    }

    if (typeof data === 'object') {
      for (const key of Object.keys(data)) {
        if (this.isSqliString(key)) return true;
        const val = (data as Record<string, unknown>)[key];
        if (this.containsSqlInjection(val)) return true;
      }
    }

    return false;
  }

  private isSqliString(val: string): boolean {
    if (!val || typeof val !== 'string' || val.length < 4) return false;
    
    // Uji kecocokan terhadap pola serangan SQL Injection
    for (const pattern of this.sqliPatterns) {
      if (pattern.test(val)) {
        return true;
      }
    }
    return false;
  }
}
