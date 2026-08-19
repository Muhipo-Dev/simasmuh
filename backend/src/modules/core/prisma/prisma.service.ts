import 'dotenv/config';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    // Detect if database is remote (Supabase / Neon / Cloud Postgres)
    const isRemoteDb =
      connectionString?.includes('supabase.com') ||
      connectionString?.includes('pooler.supabase.com') ||
      connectionString?.includes('supabase.co') ||
      connectionString?.includes('sslmode=require') ||
      connectionString?.includes('neon.tech') ||
      process.env.NODE_ENV === 'production';

    const poolConfig: any = {
      connectionString,
      max: isRemoteDb ? 20 : 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    if (isRemoteDb) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        '✅ Database connected successfully (PostgreSQL / Supabase)',
      );
    } catch (error) {
      this.logger.error('❌ Failed to connect to Database:', error);
    }
  }
}
