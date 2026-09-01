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
  Heart,
  Star,
  ShieldAlert,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab Filtering for Multi-Subject Management
  const [activeTab, setActiveTab] = useState<"TODAY" | "ALL" | "COMPLETED">("TODAY");

  // Pre-Exam Reflection & Readiness Modal State
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [physicalState, setPhysicalState] = useState<"FIT" | "NORMAL" | "UNWELL">("FIT");
  const [readinessRate, setReadinessRate] = useState<number>(5);
  const [honestyPledge, setHonestyPledge] = useState<boolean>(true);
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
    setPhysicalState("FIT");
    setReadinessRate(5);
    setHonestyPledge(true);
    setTokenInput("");
    setTokenError(null);
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    if (!honestyPledge) {
      setTokenError("Anda wajib menyetujui Pakta Integritas Kejujuran sebelum memulai ujian.");
      return;
    }

    setStarting(true);
    setTokenError(null);

    try {
      const res = await fetch(`/api/student/exams/${selectedExam.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenInput.trim(),
          physicalState,
          readinessRate,
          honestyPledge,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai ujian");
      }

      window.location.href = `/student/exam/${selectedExam.id}`;
    } catch (err: any) {
      setTokenError(err.message);
      setStarting(false);
    }
  };

  const formatScheduleDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Filter Categories
  const isToday = (dateStr?: string) => {
    if (!dateStr) return true; // If no date specified, treat as current
    const examDate = new Date(dateStr).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    return examDate === today;
  };

  const todayExams = exams.filter((ex) => isToday(ex.startTime) || ex.sessionStatus === "IN_PROGRESS");
  const completedExams = exams.filter((ex) => ex.sessionStatus === "COMPLETED");
  const totalCompleted = completedExams.length;
  const progressPercent = exams.length > 0 ? Math.round((totalCompleted / exams.length) * 100) : 0;

  const displayedExams =
    activeTab === "TODAY"
      ? (todayExams.length > 0 ? todayExams : exams)
      : activeTab === "COMPLETED"
      ? completedExams
      : exams;

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
    <div className="min-h-screen bg-[#f0f6ff] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
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
        {/* Welcome Banner & Progression Tracker */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-lg mb-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold mb-3 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Ruang Asesmen Siswa • {currentUser?.group?.name || "Kelas Siswa"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Selamat Datang, {currentUser?.name}!
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
                Ujian aktif disesuaikan otomatis dengan rombel dan jurusan Anda. Sebelum memulai lembar soal, Anda akan dipandu mengisi <strong>Refleksi Kesiapan Diri</strong> singkat.
              </p>
            </div>

            {/* Progress Card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-5 backdrop-blur-md min-w-[240px] text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-100 mb-1.5">
                <span>Progress Asesmen</span>
                <span className="font-extrabold text-white">{progressPercent}% Selesai</span>
              </div>
              <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-blue-200 font-medium">
                {totalCompleted} dari {exams.length} Mata Pelajaran telah dikerjakan
              </div>
            </div>
          </div>
          {/* Subtle Background Geometry */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Tab Navigation for Multi-Subjects */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab("TODAY")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "TODAY"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal Hari Ini</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {todayExams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Semua Mapel</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {exams.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "COMPLETED"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Riwayat Selesai</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                {completedExams.length}
              </span>
            </button>
          </div>
        </div>

        {/* Exams Grid */}
        {displayedExams.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-xs">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              {activeTab === "COMPLETED" ? "Belum Ada Ujian yang Diselesaikan" : "Belum Ada Jadwal Ujian Aktif"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Saat guru atau proktor membuka sesi ujian untuk rombel Anda, kartu ujian akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedExams.map((exam) => {
              const isCompleted = exam.sessionStatus === "COMPLETED";
              const isInProgress = exam.sessionStatus === "IN_PROGRESS";
              const isSuspended = exam.sessionStatus === "SUSPENDED";

              return (
                <div
                  key={exam.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    {/* Subject & Status Tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 rounded-lg line-clamp-1">
                        {exam.subject?.name || "Mata Pelajaran"}
                      </span>

                      {isCompleted ? (
                        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Dikerjakan</span>
                        </span>
                      ) : isSuspended ? (
                        <span className="px-2.5 py-1 text-[11px] font-extrabold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg">
                          Dibekukan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg">
                          Siap
                        </span>
                      )}
                    </div>

                    {/* Exam Title */}
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug line-clamp-2 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {exam.description || "Ujian asesmen berbasis komputer resmi SMK Pasundan 2 Bandung."}
                    </p>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam.durationMinutes} Menit</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{exam._count?.examQuestions || 40} Soal</span>
                      </div>
                    </div>

                    {/* Schedule Time */}
                    {exam.startTime && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span className="font-semibold">{formatScheduleDate(exam.startTime)}</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatTimeOnly(exam.startTime)} - {formatTimeOnly(exam.endTime) || "Selesai"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
                    {isCompleted ? (
                      <button
                        onClick={() => router.push(`/student/exam/${exam.id}/result`)}
                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                      >
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Lihat Hasil & Sertifikat</span>
                      </button>
                    ) : isInProgress ? (
                      <button
                        onClick={() => router.push(`/student/exam/${exam.id}`)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Lanjutkan Pengerjaan</span>
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
            <span className="font-bold text-slate-800 dark:text-slate-200">Proteksi Anti-Kecurangan Aktif:</span> Sesi ujian Anda dilindungi dengan enkripsi transmisi data real-time, sistem deteksi perpindahan layar/tab, dan penguncian tombol selesai hingga 10 menit terakhir.
          </div>
        </div>

        {/* Footer Attribution */}
        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          CBT SMK Pasundan 2 Bandung • <span className="font-semibold text-slate-600 dark:text-slate-400">Development by Andika Fernanda</span>
        </footer>
      </main>

      {/* Pre-Exam Reflection & Readiness Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedExam(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Refleksi Kesiapan Diri
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedExam.title} • {selectedExam.subject?.name || "Asesmen"}
                </p>
              </div>
            </div>

            <form onSubmit={handleStartExam} className="space-y-5 text-xs">
              {/* 1. Physical & Focus State */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                  1. Bagaimana kondisi fisik dan konsentrasi Anda saat ini?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "FIT", label: "Sangat Sehat & Fokus", emoji: "🔥" },
                    { id: "NORMAL", label: "Cukup Siap", emoji: "😊" },
                    { id: "UNWELL", label: "Kurang Fit", emoji: "🩹" },
                  ].map(({ id, label, emoji }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPhysicalState(id as any)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                        physicalState === id
                          ? "bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300 font-extrabold ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="text-[11px] leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Readiness Star Rating */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  2. Seberapa siap Anda menghadapi materi ujian ini? (Skala 1 - 5)
                </label>
                <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReadinessRate(star)}
                      className="p-1 transition hover:scale-125"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= readinessRate
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {readinessRate === 5 ? "Sangat Siap 🚀" : `${readinessRate} / 5 Bintang`}
                  </span>
                </div>
              </div>

              {/* 3. Honesty Integrity Pledge */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-700/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={honestyPledge}
                  onChange={(e) => setHonestyPledge(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-[11px] text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                  <strong>Pakta Integritas Kejujuran:</strong> Saya berjanji akan mengerjakan ujian ini secara mandiri, jujur, dan mematuhi seluruh tata tertib asesmen SMK Pasundan 2 Bandung.
                </span>
              </label>

              {/* 4. Token Input */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  4. Masukkan Token Ujian (Dari Proktor / Pengawas)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: PAS2026"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white uppercase font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {tokenError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {tokenError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={starting || !tokenInput.trim() || !honestyPledge}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {starting ? (
                    <span>Menyiapkan Lembar Soal...</span>
                  ) : (
                    <>
                      <span>Simpan & Mulai Ujian</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
