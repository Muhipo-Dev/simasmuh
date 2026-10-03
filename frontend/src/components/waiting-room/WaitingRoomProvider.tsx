"use client";

import React, { useEffect, useState } from "react";
import {
  Ticket,
  Users,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  BookOpen,
  Gamepad2,
  ChevronRight,
  Smile,
  Activity,
  Server,
  ShieldCheck,
  Flame,
  Music4,
  Volume2,
  RefreshCw,
} from "lucide-react";
import { getPublicApiUrl } from "@/lib/api-config";

interface QueueStatus {
  token: string;
  status: "ADMITTED" | "QUEUED";
  position: number;
  totalWaiting: number;
  estimatedWaitSeconds: number;
  serverMetrics?: {
    cpuPercent: number;
    ramPercent: number;
    cpuThreshold: number;
    ramThreshold: number;
  };
}

const WAITING_TIPS = [
  {
    icon: "📖",
    title: "Mutiara Ilmu",
    desc: "“Barangsiapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.” (HR. Muslim)",
  },
  {
    icon: "💎",
    title: "Sistem Keamanan SIMASMUH",
    desc: "Auto-Queue menjaga server tetap stabil saat ribuan siswa, guru, dan wali murid mengakses bersamaan.",
  },
  {
    icon: "💡",
    title: "Tips Nyaman",
    desc: "Tarik napas santai, rileks sejenak! Halaman ini akan otomatis membuka Dashboard begitu giliran Anda tiba.",
  },
  {
    icon: "🌟",
    title: "Semangat Belajar",
    desc: "“Nun Wal Qalami Wa Maa Yasthuruun” — Demi pena dan apa yang mereka tuliskan.",
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
    q: "Surah Al-Qur'an yang menjadi landasan teologi gerakan sosial Muhammadiyah adalah?",
    options: ["QS. Al-Kautsar", "QS. Al-Ikhlas", "QS. Al-Ma'un", "QS. Al-Fatihah"],
    answer: 2,
  },
  {
    q: "Semboyan resmi perjuangan pelajar dan civitas Muhammadiyah adalah?",
    options: ["Nun Wal Qalami Wa Maa Yasthuruun", "Bhinneka Tunggal Ika", "Tut Wuri Handayani", "Ing Ngarso Sung Tulodo"],
    answer: 0,
  },
];

