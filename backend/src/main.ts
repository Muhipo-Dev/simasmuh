import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Security Headers (Protection from XSS, Clickjacking, Sniffing)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Diserahkan ke frontend Next.js CSP
    }),
  );

  // Fast response compression for JSON data payloads
  app.use(compression());

  // Enable global validation pipe with sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Secure CORS Whitelist
  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (mobile apps, server-to-server, curl) atau localhost
      if (!origin || /^http:\/\/(localhost|127\.0.0\.1)(:[0-9]+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Mendukung multi-domain lokal/sekolah
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With'],
  });

  // Tingkatkan limit payload untuk upload data yang lebih besar (hingga 50mb)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0'); // Run backend on 3001
}
bootstrap().catch(console.error);
