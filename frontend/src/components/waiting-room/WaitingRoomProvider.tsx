"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Users,
  Clock,
  Loader2,
  Sparkles,
  Zap,
  Coffee,
  CheckCircle2,
  BookOpen,
  Gamepad2,
  ChevronRight,
  Smile,
  Activity,
  Server
} from "lucide-react";
import { getPublicApiUrl } from "@/lib/api-config";

interface QueueStatus {
  token: string;
  status: "ADMITTED" | "QUEUED";
  position: number;
  totalWaiting: number;
  estimatedWaitSeconds: number;
}

const WAITING_TIPS = [
  {
    icon: "📖",
    title: "Mutiara Kata",
    desc: "“Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah mudahkan baginya jalan menuju surga.” (HR. Muslim)",
  },
  {
    icon: "⚡",
    title: "Tahukah Anda?",
    desc: "SIMASMUH dilengkapi sistem proteksi otomatis yang menjaga konsistensi nilai rapor dan absensi Anda tetap aman 100%.",
  },
  {
    icon: "💡",
    title: "Tips Produktif",
    desc: "Tarik napas sejenak dan regangkan bahu. Giliran sistem Anda akan segera tiba dalam beberapa detik!",
  },
  {
    icon: "🌟",
    title: "Doa Menuntut Ilmu",
    desc: "“Robbi zidnii 'ilman warzuqnii fahmaa” (Ya Allah, tambahkanlah ilmuku dan karuniakanlah pemahaman yang luas).",
  },
];

const TRIVIA_QUESTIONS = [
  {
    q: "Siapakah pendiri Persyarikatan Muhammadiyah?",
    options: ["K.H. Ahmad Dahlan", "K.H. Hasyim Asy'ari", "Buya Hamka", "Ki Hadjar Dewantara"],
    answer: 0,
  },
  {
    q: "Pada tahun berapakah Muhammadiyah didirikan di Yogyakarta?",
    options: ["1928", "1912", "1945", "1908"],
    answer: 1,
  },
  {
    q: "Surah dalam Al-Qur'an yang menjadi landasan teologi gerakan sosial Al-Ma'un adalah?",
    options: ["QS. Al-Kautsar", "QS. Al-Ikhlas", "QS. Al-Ma'un", "QS. Al-Fatihah"],
    answer: 2,
  },
  {
    q: "Apa semboyan utama perjuangan pelajar dan civitas Muhammadiyah?",
    options: ["Nun Wal Qalami Wa Maa Yasthuruun", "Bhinneka Tunggal Ika", "Tut Wuri Handayani", "Ing Ngarso Sung Tulodo"],
    answer: 0,
  },
];

