import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3002;
const API_KEY = process.env.WHATSAPP_API_KEY || 'simasmuh_wa_secret_2026';
const SESSIONS_DIR = path.join(__dirname, '..', 'auth_session');
const SESSION_META_FILE = path.join(SESSIONS_DIR, 'session_meta.json');
const SESSION_LIFETIME_DAYS = 30; // Sesi aktif 30 hari penuh
const SESSION_LIFETIME_MS = SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

interface SessionMeta {
  authenticatedAt: string;
  expiresAt: string;
  connectedPhone: string;
  connectedName?: string;
  lastActiveAt: string;
}

let sock: WASocket | null = null;
let currentQr: string | null = null;
let currentQrDataUrl: string | null = null;
let connectionStatus: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED';
let connectedPhone: string | null = null;
let sessionMeta: SessionMeta | null = null;
let reconnectAttempts = 0;
let isStarting = false;

const logger = pino({ level: 'silent' });

function readSessionMeta(): SessionMeta | null {
  try {
    if (fs.existsSync(SESSION_META_FILE)) {
      const data = fs.readFileSync(SESSION_META_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('⚠️ [WhatsApp Gateway] Gagal membaca session_meta.json:', e);
  }
  return null;
}

function saveSessionMeta(meta: SessionMeta) {
  try {
    sessionMeta = meta;
    fs.writeFileSync(SESSION_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ [WhatsApp Gateway] Gagal menyimpan session_meta.json:', e);
  }
}

function isSessionExpired(meta: SessionMeta | null): boolean {
  if (!meta || !meta.expiresAt) return false;
  const expiryTime = new Date(meta.expiresAt).getTime();
  return Date.now() >= expiryTime;
}

function getSessionRemainingInfo(): {
  daysLeft: number;
  hoursLeft: number;
  expiresAtFormatted: string;
  authenticatedAtFormatted: string;
} | null {
  if (!sessionMeta?.expiresAt) return null;
  const now = Date.now();
  const expiry = new Date(sessionMeta.expiresAt).getTime();
  const diffMs = Math.max(0, expiry - now);
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    daysLeft,
    hoursLeft,
    expiresAtFormatted: new Date(sessionMeta.expiresAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
    authenticatedAtFormatted: new Date(sessionMeta.authenticatedAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
  };
}

function clearSessionStorage(reason: string) {
  console.log(`🧹 [WhatsApp Gateway] Membersihkan penyimpanan sesi (${reason})...`);
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  } catch (e) {
    console.error('⚠️ [WhatsApp Gateway] Error saat membersihkan sesi:', e);
  }
  sessionMeta = null;
  connectedPhone = null;
  currentQr = null;
  currentQrDataUrl = null;
}

async function startWhatsApp() {
  if (isStarting) return;
  isStarting = true;

  try {
    sessionMeta = readSessionMeta();

    // 1. Cek apakah sesi yang tersimpan sudah melebihi 30 hari
    if (isSessionExpired(sessionMeta)) {
      console.log(`⏰ [WhatsApp Gateway] Sesi 30 hari telah kadaluarsa (${sessionMeta?.expiresAt}). Meminta scan QR baru.`);
      clearSessionStorage('Sesi 30 hari kadaluarsa');
    }

    connectionStatus = 'CONNECTING';
    const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      browser: ['SIMASMUH Gateway', 'Chrome', '124.0.0.0'],
      keepAliveIntervalMs: 30_000,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      emitOwnEvents: false,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        currentQrDataUrl = await QRCode.toDataURL(qr);
        connectionStatus = 'SCAN_QR';
        console.log('📱 [WhatsApp Gateway] QR Code siap dipindai di http://localhost:' + PORT);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const expired = isSessionExpired(sessionMeta);

        connectionStatus = 'DISCONNECTED';
        currentQr = null;
        currentQrDataUrl = null;
        connectedPhone = null;

        console.log(
          `❌ [WhatsApp Gateway] Koneksi terputus (Status: ${statusCode}, LoggedOut: ${isLoggedOut}, Expired: ${expired})`
        );

        if (isLoggedOut || expired) {
          console.log('🔒 [WhatsApp Gateway] Sesi dikeluarkan paksa dari aplikasi WA HP atau telah 30 hari. Menyiapkan QR code baru...');
          clearSessionStorage(isLoggedOut ? 'Logout dari perangkat HP' : 'Sesi 30 hari berakhir');
          reconnectAttempts = 0;
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, 3000);
        } else {
          // Reconnect otomatis tanpa mereset sesi
          reconnectAttempts++;
          const delay = Math.min(reconnectAttempts * 3000, 15000);
          console.log(`🔄 [WhatsApp Gateway] Menghubungkan ulang dalam ${delay / 1000} detik (Percobaan ke-${reconnectAttempts})...`);
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, delay);
        }
      } else if (connection === 'open') {
        reconnectAttempts = 0;
        connectionStatus = 'CONNECTED';
        currentQr = null;
        currentQrDataUrl = null;
        connectedPhone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : '088293733330';

        const now = new Date();
        const existingMeta = readSessionMeta();

        if (!existingMeta || !existingMeta.authenticatedAt) {
          const newMeta: SessionMeta = {
            authenticatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
            connectedPhone: connectedPhone,
            connectedName: sock?.user?.name || 'SIMASMUH Official Gateway',
            lastActiveAt: now.toISOString(),
          };
          saveSessionMeta(newMeta);
        } else {
          existingMeta.lastActiveAt = now.toISOString();
          existingMeta.connectedPhone = connectedPhone;
          if (sock?.user?.name) existingMeta.connectedName = sock.user.name;
          saveSessionMeta(existingMeta);
        }

        const remaining = getSessionRemainingInfo();
        console.log(
          `✅ [WhatsApp Gateway] Terhubung dengan nomor: ${connectedPhone} (${sock?.user?.name || 'SIMASMUH Gateway'})`
        );
        console.log(
          `⏳ [WhatsApp Gateway] Masa aktif sesi 30 hari: ${remaining?.daysLeft ?? 30} hari tersisa (Sampai: ${remaining?.expiresAtFormatted})`
        );
      }
    });
  } catch (err) {
    console.error('❌ [WhatsApp Gateway] Inisialisasi error:', err);
    connectionStatus = 'DISCONNECTED';
    setTimeout(() => {
      isStarting = false;
      startWhatsApp();
    }, 5000);
  } finally {
    isStarting = false;
  }
}

