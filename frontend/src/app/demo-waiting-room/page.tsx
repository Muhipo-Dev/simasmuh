"use client";

import React, { useState } from "react";
import { ShieldAlert, Users, Clock, Loader2, Sparkles, RefreshCw, Eye } from "lucide-react";

export default function DemoWaitingRoomPage() {
  const [position, setPosition] = useState(14);
  const [estimatedWait, setEstimatedWait] = useState(25);
  const [totalWaiting, setTotalWaiting] = useState(48);

  const simulateProgress = () => {
    setPosition((prev) => (prev > 1 ? prev - 1 : 14));
    setEstimatedWait((prev) => (prev > 5 ? prev - 3 : 25));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative">
      {/* Controls Bar for Testing */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] bg-slate-900/90 border border-slate-700/80 rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur shadow-xl text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <Eye className="w-4 h-4" /> Mode Uji Coba Waiting Room
        </span>
        <div className="h-4 w-px bg-slate-700" />
        <button
          onClick={simulateProgress}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-full font-medium transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Majukan Antrean
        </button>
      </div>

      {/* Waiting Room Modal View */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-emerald-950/50 text-center mt-12">
        
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
              #{position}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimasi Waktu
            </div>
            <div className="text-3xl font-extrabold text-amber-300">
              ~{estimatedWait}s
            </div>
          </div>
        </div>

        {/* Progress Animation */}
        <div className="space-y-2 mb-4">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse transition-all duration-500" 
              style={{ width: `${Math.max(10, 100 - (position / totalWaiting) * 100)}%` }}
            />
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
