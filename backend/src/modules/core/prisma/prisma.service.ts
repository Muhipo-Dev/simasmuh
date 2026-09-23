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
      max: isRemoteDb ? 35 : 25, // Dioptimasi untuk konkurensi tinggi & throughput cepat
      min: isRemoteDb ? 5 : 3, // Menjaga hot-connections aktif siap melayani request mendadak tanpa latency handshake
      idleTimeoutMillis: 20000, // Recycle koneksi idle lebih cepat untuk mencegah stale connections
      connectionTimeoutMillis: 8000, // Fail-fast connection timeout
      statement_timeout: 12000, // Cegah slow query memblokir thread pool
      query_timeout: 12000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    };

    if (isRemoteDb) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);
    
    // Handle pool errors gracefully to avoid unhandled crashes
    pool.on('error', (err) => {
      this.logger.warn(`Postgres pool background error: ${err?.message || err}`);
    });

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