// 2. Pemeriksaan Berkala Setiap 30 Menit untuk Memastikan Aturan 30 Hari
setInterval(() => {
  if (connectionStatus === 'CONNECTED' && sessionMeta) {
    if (isSessionExpired(sessionMeta)) {
      console.log('⏰ [WhatsApp Gateway] Masa aktif 30 hari tercapai. Melakukan refresh sesi baru...');
      if (sock) {
        try {
          sock.end(undefined);
        } catch (e) {}
      }
      clearSessionStorage('Refresh 30 hari berakhir');
      startWhatsApp();
    }
  }
}, 30 * 60 * 1000);

function normalizeJid(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.replace('+', '');
  }
  return `${cleaned}@s.whatsapp.net`;
}

// Middleware Autentikasi API Key
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const reqApiKey = req.headers['x-api-key'] || req.query.apiKey || (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null);

  if (API_KEY && reqApiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: 'API Key WhatsApp Gateway tidak valid' });
  }
  next();
}

// 1. Status API
app.get('/api/status', (req, res) => {
  const remaining = getSessionRemainingInfo();
  res.json({
    status: connectionStatus,
    connectedPhone,
    user: sock?.user || null,
    hasQr: Boolean(currentQrDataUrl),
    qrDataUrl: currentQrDataUrl,
    sessionMeta: sessionMeta
      ? {
          ...sessionMeta,
          remainingDays: remaining?.daysLeft,
          remainingHours: remaining?.hoursLeft,
          expiresAtFormatted: remaining?.expiresAtFormatted,
          authenticatedAtFormatted: remaining?.authenticatedAtFormatted,
        }
      : null,
    sessionLifetimeDays: SESSION_LIFETIME_DAYS,
    timestamp: new Date().toISOString(),
  });
});

// 2. Send Message API
app.post('/api/send', authMiddleware, async (req, res) => {
  try {
    const { phone, target, to, message } = req.body;
    const recipientPhone = phone || target || to;

    if (!recipientPhone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Parameter `phone` (nomor tujuan) dan `message` (isi pesan) wajib diisi.',
      });
    }

    if (connectionStatus !== 'CONNECTED' || !sock) {
      return res.status(503).json({
        success: false,
        status: connectionStatus,
        message: 'WhatsApp Gateway belum terhubung. Silakan pindai QR code terlebih dahulu di http://localhost:' + PORT,
      });
    }

    const jid = normalizeJid(recipientPhone);
    const sent = await sock.sendMessage(jid, { text: message });

    return res.json({
      success: true,
      messageId: sent?.key?.id || 'sent',
      recipient: recipientPhone,
      jid,
      status: 'SENT',
    });
  } catch (error: any) {
    console.error('❌ [WhatsApp Gateway] Gagal mengirim pesan:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal mengirim pesan WhatsApp',
    });
  }
});

