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
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 md:p-6 text-slate-800 dark:text-slate-100 overflow-y-auto">
        {/* Clean Institutional Waiting Room Modal */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-200">
          
          {/* Header Bar */}
          <div className="bg-slate-900 dark:bg-slate-950 p-4 sm:p-5 text-white border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400">
                <Ticket className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  ANTREAN SISTEM SIMASMUH
                </div>
                <h1 className="text-sm sm:text-base font-bold text-white">
                  Ruang Tunggu Lalu Lintas Padat
                </h1>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <Sparkles className="w-3 h-3 text-blue-300" /> Antrean Aktif
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Banner Status */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 mb-2">
                <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Penyeimbang Beban Server Aktif
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Anda berada dalam antrean resmi. Mohon tunggu sejenak, sistem akan otomatis mengarahkan Anda ke aplikasi begitu giliran tiba.
              </p>
            </div>

            {/* Queue Info Box */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              {/* Main Number In Line */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="text-center sm:text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Nomor Urut Anda
                  </div>
                  <div className="text-4xl sm:text-5xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                    #{queueState.position}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="text-center px-2">
                    <div className="text-[10px] font-semibold text-slate-400">Di Depan Anda</div>
                    <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">{aheadCount} Orang</div>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center px-2">
                    <div className="text-[10px] font-semibold text-slate-400">Estimasi Masuk</div>
                    <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5">
                      <Clock className="w-3.5 h-3.5" /> ~{queueState.estimatedWaitSeconds}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-3">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Flame className="w-3.5 h-3.5 text-blue-500" /> Memproses Akses Masuk...
                  </span>
                  <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded-md text-[10px]">
                    {Math.round(progressPercent)}% Selesai
                  </span>
                </div>

                <div className="relative h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive Tab Lounge */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs">
              {/* Tabs Navigation */}
              <div className="flex items-center justify-between gap-1 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab("hype")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "hype"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Interaksi Santai
                  </button>
                  <button
                    onClick={() => setActiveTab("trivia")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "trivia"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Gamepad2 className="w-3 h-3" /> Kuis Cepat
                  </button>
                  <button
                    onClick={() => setActiveTab("tips")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "tips"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="w-3 h-3" /> Mutiara Ilmu
                  </button>
                </div>

                {activeTab === "trivia" && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                    {triviaScore} Poin
                  </span>
                )}
              </div>

              {/* Tab 1: Lightstick Clicker */}
              {activeTab === "hype" && (
                <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-slate-500">Ketukan Semangat Belajar:</div>
                    <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                      Total Dukungan: {hypeScore} Poin
                    </div>
                  </div>
                  <button
                    onClick={handleLightstickClick}
                    className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                      isPumping ? "scale-105" : ""
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Klik Semangat!
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
    </div>
  );
}

  return <>{children}</>;
}