export default function WaitingRoomProvider({ children }: { children: React.ReactNode }) {
  const [queueState, setQueueState] = useState<QueueStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [relaxScore, setRelaxScore] = useState(0);
  const [activeTab, setActiveTab] = useState<"tips" | "clicker" | "trivia">("tips");
  
  // Trivia Game State
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);

  // Ganti tips edukasi setiap 6 detik jika mode tips aktif
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % WAITING_TIPS.length);
    }, 6000);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    let token = localStorage.getItem("simasmuh_wr_token") || "";
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(getPublicApiUrl(`/waiting-room/status?token=${encodeURIComponent(token)}`));
        
        if (res.ok) {
          const data: QueueStatus = await res.json();
          if (data.token) {
            localStorage.setItem("simasmuh_wr_token", data.token);
            token = data.token;
          }
          setQueueState(data);
        }
      } catch (err) {
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

    checkStatus();

    intervalId = setInterval(() => {
      checkStatus();
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

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

  const handleAnswerSelect = (optionIdx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIdx);
    const correct = optionIdx === TRIVIA_QUESTIONS[triviaIndex].answer;
    setIsCorrect(correct);
    if (correct) {
      setTriviaScore((prev) => prev + 10);
    }
  };

  const nextTrivia = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTriviaIndex((prev) => (prev + 1) % TRIVIA_QUESTIONS.length);
  };

  // Jika sedang antre di Waiting Room
  if (queueState && queueState.status === "QUEUED") {
    const totalRef = Math.max(1, queueState.totalWaiting || queueState.position + 5);
    const progressPercent = Math.min(
      96,
      Math.max(12, 100 - (queueState.position / totalRef) * 100)
    );

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/92 backdrop-blur-2xl p-3 sm:p-4 md:p-6 text-white overflow-y-auto">
        {/* Animated Background Ambience */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] bg-emerald-500/15 rounded-full blur-[110px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[280px] sm:w-[420px] h-[280px] sm:h-[420px] bg-teal-500/12 rounded-full blur-[100px] animate-pulse delay-700" />
          <div className="absolute top-1/3 left-1/4 w-[220px] sm:w-[360px] h-[220px] sm:h-[360px] bg-amber-500/10 rounded-full blur-[90px] animate-pulse delay-1000" />
        </div>

        {/* Modal Container */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 p-4 sm:p-6 md:p-8 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl transition-all duration-300">
          
          {/* Header Badge & System Indicator */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Proteksi Antrean Aktif
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-mono bg-slate-800/60 px-2.5 py-0.5 rounded-full border border-slate-700/50">
              <Zap className="w-3 h-3 text-amber-400" />
              Sistem Prioritas
            </span>
          </div>

          {/* Icon & Title */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="relative mx-auto mb-3 flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-500/5 border border-emerald-400/40 text-emerald-400 shadow-xl shadow-emerald-900/30">
              <ShieldAlert className="h-7 w-7 sm:h-9 sm:w-9 animate-bounce text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white mb-1 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
              Ruang Tunggu Antrean
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Lalu lintas server sedang sangat padat. Anda berada di antrean prioritas untuk menjamin integritas data Anda.
            </p>
          </div>

          {/* Cards: Position & Wait Time */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/60 p-3 sm:p-4 text-center transition hover:border-emerald-500/50 shadow-inner">
              <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-400 mb-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Nomor Antrean
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                #{queueState.position}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                dari total {queueState.totalWaiting || queueState.position} antrean
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/60 p-3 sm:p-4 text-center transition hover:border-amber-500/50 shadow-inner">
              <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Estimasi Waktu
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]">
                ~{queueState.estimatedWaitSeconds}s
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                otomatis dialihkan
              </div>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="space-y-1.5 mb-4 sm:mb-5">
            <div className="flex justify-between items-center text-[11px] sm:text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-spin" /> Memproses Giliran...
              </span>
              <span className="font-mono text-emerald-300 font-semibold">{Math.round(progressPercent)}%</span>
            </div>
            
            <div className="h-2.5 sm:h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Anti-Boredom Tabbed Card (Tips, Clicker, Quiz) */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/60 p-3 sm:p-4 mb-4">
            {/* Tabs Header */}
            <div className="flex items-center justify-between gap-1 mb-3 border-b border-slate-700/60 pb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("tips")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "tips"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-3 h-3" /> Mutiara Kata
                </button>
                <button
                  onClick={() => setActiveTab("trivia")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "trivia"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Gamepad2 className="w-3 h-3" /> Kuis Edukasi
                </button>
                <button
                  onClick={() => setActiveTab("clicker")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === "clicker"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Smile className="w-3 h-3" /> Relaksasi
                </button>
              </div>

              {activeTab === "trivia" && (
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400">
                  Skor: {triviaScore}
                </span>
              )}
            </div>

            {/* Tab 1: Tips & Quotes */}
            {activeTab === "tips" && (
              <div className="text-left animate-fadeIn">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-1">
                  <span>{WAITING_TIPS[activeTipIndex].icon}</span>
                  <span>{WAITING_TIPS[activeTipIndex].title}</span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed min-h-[44px]">
                  {WAITING_TIPS[activeTipIndex].desc}
                </p>
              </div>
            )}

            {/* Tab 2: Kuis Trivia */}
            {activeTab === "trivia" && (
              <div className="text-left animate-fadeIn">
                <div className="text-xs font-semibold text-slate-200 mb-2">
                  Q{triviaIndex + 1}: {TRIVIA_QUESTIONS[triviaIndex].q}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                  {TRIVIA_QUESTIONS[triviaIndex].options.map((opt, oIdx) => {
                    let btnStyle = "bg-slate-900/70 border-slate-700/60 text-slate-300 hover:bg-slate-800";
                    if (selectedAnswer !== null) {
                      if (oIdx === TRIVIA_QUESTIONS[triviaIndex].answer) {
                        btnStyle = "bg-emerald-600 text-white border-emerald-400 font-bold";
                      } else if (selectedAnswer === oIdx) {
                        btnStyle = "bg-rose-600 text-white border-rose-400 font-bold";
                      }
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleAnswerSelect(oIdx)}
                        disabled={selectedAnswer !== null}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs text-left transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {selectedAnswer !== null && oIdx === TRIVIA_QUESTIONS[triviaIndex].answer && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedAnswer !== null && (
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-[11px] font-semibold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                      {isCorrect ? "✨ Jawaban Benar! (+10 Poin)" : "❌ Jawaban Belum Tepat!"}
                    </span>
                    <button
                      onClick={nextTrivia}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      Pertanyaan Berikutnya <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Clicker Relaksasi */}
            {activeTab === "clicker" && (
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 rounded-xl p-3 border border-slate-700/50 animate-fadeIn">
                <div className="text-left">
                  <div className="text-[11px] text-slate-400">Sentuh untuk meredakan ketegangan:</div>
                  <div className="text-sm font-extrabold text-amber-300">
                    Skor Relaksasi: {relaxScore} ✨
                  </div>
                </div>
                <button
                  onClick={() => setRelaxScore((prev) => prev + 1)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-teal-950/50 cursor-pointer flex items-center gap-1.5"
                >
                  <Smile className="w-4 h-4" /> Klik Saya!
                </button>
              </div>
            )}
          </div>

          {/* Footer Warning */}
          <div className="text-[10px] sm:text-[11px] text-slate-400 text-center border-t border-slate-800/80 pt-3">
            🔒 Halaman ini akan otomatis beralih begitu giliran Anda tiba. Mohon tidak menutup tab.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
