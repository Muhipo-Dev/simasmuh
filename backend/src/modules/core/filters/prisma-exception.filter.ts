import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // P2002: Unique constraint violation (Duplikasi Data Ditolak)
    if (exception.code === 'P2002') {
      const target = (exception.meta?.target as string[]) || [];
      const fields = Array.isArray(target) ? target.join(', ') : 'tertentu';
      const message = `Data duplikat ditolak oleh sistem. Data dengan kombinasi (${fields}) sudah terdaftar dan tidak boleh diinput ulang.`;

      this.logger.warn(`[DUPLICATE BLOCKED] ${message}`);

      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: message,
        fields: target,
      });
    }

    // Default error fallback for Prisma known request errors
    return response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: exception.message,
    });
  }
}
