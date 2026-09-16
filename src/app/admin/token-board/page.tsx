"use client";

import React, { useEffect, useState } from "react";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  Radio,
  Tv,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  School,
} from "lucide-react";

export default function TokenBoardPage() {
  const [data, setData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll Command Center data every 5 seconds
  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/command-center");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch {
      // ignore network hiccup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const activeExam = data?.activeExam;
  const token = activeExam?.token || "ZYACBT";
  const labs = data?.labs || [];
  const summary = data?.summary || { totalConnected: 0, totalCapacity: 280, totalInProgress: 0, totalCompleted: 0 };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Background Ambience Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600 rounded-full blur-[140px]"></div>
      </div>

      {/* TOP BAR: School Brand & Live Server Time */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <School className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <span>SMK PASUNDAN 2 BANDUNG</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">
                Official CBT Board
              </span>
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Sistem Asesmen Berbasis Komputer • 7 Lab Komputer (280 PC Hub)
            </p>
          </div>
        </div>

        {/* Big Digital Clock & Fullscreen Button */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              {currentTime || "00:00:00"} <span className="text-lg font-bold text-slate-400">WIB</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              {currentDate}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (TV / Proyektor)"}
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* CENTER: Giant Token & Exam Details */}
      <main className="relative z-10 my-auto py-8 flex flex-col items-center justify-center text-center">
        {/* Exam Title & Subject */}
        {activeExam ? (
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs sm:text-sm font-bold text-slate-300">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>SESI UJIAN BERLANGSUNG</span>
              <span>•</span>
              <span className="text-cyan-400">{activeExam.subjectName}</span>
              <span>•</span>
              <span>Durasi: {activeExam.durationMinutes} Menit</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white max-w-3xl">
              {activeExam.title}
            </h2>
          </div>
        ) : (
          <div className="mb-6 text-slate-400 text-lg">
            Tidak ada sesi ujian aktif. Menunggu jadwal dimulai...
          </div>
        )}

        {/* GIANT TOKEN DISPLAY */}
        <div className="relative group">
          {/* Animated Glow Halo */}
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>

          <div className="relative px-10 sm:px-16 py-8 sm:py-10 bg-slate-900/90 border-2 border-cyan-400/50 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col items-center">
            <div className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>TOKEN MASUK UJIAN</span>
              <Sparkles className="w-4 h-4" />
            </div>

            {/* The Token Letters */}
            <div className="text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-[0.25em] text-white drop-shadow-[0_0_35px_rgba(34,211,238,0.5)]">
              {token.split("").join(" ")}
            </div>

            {/* Dynamic Token Timer Indicator */}
            {activeExam?.isTokenDynamic && (
              <div className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  Token Dinamis diperbarui dalam: {formatCountdown(activeExam.tokenRemainingSeconds || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-bold">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Total Siswa Terhubung:</span>
            <span className="text-white text-base font-black">{summary.totalConnected} / {summary.totalCapacity} PC</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Sedang Mengerjakan:</span>
            <span className="text-white text-base font-black">{summary.totalInProgress} Siswa</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-cyan-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Telah Selesai:</span>
            <span className="text-white text-base font-black">{summary.totalCompleted} Siswa</span>
          </div>
        </div>
      </main>

      {/* BOTTOM: 7-LAB STATUS RIBBON */}
      <footer className="relative z-10 border-t border-slate-800/80 pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Status 7 Laboratorium Komputer</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Auto-refresh setiap 5s • Terakhir: {lastRefreshed.toLocaleTimeString("id-ID")}
          </span>
        </div>

        {/* 7 Lab Mini Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {labs.map((lab: any) => {
            const isWarning = lab.status === "WARNING";
            const percent = lab.occupancyPercent || 0;

            return (
              <div
                key={lab.labId}
                className={`p-3 rounded-2xl border transition-all ${
                  isWarning
                    ? "bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10"
                    : lab.connectedCount > 0
                    ? "bg-slate-900/90 border-slate-700/80"
                    : "bg-slate-950/60 border-slate-800/60 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-200">LAB {lab.labId}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isWarning
                        ? "bg-amber-400 animate-ping"
                        : lab.connectedCount > 0
                        ? "bg-emerald-400"
                        : "bg-slate-600"
                    }`}
                  ></span>
                </div>

                <div className="text-lg font-black font-mono text-white mb-1">
                  {lab.connectedCount}
                  <span className="text-xs text-slate-400 font-normal">/40 PC</span>
                </div>

                {/* Mini Occupancy Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isWarning
                        ? "bg-amber-400"
                        : percent >= 80
                        ? "bg-emerald-400"
                        : "bg-cyan-400"
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
