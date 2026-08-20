"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, Users, Clock, Loader2, Sparkles } from "lucide-react";

interface QueueStatus {
  token: string;
  status: "ADMITTED" | "QUEUED";
  position: number;
  totalWaiting: number;
  estimatedWaitSeconds: number;
}

export default function WaitingRoomProvider({ children }: { children: React.ReactNode }) {
  const [queueState, setQueueState] = useState<QueueStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let token = localStorage.getItem("simasmuh_wr_token") || "";
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/waiting-room/status?token=${encodeURIComponent(token)}`);
        
        if (res.ok) {
          const data: QueueStatus = await res.json();
          if (data.token) {
            localStorage.setItem("simasmuh_wr_token", data.token);
            token = data.token;
          }
          setQueueState(data);
        }
      } catch (err) {
        // Jika offline / backend tak merespon, izinkan lewat agar UX lokal tidak macet
        setQueueState({
          token,
          status: "ADMITTED",
          position: 0,
          totalWaiting: 0,
          estimatedWaitSeconds: 0,
        });
      } finally {
        setIsChecking(false);
      }
    };

    // Cek awal
    checkStatus();

    // Heartbeat polling jika sedang dalam status antre (QUEUED)
    intervalId = setInterval(() => {
      checkStatus();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  // Interceptor: Tambahkan token ke semua fetch global client Next.js
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const token = localStorage.getItem("simasmuh_wr_token");
      if (token) {
        const headers = new Headers(init?.headers || {});
        if (!headers.has("x-waiting-room-token")) {
          headers.set("x-waiting-room-token", token);
        }
        init = { ...init, headers };
      }
      const response = await originalFetch(input, init);
      
      // Jika server mengembalikan 429 Waiting Room Required
      if (response.status === 429) {
        try {
          const cloned = response.clone();
          const errData = await cloned.json();
          if (errData.redirectWaitingRoom) {
            setQueueState((prev) => ({
              token: token || "",
              status: "QUEUED",
              position: prev?.position || 1,
              totalWaiting: prev?.totalWaiting || 1,
              estimatedWaitSeconds: prev?.estimatedWaitSeconds || 5,
            }));
          }
        } catch (e) {
          // ignore
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Jika sedang antre di Waiting Room
  if (queueState && queueState.status === "QUEUED") {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 text-white">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-emerald-950/50 text-center">
          
          {/* Animated Halo Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Badge Icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <ShieldAlert className="h-10 w-10 animate-pulse text-emerald-400" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Proteksi Lonjakan Server Aktif
          </span>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Ruang Tunggu Antrean
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Lalu lintas pengguna saat ini sedang sangat padat. Demi menjaga kestabilan data & keamanan sistem, Anda ditempatkan di antrean virtual.
          </p>

          {/* Position & Stats Card */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Nomor Antrean
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">
                #{queueState.position}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimasi Waktu
              </div>
              <div className="text-3xl font-extrabold text-amber-300">
                ~{queueState.estimatedWaitSeconds}s
              </div>
            </div>
          </div>

          {/* Progress Animation */}
          <div className="space-y-2 mb-4">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-3/4" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
              Memperbarui posisi antrean secara otomatis...
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-4">
            Mohon jangan menutup atau merefresh tab ini agar posisi antrean Anda tidak tereset.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
