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

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

let sock: WASocket | null = null;
let currentQr: string | null = null;
let currentQrDataUrl: string | null = null;
let connectionStatus: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED';
let connectedPhone: string | null = null;

const logger = pino({ level: 'silent' });

async function startWhatsApp() {
  connectionStatus = 'CONNECTING';
  const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
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
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      connectionStatus = 'DISCONNECTED';
      currentQr = null;
      currentQrDataUrl = null;
      connectedPhone = null;

      console.log(`❌ [WhatsApp Gateway] Koneksi terputus (status: ${statusCode}). Mencoba menghubungkan kembali: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log('🔒 Sesi telah keluar. Silakan scan QR code baru.');
        try {
          fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
          fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        } catch (e) {}
        setTimeout(startWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      connectionStatus = 'CONNECTED';
      currentQr = null;
      currentQrDataUrl = null;
      connectedPhone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : '088293733330';
      console.log(`✅ [WhatsApp Gateway] Terhubung dengan nomor: ${connectedPhone} (${sock?.user?.name || 'SIMASMUH Gateway'})`);
    }
  });
}

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
  res.json({
    status: connectionStatus,
    connectedPhone,
    user: sock?.user || null,
    hasQr: Boolean(currentQrDataUrl),
    qrDataUrl: currentQrDataUrl,
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
    console.error('❌ Error sending message:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal mengirim pesan WhatsApp',
    });
  }
});

// 3. Logout / Reset Session API
app.post('/api/logout', authMiddleware, async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    setTimeout(startWhatsApp, 1000);
    return res.json({ success: true, message: 'Sesi WhatsApp berhasil direset. Silakan scan QR baru.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// 4. Web Dashboard UI
app.get('/', (req, res) => {
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
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
  <div class="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
    <div class="flex items-center justify-between border-b border-slate-700 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl">📱</div>
        <div>
          <h1 class="text-xl font-extrabold text-white">SIMASMUH WA Gateway</h1>
          <p class="text-xs text-slate-400">Self-Hosted WhatsApp Notification Server</p>
        </div>
      </div>
      <div>
        ${
          connectionStatus === 'CONNECTED'
            ? '<span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded-full flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> TERHUBUNG</span>'
            : connectionStatus === 'SCAN_QR'
            ? '<span class="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-full flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> SCAN QR</span>'
            : '<span class="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold rounded-full">MENUNGGU</span>'
        }
      </div>
    </div>

    ${
      connectionStatus === 'CONNECTED'
        ? `
      <div class="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-5 space-y-2">
        <div class="flex items-center gap-2 text-emerald-400 font-bold">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          WhatsApp Gateway Aktif & Siap Mengirim Notifikasi
        </div>
        <p class="text-xs text-slate-300">Nomor Pengirim Terhubung: <span class="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${connectedPhone || '088293733330'}</span></p>
        <p class="text-xs text-slate-400">Semua notifikasi Presensi, Tagihan, Pembayaran, dan Berita akan otomatis dikirimkan melalui nomor ini.</p>
      </div>
      `
        : currentQrDataUrl
        ? `
      <div class="flex flex-col items-center justify-center p-4 bg-white rounded-xl space-y-3">
        <img src="${currentQrDataUrl}" alt="QR Code WhatsApp" class="w-64 h-64 rounded-lg shadow" />
        <p class="text-xs text-slate-700 font-bold text-center">Buka WhatsApp di HP Anda > Perangkat Tertaut > Tautkan Perangkat</p>
      </div>
      `
        : `
      <div class="text-center py-8 text-slate-400 space-y-2">
        <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-sm">Menyiapkan koneksi WhatsApp Gateway...</p>
      </div>
      `
    }

    <div class="bg-slate-900/80 rounded-xl p-4 space-y-2 text-xs font-mono border border-slate-700/60">
      <div class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Informasi Endpoint API</div>
      <div class="flex justify-between items-center text-slate-300">
        <span>Endpoint:</span>
        <span class="text-emerald-400">http://localhost:${PORT}/api/send</span>
      </div>
      <div class="flex justify-between items-center text-slate-300">
        <span>API Key:</span>
        <span class="text-amber-300">${API_KEY}</span>
      </div>
    </div>

    <div class="pt-2 text-center">
      <p class="text-[11px] text-slate-500">SIMASMUH © 2026 - SMA Muhammadiyah 1 Ponorogo</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Start Server & WhatsApp Socket
app.listen(PORT, () => {
  console.log(`🚀 [WhatsApp Gateway] Server berjalan di http://localhost:${PORT}`);
  startWhatsApp().catch((err) => {
    console.error('❌ Gagal menginisialisasi WhatsApp Gateway:', err);
  });
});