// 3. Logout / Reset Session API Manual
app.post('/api/logout', async (req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(undefined);
      } catch (e) {}
    }
    clearSessionStorage('Logout manual diminta dari API / Dashboard');
    setTimeout(() => {
      isStarting = false;
      startWhatsApp();
    }, 1500);
    return res.json({ success: true, message: 'Sesi WhatsApp berhasil direset. Silakan scan QR baru.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// 4. Web Dashboard UI
app.get('/', (req, res) => {
  const remaining = getSessionRemainingInfo();
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIMASMUH - WhatsApp Gateway Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <meta http-equiv="refresh" content="10">
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
  <div class="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
    <div class="flex items-center justify-between border-b border-slate-700 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-2xl shadow-inner">📱</div>
        <div>
          <h1 class="text-lg font-extrabold text-white">SIMASMUH WA Gateway</h1>
          <p class="text-xs text-slate-400">WhatsApp Notification Service • SMA Muhammadiyah 1 Ponorogo</p>
        </div>
      </div>
      <div>
        ${
          connectionStatus === 'CONNECTED'
            ? '<span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> TERHUBUNG</span>'
            : connectionStatus === 'SCAN_QR'
            ? '<span class="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> SCAN QR</span>'
            : '<span class="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold rounded-full">MENUNGGU</span>'
        }
      </div>
    </div>

    ${
      connectionStatus === 'CONNECTED'
        ? `
      <div class="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Gateway Aktif & Sesi Tersimpan Stabil
          </div>
          <span class="text-[11px] font-semibold bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
            Masa Berlaku: 30 Hari
          </span>
        </div>

        <div class="text-xs text-slate-300 space-y-1.5 pt-1">
          <div class="flex items-center justify-between py-1 border-b border-emerald-900/40">
            <span class="text-slate-400">Nomor Pengirim:</span>
            <span class="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">${connectedPhone || '088293733330'}</span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-emerald-900/40">
            <span class="text-slate-400">Waktu Terhubung:</span>
            <span class="text-slate-200 font-medium">${remaining?.authenticatedAtFormatted || '-'}</span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-emerald-900/40">
            <span class="text-slate-400">Sisa Masa Berlaku:</span>
            <span class="text-emerald-400 font-bold">${remaining ? `${remaining.daysLeft} Hari ${remaining.hoursLeft} Jam` : '30 Hari'}</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-slate-400">Kadaluarsa Sesi Pada:</span>
            <span class="text-slate-300 font-mono text-[11px]">${remaining?.expiresAtFormatted || '-'}</span>
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between gap-3">
          <p class="text-[11px] text-slate-400 italic">
            🛡️ Sesi tidak akan auto logout selama 30 hari kecuali diputus manual atau logout dari aplikasi WhatsApp di HP.
          </p>
          <button onclick="handleLogout()" class="shrink-0 text-xs px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition font-medium cursor-pointer">
            Logout Manual
          </button>
        </div>
      </div>
      `
        : currentQrDataUrl
        ? `
      <div class="flex flex-col items-center justify-center p-5 bg-white rounded-xl space-y-3">
        <img src="${currentQrDataUrl}" alt="QR Code WhatsApp" class="w-60 h-60 rounded-lg shadow border border-slate-200" />
        <div class="text-center">
          <p class="text-xs text-slate-800 font-bold">Pindai QR dengan Aplikasi WhatsApp Resmi di HP</p>
          <p class="text-[11px] text-slate-500 mt-0.5">Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat. Sesi otomatis aktif 30 hari.</p>
        </div>
      </div>
      `
        : `
      <div class="text-center py-8 text-slate-400 space-y-3">
        <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-sm font-medium">Menghubungkan ke server WhatsApp...</p>
        <p class="text-xs text-slate-500">Memeriksa kredensial sesi 30 hari...</p>
      </div>
      `
    }

    <div class="bg-slate-900/80 rounded-xl p-4 space-y-2 text-xs font-mono border border-slate-700/60">
      <div class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Konfigurasi API Endpoint</div>
      <div class="flex justify-between items-center text-slate-300">
        <span>Endpoint Kirim:</span>
        <span class="text-emerald-400">http://localhost:${PORT}/api/send</span>
      </div>
      <div class="flex justify-between items-center text-slate-300">
        <span>Status Sesi:</span>
        <span class="text-sky-400">http://localhost:${PORT}/api/status</span>
      </div>
      <div class="flex justify-between items-center text-slate-300">
        <span>API Key:</span>
        <span class="text-amber-300">${API_KEY}</span>
      </div>
    </div>

    <div class="pt-2 text-center text-slate-500 text-[11px]">
      SIMASMUH © 2026 • Sistem Informasi Manajemen Akademik Sekolah
    </div>
  </div>

  <script>
    async function handleLogout() {
      if (confirm('Apakah Anda yakin ingin logout dari WhatsApp Gateway? Sesi akan dihapus dan Anda perlu scan QR ulang.')) {
        try {
          const res = await fetch('/api/logout', { method: 'POST' });
          const json = await res.json();
          alert(json.message || 'Sesi direset');
          window.location.reload();
        } catch (e) {
          alert('Gagal logout: ' + e.message);
        }
      }
    }
  </script>
</body>
</html>
  `);
});

// Start Server & Inisialisasi WhatsApp Socket
app.listen(PORT, () => {
  console.log(`🚀 [WhatsApp Gateway] Server berjalan di http://localhost:${PORT}`);
  console.log(`⏱️ [WhatsApp Gateway] Kebijakan Sesi: Refresh setelah 30 hari atau logout paksa dari perangkat.`);
  startWhatsApp().catch((err) => {
    console.error('❌ Gagal menginisialisasi WhatsApp Gateway:', err);
  });
});