export default function WaitingRoomProvider({ children }: { children: React.ReactNode }) {
  const [queueState, setQueueState] = useState<QueueStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"tips" | "hype" | "trivia">("hype");

  // Hype Meter (Lightstick Clicker)
  const [hypeScore, setHypeScore] = useState(0);
  const [isPumping, setIsPumping] = useState(false);

  // Trivia Game State
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);

  // Ganti tips edukasi setiap 6 detik
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % WAITING_TIPS.length);
    }, 6000);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    let token = typeof window !== "undefined" ? localStorage.getItem("simasmuh_wr_token") || "" : "";
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
      const isQueued = queueState?.status === "QUEUED";
      if (isQueued) {
        checkStatus();
      }
    }, 2500);

    const heartbeatId = setInterval(() => {
      if (queueState?.status !== "QUEUED") {
        checkStatus();
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      clearInterval(heartbeatId);
    };
  }, [queueState?.status]);

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

  const handleLightstickClick = () => {
    setHypeScore((prev) => prev + 1);
    setIsPumping(true);
    setTimeout(() => setIsPumping(false), 200);
  };

  // Jika sedang antre di Waiting Room
  if (queueState && queueState.status === "QUEUED") {
    const totalRef = Math.max(1, queueState.totalWaiting || queueState.position + 5);
    const progressPercent = Math.min(
      98,
      Math.max(8, 100 - (queueState.position / totalRef) * 100)
    );
    const aheadCount = Math.max(0, queueState.position - 1);

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/30 backdrop-blur-2xl p-3 sm:p-4 md:p-6 text-slate-800 overflow-y-auto">
        {/* Hologram Stage Spotlights Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] bg-gradient-to-b from-fuchsia-500/25 via-pink-400/20 to-transparent rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-100px] right-[-50px] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-cyan-400/20 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute top-1/3 -left-32 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-violet-500/20 rounded-full blur-[90px] animate-pulse delay-500" />
        </div>

        {/* K-Pop Concert Ticket Card Container */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white/95 sm:bg-white/90 p-5 sm:p-7 shadow-[0_20px_70px_-15px_rgba(236,72,153,0.35)] backdrop-blur-xl transition-all duration-300">
          
          {/* Holographic Header Bar */}
          <div className="relative -mx-5 -mt-5 sm:-mx-7 sm:-mt-7 mb-5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm">
                  <Ticket className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] font-black tracking-widest uppercase text-pink-200 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-100"></span>
                    </span>
                    SIMASMUH PRIORITY QUEUE
                  </div>
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                    Ruang Antrean Akses Sistem
                  </h1>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 text-white backdrop-blur-sm shadow-inner">
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" /> Fast Access
              </span>
            </div>
          </div>

          {/* Banner Status & Server Load info */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 mb-2 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
              Lalu Lintas Padat — Penyeimbang Beban Aktif
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Anda berada dalam antrean resmi. Mohon tunggu sejenak, sistem akan otomatis mengarahkan Anda ke aplikasi begitu giliran tiba.
            </p>
          </div>

          {/* Ticket Queue Info (K-Pop Ticket Box) */}
          <div className="relative rounded-2xl bg-gradient-to-br from-pink-50/90 via-purple-50/50 to-indigo-50/70 border border-pink-100 p-4 sm:p-5 mb-5 shadow-inner">
            
            {/* Main Number In Line */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-pink-200/60">
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-pink-600 flex items-center justify-center sm:justify-start gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Nomor Urut Anda
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
                  #{queueState.position}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 bg-white/80 px-3.5 py-2.5 rounded-2xl border border-pink-200/70 shadow-sm">
                <div className="text-center px-2">
                  <div className="text-[10px] font-semibold text-slate-400">Di Depan Anda</div>
                  <div className="text-base sm:text-lg font-black text-slate-800">{aheadCount} Orang</div>
                </div>
                <div className="h-7 w-px bg-pink-200" />
                <div className="text-center px-2">
                  <div className="text-[10px] font-semibold text-slate-400">Estimasi Masuk</div>
                  <div className="text-base sm:text-lg font-black text-pink-600 flex items-center justify-center gap-0.5">
                    <Clock className="w-3.5 h-3.5 text-pink-500" /> ~{queueState.estimatedWaitSeconds}s
                  </div>
                </div>
              </div>
            </div>

            {/* Live Concert Runway / Progress Bar */}
            <div className="pt-3">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1 text-pink-600">
                  <Flame className="w-3.5 h-3.5 text-pink-500 animate-pulse fill-pink-500" /> Memproses Akses Masuk...
                </span>
                <span className="font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full text-[10px]">
                  {Math.round(progressPercent)}% Selesai
                </span>
              </div>

              <div className="relative h-3 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-pink-200">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Entertainment / Fan Lounge Interactive Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3.5 sm:p-4 mb-4 shadow-sm">
            {/* Tabs Navigation */}
            <div className="flex items-center justify-between gap-1 mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("hype")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "hype"
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm shadow-pink-200"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Interaksi Santai
                </button>
                <button
                  onClick={() => setActiveTab("trivia")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "trivia"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-200"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Gamepad2 className="w-3 h-3" /> Kuis Cepat
                </button>
                <button
                  onClick={() => setActiveTab("tips")}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "tips"
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-200"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <BookOpen className="w-3 h-3" /> Mutiara Ilmu
                </button>
              </div>

              {activeTab === "trivia" && (
                <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {triviaScore} Poin
                </span>
              )}
            </div>

            {/* Tab 1: Lightstick Clicker (K-Pop Concert Vibe) */}
            {activeTab === "hype" && (
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 rounded-xl p-3 border border-pink-100">
                <div className="text-left">
                  <div className="text-[11px] font-semibold text-slate-500">Ketukan Semangat Belajar:</div>
                  <div className="text-sm font-black text-pink-600">
                    🔥 Total Dukungan: {hypeScore} Poin
                  </div>
                </div>
                <button
                  onClick={handleLightstickClick}
                  className={`px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-95 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-pink-300 active:scale-90 cursor-pointer flex items-center gap-1.5 ${
                    isPumping ? "scale-105" : ""
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Klik Semangat!
                </button>
              </div>
            )}

            {/* Tab 2: Kuis Trivia */}
            {activeTab === "trivia" && (
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 mb-2">
                  Q{triviaIndex + 1}: {TRIVIA_QUESTIONS[triviaIndex].q}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                  {TRIVIA_QUESTIONS[triviaIndex].options.map((opt, oIdx) => {
                    let btnStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                    if (selectedAnswer !== null) {
                      if (oIdx === TRIVIA_QUESTIONS[triviaIndex].answer) {
                        btnStyle = "bg-emerald-500 text-white border-emerald-500 font-bold shadow-sm";
                      } else if (selectedAnswer === oIdx) {
                        btnStyle = "bg-rose-500 text-white border-rose-500 font-bold shadow-sm";
                      }
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleAnswerSelect(oIdx)}
                        disabled={selectedAnswer !== null}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] text-left transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {selectedAnswer !== null && oIdx === TRIVIA_QUESTIONS[triviaIndex].answer && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedAnswer !== null && (
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-[11px] font-bold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                      {isCorrect ? "✨ Jawaban Tepat! (+10 Poin)" : "❌ Kurang Tepat!"}
                    </span>
                    <button
                      onClick={nextTrivia}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer shadow-sm"
                    >
                      Lanjut <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Mutiara Kata */}
            {activeTab === "tips" && (
              <div className="text-left bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                  <span>{WAITING_TIPS[activeTipIndex].icon}</span>
                  <span>{WAITING_TIPS[activeTipIndex].title}</span>
                </div>
                <p className="text-xs text-emerald-900/80 italic leading-relaxed min-h-[38px]">
                  {WAITING_TIPS[activeTipIndex].desc}
                </p>
              </div>
            )}
          </div>

          {/* Footer Notice */}
          <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Jangan muat ulang tab agar posisi nomor antrean Anda tidak hilang.</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

