import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import * as os from 'os';

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

  // Parameter Kapasitas & Perlindungan Lonjakan Beban (High Capacity)
  public maxConcurrentActive = 1000; // Kapasitas 1000 pengguna aktif serentak
  public maxRpsThreshold = 250; // Kuota traffic hingga 250 req/detik
  public tokenTtlMs = 15 * 60 * 1000; // Masa berlaku tiket admit (15 menit)
  public queueTtlMs = 5 * 60 * 1000; // Masa tunggu tiket antrean (5 menit timeout)
  public forceEnabled = false; // Mode darurat aktif manual oleh admin

  // State in-memory
  private activeTokens = new Map<string, QueueSlot>();
  private waitingQueue: QueueSlot[] = [];
  private requestCounter = 0;
  private currentRps = 0;
  private lastRpsCheck = Date.now();

  // Metric CPU & RAM Tracking
  private lastCpuUsage = process.cpuUsage();
  private lastCpus = os.cpus();
  private lastCpuCheck = Date.now();
  private currentCpuPercent = 0;
  private currentRamPercent = 0;
  public cpuThreshold = 80; // Ambang batas 80%
  public ramThreshold = 80; // Ambang batas 80%

  private timer: NodeJS.Timeout;

  constructor() {
    // Monitor RPS, CPU & RAM setiap detik
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

    // Kalkulasi CPU usage persentase (Sistem Host & Proses Node.js)
    const cpuElapsedMs = now - this.lastCpuCheck;
    if (cpuElapsedMs >= 1000) {
      // 1. Process CPU
      const cpuUsageDiff = process.cpuUsage(this.lastCpuUsage);
      const totalCpuTimeMs = (cpuUsageDiff.user + cpuUsageDiff.system) / 1000;
      const numCores = os.cpus().length || 1;
      const processCpuPercent = Math.min(
        100,
        Math.round((totalCpuTimeMs / (cpuElapsedMs * numCores)) * 100),
      );
      this.lastCpuUsage = process.cpuUsage();

      // 2. System-wide CPU across all cores
      const currentCpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      for (let i = 0; i < currentCpus.length; i++) {
        const prev = this.lastCpus[i] || currentCpus[i];
        const curr = currentCpus[i];
        const idle = curr.times.idle - prev.times.idle;
        const total =
          curr.times.user -
          prev.times.user +
          (curr.times.nice - prev.times.nice) +
          (curr.times.sys - prev.times.sys) +
          (curr.times.irq - prev.times.irq) +
          idle;
        totalIdle += idle;
        totalTick += total;
      }
      this.lastCpus = currentCpus;
      const systemCpuPercent =
        totalTick > 0
          ? Math.round(((totalTick - totalIdle) / totalTick) * 100)
          : 0;

      this.currentCpuPercent = Math.min(
        100,
        Math.max(systemCpuPercent, processCpuPercent),
      );
      this.lastCpuCheck = now;
    }

    // Kalkulasi RAM (Sistem Host Total vs Free & Node Heap)
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const systemRamPercent =
        totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0;

      const mem = process.memoryUsage();
      const heapPercent =
        mem.heapTotal > 0
          ? Math.round((mem.heapUsed / mem.heapTotal) * 100)
          : 0;

      this.currentRamPercent = Math.min(
        100,
        Math.max(systemRamPercent, heapPercent),
      );
    } catch {
      this.currentRamPercent = 0;
    }

    // Bersihkan token aktif yang sudah expired
    for (const [token, slot] of this.activeTokens.entries()) {
      if (now - slot.lastActive > this.tokenTtlMs) {
        this.activeTokens.delete(token);
      }
    }

    // Bersihkan antrean yang abandoned (tidak refresh status > 30 detik)
    this.waitingQueue = this.waitingQueue.filter(
      (slot) => now - slot.lastActive < 35000,
    );

    // Admit pengguna antrean terdepan jika kuota slot aktif masih tersedia dan beban tidak kritis
    const availableSlots = this.maxConcurrentActive - this.activeTokens.size;
    if (
      availableSlots > 0 &&
      this.waitingQueue.length > 0 &&
      !this.isTrafficCritical()
    ) {
      const toAdmitCount = Math.min(
        availableSlots,
        Math.ceil(this.maxConcurrentActive * 0.2),
        this.waitingQueue.length,
      );
      for (let i = 0; i < toAdmitCount; i++) {
        const nextUser = this.waitingQueue.shift();
        if (nextUser) {
          nextUser.admittedAt = now;
          nextUser.lastActive = now;
          this.activeTokens.set(nextUser.token, nextUser);
          this.logger.log(
            `🚪 [Waiting Room] User ${nextUser.token.slice(0, 8)} diizinkan masuk ke sistem (Sisa antrean: ${this.waitingQueue.length})`,
          );
        }
      }
    }
  }

  public recordRequest() {
    this.requestCounter++;
  }

  public isTrafficCritical(): boolean {
    if (this.forceEnabled) return true;

    // 1. Cek Beban Memori dan CPU Server >= 80% (Hampir penuh / di atas 80%)
    const isCpuOverloaded = this.currentCpuPercent >= this.cpuThreshold;
    const isRamOverloaded = this.currentRamPercent >= this.ramThreshold;

    if (isCpuOverloaded || isRamOverloaded) {
      return true;
    }

    // 2. Cek RPS (Request Per Detik) ekstrem (> 250 req/detik)
    if (this.currentRps > this.maxRpsThreshold) return true;

    // 3. Cek Kapasitas Pengguna Aktif Serentak (> 1000 concurrent user)
    if (this.activeTokens.size >= this.maxConcurrentActive) return true;

    return false;
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

  public getOrCreateQueue(
    token?: string,
    ip?: string,
  ): {
    token: string;
    status: 'ADMITTED' | 'QUEUED';
    position: number;
    totalWaiting: number;
    estimatedWaitSeconds: number;
    serverMetrics?: {
      cpuPercent: number;
      ramPercent: number;
      cpuThreshold: number;
      ramThreshold: number;
    };
  } {
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
    let existingIndex = token
      ? this.waitingQueue.findIndex((s) => s.token === token)
      : -1;
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
      serverMetrics: {
        cpuPercent: this.currentCpuPercent,
        ramPercent: this.currentRamPercent,
        cpuThreshold: this.cpuThreshold,
        ramThreshold: this.ramThreshold,
      },
    };
  }

  public getMetrics() {
    return {
      activeUsers: this.activeTokens.size,
      maxCapacity: this.maxConcurrentActive,
      queuedUsers: this.waitingQueue.length,
      currentRps: this.currentRps,
      rpsThreshold: this.maxRpsThreshold,
      cpuPercent: this.currentCpuPercent,
      ramPercent: this.currentRamPercent,
      cpuThreshold: this.cpuThreshold,
      ramThreshold: this.ramThreshold,
      isTrafficCritical: this.isTrafficCritical(),
      forceEnabled: this.forceEnabled,
    };
  }

  public setCapacity(
    maxActive?: number,
    maxRps?: number,
    force?: boolean,
    cpuThreshold?: number,
    ramThreshold?: number,
  ) {
    if (typeof maxActive === 'number' && maxActive > 0)
      this.maxConcurrentActive = maxActive;
    if (typeof maxRps === 'number' && maxRps > 0)
      this.maxRpsThreshold = maxRps;
    if (typeof force === 'boolean') this.forceEnabled = force;
    if (typeof cpuThreshold === 'number') this.cpuThreshold = cpuThreshold;
    if (typeof ramThreshold === 'number') this.ramThreshold = ramThreshold;
    return this.getMetrics();
  }

  public clearQueue() {
    const count = this.waitingQueue.length;
    this.waitingQueue = [];
    return { success: true, clearedCount: count, metrics: this.getMetrics() };
  }

  public resetActiveTokens() {
    const count = this.activeTokens.size;
    this.activeTokens.clear();
    return { success: true, resetCount: count, metrics: this.getMetrics() };
  }
}
