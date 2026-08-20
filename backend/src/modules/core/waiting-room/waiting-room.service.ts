import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

interface QueueSlot {
  token: string;
  ip: string;
  joinedAt: number;
  lastActive: number;
  admittedAt?: number;
}

@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  // Parameter Kapasitas & Perlindungan Lonjakan Beban
  public maxConcurrentActive = 400; // Kapasitas pengguna aktif serentak sebelum waiting room aktif
  public maxRpsThreshold = 80; // Jika traffic melebihi 80 req/detik, waiting room otomatis aktif
  public tokenTtlMs = 15 * 60 * 1000; // Masa berlaku tiket admit (15 menit)
  public queueTtlMs = 5 * 60 * 1000; // Masa tunggu tiket antrean (5 menit timeout)
  public forceEnabled = false; // Mode darurat aktif manual oleh admin

  // State in-memory
  private activeTokens = new Map<string, QueueSlot>(); // Tiket pengguna yang sedang aktif di dalam sistem
  private waitingQueue: QueueSlot[] = []; // Antrean pengguna baru yang menunggu giliran
  private requestCounter = 0;
  private currentRps = 0;
  private lastRpsCheck = Date.now();

  private timer: NodeJS.Timeout;

  constructor() {
    // Monitor RPS dan proses otomatis antrean setiap detik
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  private tick() {
    const now = Date.now();
    const elapsed = (now - this.lastRpsCheck) / 1000;
    if (elapsed >= 1) {
      this.currentRps = Math.round(this.requestCounter / elapsed);
      this.requestCounter = 0;
      this.lastRpsCheck = now;
    }

    // Bersihkan token aktif yang sudah expired
    for (const [token, slot] of this.activeTokens.entries()) {
      if (now - slot.lastActive > this.tokenTtlMs) {
        this.activeTokens.delete(token);
      }
    }

    // Bersihkan antrean yang abandoned (tidak refresh status > 30 detik)
    this.waitingQueue = this.waitingQueue.filter((slot) => now - slot.lastActive < 35000);

    // Admit pengguna antrean terdepan jika kuota slot aktif masih tersedia
    const availableSlots = this.maxConcurrentActive - this.activeTokens.size;
    if (availableSlots > 0 && this.waitingQueue.length > 0 && !this.isTrafficCritical()) {
      const toAdmitCount = Math.min(availableSlots, Math.ceil(this.maxConcurrentActive * 0.1), this.waitingQueue.length);
      for (let i = 0; i < toAdmitCount; i++) {
        const nextUser = this.waitingQueue.shift();
        if (nextUser) {
          nextUser.admittedAt = now;
          nextUser.lastActive = now;
          this.activeTokens.set(nextUser.token, nextUser);
          this.logger.log(`🚪 [Waiting Room] User ${nextUser.token.slice(0, 8)} diizinkan masuk ke sistem (Sisa antrean: ${this.waitingQueue.length})`);
        }
      }
    }
  }

  public recordRequest() {
    this.requestCounter++;
  }

  public isTrafficCritical(): boolean {
    return this.forceEnabled || this.currentRps > this.maxRpsThreshold || this.activeTokens.size >= this.maxConcurrentActive;
  }

  public isAdmitted(token?: string): boolean {
    if (!token) return false;
    const slot = this.activeTokens.get(token);
    if (slot) {
      slot.lastActive = Date.now();
      return true;
    }
    return false;
  }

  public getOrCreateQueue(token?: string, ip?: string): { token: string; status: 'ADMITTED' | 'QUEUED'; position: number; totalWaiting: number; estimatedWaitSeconds: number } {
    const now = Date.now();

    // 1. Cek apakah sudah admitted
    if (token && this.activeTokens.has(token)) {
      const slot = this.activeTokens.get(token)!;
      slot.lastActive = now;
      return {
        token,
        status: 'ADMITTED',
        position: 0,
        totalWaiting: this.waitingQueue.length,
        estimatedWaitSeconds: 0,
      };
    }

    // 2. Jika sistem TIDAK sedang lonjakan beban & kuota aman, langsung admit tanpa antre
    if (!this.isTrafficCritical() && this.waitingQueue.length === 0) {
      const newToken = token || randomUUID();
      this.activeTokens.set(newToken, {
        token: newToken,
        ip: ip || 'unknown',
        joinedAt: now,
        lastActive: now,
        admittedAt: now,
      });
      return {
        token: newToken,
        status: 'ADMITTED',
        position: 0,
        totalWaiting: 0,
        estimatedWaitSeconds: 0,
      };
    }

    // 3. Sistem sedang lonjakan beban / antrean penuh -> Masukkan ke Waiting Queue
    let existingIndex = token ? this.waitingQueue.findIndex((s) => s.token === token) : -1;
    let slotToken = token;

    if (existingIndex >= 0) {
      this.waitingQueue[existingIndex].lastActive = now;
    } else {
      slotToken = token || randomUUID();
      this.waitingQueue.push({
        token: slotToken,
        ip: ip || 'unknown',
        joinedAt: now,
        lastActive: now,
      });
      existingIndex = this.waitingQueue.length - 1;
    }

    const position = existingIndex + 1;
    // Estimasi waktu: tiap 10 posisi butuh ~3-5 detik pergeseran kuota
    const estimatedWaitSeconds = Math.max(3, Math.ceil(position * 1.5));

    return {
      token: slotToken!,
      status: 'QUEUED',
      position,
      totalWaiting: this.waitingQueue.length,
      estimatedWaitSeconds,
    };
  }

  public getMetrics() {
    return {
      activeUsers: this.activeTokens.size,
      maxCapacity: this.maxConcurrentActive,
      queuedUsers: this.waitingQueue.length,
      currentRps: this.currentRps,
      rpsThreshold: this.maxRpsThreshold,
      isTrafficCritical: this.isTrafficCritical(),
      forceEnabled: this.forceEnabled,
    };
  }

  public setCapacity(maxActive?: number, maxRps?: number, force?: boolean) {
    if (typeof maxActive === 'number') this.maxConcurrentActive = maxActive;
    if (typeof maxRps === 'number') this.maxRpsThreshold = maxRps;
    if (typeof force === 'boolean') this.forceEnabled = force;
    return this.getMetrics();
  }
}
