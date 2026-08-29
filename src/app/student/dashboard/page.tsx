"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Key,
  ShieldCheck,
  User,
  Sparkles,
  ArrowRight,
  X,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Token Modal
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [userRes, examsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/student/exams"),
      ]);

      if (!userRes.ok) {
        router.push("/login");
        return;
      }

      const userData = await userRes.json();
      setCurrentUser(userData.user);

      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExams(examsData.exams || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleOpenExamModal = (exam: any) => {
    setSelectedExam(exam);
    setTokenInput("");
    setTokenError(null);
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    setStarting(true);
    setTokenError(null);

    try {
      const res = await fetch(`/api/student/exams/${selectedExam.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai ujian");
      }

      window.location.href = `/student/exam/${selectedExam.id}`;
    } catch (err: any) {
      setTokenError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-800 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Memuat data ujian Anda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">CBT PASUNDAN 2</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-md">
                  PORTAL SISWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">SMK Pasundan 2 Bandung</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {currentUser?.name?.charAt(0) || "S"}
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {currentUser?.group?.name || "Kelas Reguler"} • NIS: {currentUser?.username}
                </div>
              </div>
            </div>

            {/* Theme Switcher Toggle */}
            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ruang Asesmen Siswa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Selamat Datang, {currentUser?.name}!
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Silakan periksa jadwal dan mata pelajaran ujian yang aktif di bawah ini. Pastikan koneksi perangkat stabil dan jangan berpindah tab saat ujian berlangsung.
            </p>
          </div>
          {/* Subtle Background Geometry */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Exams List Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Daftar Ujian Tersedia</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
              {exams.length}
            </span>
          </h2>
        </div>

        {/* Exams Grid */}
        {exams.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-xs">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Jadwal Ujian Aktif</p>
            <p className="text-xs text-slate-500 mt-1">Saat proktor atau guru membuka sesi ujian, kartu ujian akan otomatis muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam) => {
              const now = new Date();
              const isUpcoming = exam.startTime && now < new Date(exam.startTime);
              const isExpired = exam.endTime && now > new Date(exam.endTime);

              return (
                <div
                  key={exam.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition shadow-xs group"
                >
                  <div>
                    {/* Badge Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                        {exam.subject}
                      </span>

                      {exam.status === "COMPLETED" ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                        </span>
                      ) : exam.status === "IN_PROGRESS" ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Sedang Dikerjakan
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 rounded-lg flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Belum Dibuka
                        </span>
                      ) : isExpired ? (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg">
                          Telah Berakhir
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                          Siap Dikerjakan
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description || "Ujian evaluasi kompetensi siswa."}
                    </p>

                    {/* Schedule info if set */}
                    {(exam.startTime || exam.endTime) && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
                        {exam.startTime && (
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Mulai:</span>
                            <span className={isUpcoming ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-800 dark:text-slate-200 font-medium"}>
                              {new Intl.DateTimeFormat("id-ID", {
                                timeZone: "Asia/Jakarta",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(exam.startTime))} WIB
                            </span>
                          </div>
                        )}
                        {exam.endTime && (
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Selesai:</span>
                            <span className={isExpired ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-800 dark:text-slate-200 font-medium"}>
                              {new Intl.DateTimeFormat("id-ID", {
                                timeZone: "Asia/Jakarta",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(exam.endTime))} WIB
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{exam.durationMinutes} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{exam.totalQuestions} Soal</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="mt-5">
                    {exam.status === "COMPLETED" ? (
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="text-xs">
                          <div className="text-slate-500 dark:text-slate-400">Hasil Ujian:</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {exam.showResult ? `${exam.score ?? 0} Poin` : "Terkirim"}
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/student/exam/${exam.id}/result`)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition shadow-2xs"
                        >
                          Lihat Status
                        </button>
                      </div>
                    ) : exam.status === "IN_PROGRESS" ? (
                      <button
                        onClick={() => router.push(`/student/exam/${exam.id}`)}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition"
                      >
                        <span>Lanjutkan Ujian</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : isUpcoming ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Jadwal Belum Dimulai</span>
                      </button>
                    ) : isExpired ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-rose-500/60 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-800 cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span>Ujian Telah Ditutup</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenExamModal(exam)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Ikuti Ujian Sekarang</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security / System Notice */}
        <div className="mt-12 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">Proteksi Anti-Kecurangan Aktif:</span> Sesi ujian Anda dilindungi dengan enkripsi transmisi data real-time, sistem deteksi perpindahan layar/tab, dan penguncian fullscreen otomatis.
          </div>
        </div>

        {/* Footer Attribution */}
        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          CBT SMK Pasundan 2 Bandung • <span className="font-semibold text-slate-600 dark:text-slate-400">Development by Andika Fernanda</span>
        </footer>
      </main>

      {/* Token Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedExam(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Masukkan Token Ujian</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedExam.title}</p>
              </div>
            </div>

            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Token 6 Karakter dari Proktor / Pengawas
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: AB12CD"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white uppercase font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {tokenError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {tokenError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={starting || !tokenInput.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
                >
                  {starting ? "Memverifikasi..." : "Mulai Ujian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
