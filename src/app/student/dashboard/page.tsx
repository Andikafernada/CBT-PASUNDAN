"use client";



import React, { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {

  GraduationCap, Clock, Key, CheckCircle2, AlertCircle, PlayCircle, LogOut,

  Sparkles, FileText, User, Star, X, XCircle, ArrowRight, ShieldCheck, BookOpen, Layers, ClipboardCheck, HelpCircle, MessageSquare, Send, RotateCcw, RefreshCw, ShieldAlert, Eye, Award

} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";

import { NavinLogo } from "@/components/NavinLogo";




const SURVEY_QUESTIONS = [
  { id: "q1", text: "Guru menguasai materi yang diajarkan pada saat pembelajaran berlangsung?" },
  { id: "q2", text: "Guru memberikan contoh-contoh yang sesuai dengan mata pelajaran?" },
  { id: "q3", text: "Guru pada saat melaksanakan pembelajaran dapat menjelaskan materi ajar secara baik?" },
  { id: "q4", text: "Guru memberikan tanggapan yang baik atas pertanyaan dari murid?" },
  { id: "q5", text: "Guru mengembalikan tugas yang telah dikoreksi kepada murid?" },
  { id: "q6", text: "Guru memulai dan mengakhiri tepat waktu?" },
  { id: "q7", text: "Guru menguasai kelas dengan baik?" },
];

const LIKERT_OPTIONS = [
  { value: "SS", label: "Sangat Setuju" },
  { value: "S", label: "Setuju" },
  { value: "N", label: "Netral" },
  { value: "TS", label: "Tidak Setuju" },
  { value: "STS", label: "Sangat Tidak Setuju" },
];

export default function StudentDashboardPage() {

  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const cleanName = (currentUser?.name || "Peserta CBT").replace(/\s*\(Super Siswa[^\)]*\)/i, "").trim();

  const [exams, setExams] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "UPCOMING" | "COMPLETED">("ALL");



  // Reflection & Token Modal State

  const [selectedExam, setSelectedExam] = useState<any>(null);

  const [tokenInput, setTokenInput] = useState("");

  const [physicalState, setPhysicalState] = useState<"FIT" | "NORMAL" | "UNWELL">("FIT");

  const [readinessRate, setReadinessRate] = useState<number>(5);

  const [honestyPledge, setHonestyPledge] = useState(true);

  const [starting, setStarting] = useState(false);

  const [tokenError, setTokenError] = useState<string | null>(null);

  // Kuesioner Pembelajaran Multi-Step State
  const [surveyStep, setSurveyStep] = useState<"LOADING" | "SURVEY" | "TOKEN">("SURVEY");
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [surveySuggestion, setSurveySuggestion] = useState<string>("");
  const [surveySubmitting, setSurveySubmitting] = useState<boolean>(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  // Super Reviewer (andikafernanda) Special States
  const [isSuperReviewer, setIsSuperReviewer] = useState<boolean>(false);
  const [gradeFilter, setGradeFilter] = useState<"ALL" | "X" | "XI" | "XII">("ALL");
  const [resettingExamId, setResettingExamId] = useState<string | null>(null);





  useEffect(() => {

    fetch("/api/auth/me")

      .then((res) => res.json())

      .then((data) => {

        if (!data?.user || data.user.role !== "STUDENT") {

          router.push("/login");

          return;

        }

        setCurrentUser(data.user);

        loadExams();

      })

      .catch(() => router.push("/login"));

  }, []);



  const loadExams = async () => {

    try {

      setLoading(true);

      const res = await fetch("/api/student/exams");

      const data = await res.json();

      setExams(data.exams || []);
      setIsSuperReviewer(Boolean(data.isSuperReviewer));

    } catch (err) {

      console.error("Error loading exams:", err);

    } finally {

      setLoading(false);

    }

  };




  const handleOpenExamModal = async (item: any) => {
    setSelectedExam(item);
    setTokenInput(item.token || "");
    setTokenError(null);
    setSurveyError(null);
    setSurveyAnswers({});
    setSurveySuggestion("");
    setSurveyStep("LOADING");

    try {
      const res = await fetch(`/api/student/survey?examId=${item.id}`);
      const data = await res.json();
      if (data.isCompleted) {
        setSurveyStep("TOKEN");
      } else {
        setSurveyStep("SURVEY");
      }
    } catch (err) {
      console.error("Error checking survey status:", err);
      // Fallback ke survei agar tetap aman
      setSurveyStep("SURVEY");
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    // Validasi 7 butir pertanyaan
    for (let i = 1; i <= 7; i++) {
      if (!surveyAnswers[`q${i}`]) {
        setSurveyError(`Pertanyaan nomor ${i} belum dijawab. Harap jawab seluruh pertanyaan kuesioner.`);
        return;
      }
    }

    setSurveySubmitting(true);
    setSurveyError(null);

    try {
      const res = await fetch("/api/student/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.id,
          answers: {
            ...surveyAnswers,
            q8Suggestion: surveySuggestion.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan kuesioner.");
      }

      // Kuesioner berhasil disimpan, langsung buka langkah input Token Ujian
      setSurveyStep("TOKEN");
    } catch (err: any) {
      setSurveyError(err.message || "Gagal menyimpan kuesioner.");
    } finally {
      setSurveySubmitting(false);
    }
  };


  const handleResetExam = async (examId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Reset sesi ujian ini agar dapat dikerjakan ulang dari awal?")) return;
    try {
      setResettingExamId(examId);
      const res = await fetch(`/api/student/exams/${examId}/reset`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset ujian.");
      await loadExams();
    } catch (err: any) {
      alert(err.message || "Gagal mereset sesi.");
    } finally {
      setResettingExamId(null);
    }
  };

  const handleLogout = async () => {

    await fetch("/api/auth/logout", { method: "POST" });

    router.push("/login");

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

        body: JSON.stringify({

          token: tokenInput.trim().toUpperCase(),

          reflection: { physicalState, readinessRate, honestyPledge },

        }),

      });



      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Token tidak valid atau ujian belum tersedia.");



      router.push(`/student/exam/${selectedExam.id}`);

    } catch (err: any) {

      setTokenError(err.message);

      setStarting(false);

    }

  };



  const filteredExams = exams.filter((item) => {
    // 1. Filter by Grade Level (Super Reviewer / Multi-Grade)
    if (gradeFilter !== "ALL" && item.gradeLevel !== gradeFilter) {
      return false;
    }

    // 2. Filter by Status Tab
    const isFinished = item.sessionStatus === "COMPLETED" || item.sessionStatus === "FORCE_FINISHED" || item.sessionStatus === "TIMEOUT";
    const isInProgress = item.sessionStatus === "IN_PROGRESS" || item.sessionStatus === "SUSPENDED";

    if (activeTab === "ACTIVE") return isInProgress || item.status === "BERLANGSUNG";
    if (activeTab === "COMPLETED") return isFinished;
    if (activeTab === "UPCOMING") return item.status === "BELUM_MULAI" && !isInProgress && !isFinished;
    return true;
  });



  return (

    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-black transition-colors duration-150">

      {/* Top Navbar */}

      <header className="sticky top-0 z-40 border-b border-sky-300 bg-sky-100/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Student Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <NavinLogo variant="icon-only" size="md" className="rounded-xl shadow-xs flex-shrink-0" />
            <div className="border-l border-sky-300 pl-2.5 sm:pl-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-sm sm:text-base text-slate-900 truncate max-w-[150px] sm:max-w-none leading-tight">
                  {cleanName}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-2xs flex-shrink-0">
                  {currentUser?.group?.name || (isSuperReviewer ? "Super Siswa" : "Siswa")}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-sky-900 font-bold flex items-center gap-1.5 mt-0.5 truncate">
                <span className="font-mono bg-white/80 px-1.5 py-0.2 rounded border border-sky-200">
                  NIS: {currentUser?.nis || currentUser?.username || "-"}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">SMK Pasundan 2 Bandung</span>
              </p>
            </div>
          </div>

          {/* Right: Theme & Logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-sky-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer shadow-xs"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>



      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Welcome Hero Banner */}

        <div className="glass p-6 sm:p-8 rounded-3xl shadow-soft relative overflow-hidden bg-gradient-to-r from-sky-200/90 via-sky-100/90 to-blue-200/90 border border-sky-300">

          <div className="relative z-10 max-w-2xl">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-sky-300 text-black text-xs font-black mb-3 shadow-xs">

              <Sparkles className="w-3.5 h-3.5 text-black" />

              <span>Ruang Asesmen Mandiri & Berkeadilan</span>

            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-snug">

            <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-snug">
              Selamat Datang, {cleanName}!
            </h2>

            </h2>

            <p className="text-xs sm:text-sm text-black font-semibold mt-1.5 leading-relaxed">

              Kerjakan seluruh asesmen dengan jujur, teliti, dan penuh percaya diri. Masa depan gemilang dimulai dari integritas hari ini.

            </p>

          </div>



          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-15">

            <GraduationCap className="w-48 h-48 text-black" />

          </div>

        </div>



        {/* Filter Tabs */}
        <div className="space-y-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "ALL", label: "Semua Ujian" },
              { id: "ACTIVE", label: "Ujian Berlangsung" },
              { id: "COMPLETED", label: "Riwayat Selesai" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-700 border border-sky-200 hover:bg-sky-50 font-bold"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grade Level Tabs (Khusus Akun Super Reviewer / Multi-Grade) */}
          {isSuperReviewer && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-black text-sky-900 whitespace-nowrap mr-1">Tingkat Kelas:</span>
              {[
                { id: "ALL", label: `Semua Kelas (${exams.length})` },
                { id: "X", label: `Kelas X (${exams.filter(e => e.gradeLevel === "X").length})` },
                { id: "XI", label: `Kelas XI (${exams.filter(e => e.gradeLevel === "XI").length})` },
                { id: "XII", label: `Kelas XII (${exams.filter(e => e.gradeLevel === "XII").length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGradeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition whitespace-nowrap cursor-pointer ${
                    gradeFilter === tab.id
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-white/80 text-sky-900 border border-sky-200 hover:bg-sky-50 font-bold"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exam Cards Grid */}

        {loading ? (

          <div className="py-20 text-center text-black font-bold">

            <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />

            <span className="text-xs">Memuat daftar jadwal ujian...</span>

          </div>

        ) : filteredExams.length === 0 ? (

          <div className="glass p-12 text-center rounded-3xl shadow-soft">

            <FileText className="w-12 h-12 text-black mx-auto mb-3 opacity-60" />

            <h3 className="font-black text-sm text-black">Tidak Ada Ujian Ditemukan</h3>

            <p className="text-xs text-black font-medium mt-1">

              Saat ini belum ada jadwal ujian untuk kategori ini.

            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {filteredExams.map((item) => {
              const isFinished = item.sessionStatus === "COMPLETED" || item.sessionStatus === "FORCE_FINISHED" || item.sessionStatus === "TIMEOUT";
              const isInProgress = item.sessionStatus === "IN_PROGRESS" || item.sessionStatus === "SUSPENDED";

              return (
                <div
                  key={item.id}
                  className="glass p-5 sm:p-6 rounded-3xl shadow-soft flex flex-col justify-between hover:border-sky-400 transition group border border-sky-300 bg-white/70"
                >
                  <div className="space-y-3">
                    {/* Top Tag Row: Grade Badge & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-sky-100 text-sky-800 border border-sky-200">
                        {item.gradeLevel ? `Kelas ${item.gradeLevel}` : (item.category || "Reguler")}
                      </span>

                      {isFinished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" /> Sedang Berjalan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                          Tersedia
                        </span>
                      )}
                    </div>

                    {/* Clean Title & Subtitle (No Duplicate Title Box!) */}
                    <div>
                      <h3 className="font-black text-base text-slate-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Penilaian Tengah Semester (PTS) Ganjil 2026/2027
                      </p>
                    </div>

                    {/* Stats: Duration & Questions (Accurate questionCount!) */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-sky-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>{item.durationMinutes} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        <span>{item.questionCount || item.totalQuestions || 40} Soal</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-4 mt-4 border-t border-sky-100">
                    {isFinished ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/student/exam/${item.id}/result`)}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Lihat Hasil</span>
                        </button>
                        {isSuperReviewer && (
                          <button
                            onClick={(e) => handleResetExam(item.id, e)}
                            disabled={resettingExamId === item.id}
                            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            title="Reset sesi ujian untuk pengujian ulang"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${resettingExamId === item.id ? "animate-spin" : ""}`} />
                            <span className="hidden sm:inline">Uji Ulang</span>
                          </button>
                        )}
                      </div>
                    ) : isInProgress ? (
                      <button
                        onClick={() => router.push(`/student/exam/${item.id}`)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Lanjutkan Ujian</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenExamModal(item)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <span>Mulai Kerjakan Ujian</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          </div>

        )}

      </main>



      {/* Pre-Exam Learning Survey & Token Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-sky-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="glass max-w-2xl w-full p-5 sm:p-7 relative max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl border border-sky-300 bg-white/95">
            <button
              onClick={() => setSelectedExam(null)}
              className="absolute top-4 right-4 p-1.5 text-black hover:bg-sky-200 rounded-xl cursor-pointer transition"
              title="Tutup Modal"
            >
              <X className="w-5 h-5 text-black" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-sky-200">
              <div className="w-12 h-12 rounded-2xl gradient-brand text-black flex items-center justify-center shadow-glow border border-sky-300 flex-shrink-0">
                {surveyStep === "SURVEY" ? (
                  <ClipboardCheck className="w-6 h-6 text-black" />
                ) : (
                  <Key className="w-6 h-6 text-black" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                    {surveyStep === "SURVEY" ? "Langkah 1 dari 2" : "Langkah 2 dari 2"}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    SMK Pasundan 2 Bandung
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-black mt-0.5">
                  {surveyStep === "SURVEY"
                    ? "Kuesioner Pembelajaran Guru"
                    : "Konfirmasi & Masukkan Token Ujian"}
                </h3>
                <p className="text-xs text-sky-900 font-semibold">
                  Mata Pelajaran: <span className="font-black text-black">{selectedExam.subject?.name || selectedExam.title}</span> • Durasi: {selectedExam.durationMinutes} Menit
                </p>
              </div>
            </div>

            {/* STEP 0: LOADING STATUS */}
            {surveyStep === "LOADING" && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-600">Memeriksa status kuesioner pembelajaran...</p>
              </div>
            )}

            {/* STEP 1: KUESIONER PEMBELAJARAN (SMK PASUNDAN 2) */}
            {surveyStep === "SURVEY" && (
              <form onSubmit={handleSurveySubmit} className="space-y-5 text-xs">
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 font-bold leading-relaxed">
                  <p className="text-[11px]">
                    <strong>Petunjuk:</strong> Berilah tanggapan pada kolom pilihan yang sesuai dengan kondisi pembelajaran yang Anda alami bersama Guru mata pelajaran ini. <em>Wajib diisi secara lengkap sebelum memulai ujian.</em>
                  </p>
                </div>

                {/* 7 Pertanyaan Skala Likert */}
                <div className="space-y-4">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const selectedVal = surveyAnswers[q.id];
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-2xl border transition ${
                          selectedVal
                            ? "bg-white border-sky-400 shadow-sm"
                            : "bg-slate-50/70 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="font-black text-slate-900 text-xs sm:text-[13px] leading-snug">
                            {q.text}
                          </span>
                        </div>

                        {/* Pilihan SS, S, N, TS, STS */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                          {LIKERT_OPTIONS.map((opt) => {
                            const isChecked = selectedVal === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSurveyAnswers((prev) => ({ ...prev, [q.id]: opt.value }));
                                  setSurveyError(null);
                                }}
                                className={`py-2 px-2 rounded-xl text-center border font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                                  isChecked
                                    ? "gradient-brand border-sky-500 text-black font-black ring-2 ring-sky-400 shadow-sm scale-[1.02]"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50/50"
                                }`}
                              >
                                <span className="text-xs font-black tracking-wider">{opt.value}</span>
                                <span className="text-[10px] font-medium opacity-90 leading-tight mt-0.5">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pertanyaan Nomor 8: Uraian Saran */}
                  <div className="p-4 rounded-2xl border bg-white border-sky-300">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        8
                      </span>
                      <label className="font-black text-slate-900 text-xs sm:text-[13px] leading-snug">
                        Tuliskan Saran untuk kegiatan pembelajaran lebih menarik dan memenuhi capaian pembelajaran:
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={surveySuggestion}
                      onChange={(e) => setSurveySuggestion(e.target.value)}
                      placeholder="Tuliskan saran atau masukan Anda di sini (opsional namun sangat disarankan)..."
                      className="form-input w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {surveyError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{surveyError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2 border-t border-sky-200">
                  <button
                    type="button"
                    onClick={() => setSelectedExam(null)}
                    className="btn-default flex-1 justify-center font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={surveySubmitting}
                    className="btn-primary flex-2 justify-center font-black text-xs gap-2 py-3 shadow-glow"
                  >
                    {surveySubmitting ? (
                      <span>Menyimpan Kuesioner...</span>
                    ) : (
                      <>
                        <span>Simpan Kuesioner & Lanjut ke Token</span>
                        <ArrowRight className="w-4 h-4 text-black" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: MASUKKAN TOKEN & MULAI UJIAN */}
            {surveyStep === "TOKEN" && (
              <form onSubmit={handleStartExam} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-black text-emerald-900">Kuesioner Pembelajaran Selesai!</span>
                    <span className="text-[11px] font-semibold text-emerald-800">
                      Terima kasih atas penilaian Anda. Sekarang masukkan token ujian untuk memulai tes.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-black mb-2">
                    1. Kondisi fisik & konsentrasi Anda saat ini?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "FIT", label: "Fit & Fokus", emoji: "🔥" },
                      { id: "NORMAL", label: "Cukup Siap", emoji: "😊" },
                      { id: "UNWELL", label: "Kurang Fit", emoji: "🩹" },
                    ].map(({ id, label, emoji }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPhysicalState(id as any)}
                        className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          physicalState === id
                            ? "gradient-brand border-sky-400 text-black font-black ring-2 ring-sky-400"
                            : "bg-white border-sky-200 text-black font-bold"
                        }`}
                      >
                        <span className="text-lg">{emoji}</span>
                        <span className="text-[11px] font-black">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={honestyPledge}
                    onChange={(e) => setHonestyPledge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-amber-950 font-bold leading-relaxed">
                    <strong>Pakta Integritas Kejujuran:</strong> Saya berjanji mengerjakan ujian ini secara mandiri, jujur, dan mematuhi seluruh tata tertib asesmen Navin CBT.
                  </span>
                </label>

                <div className="p-4 rounded-2xl border bg-sky-50/50 border-sky-300">
                  <label className="block font-black text-black mb-1.5 text-center text-xs sm:text-sm">
                    Masukkan Token Ujian (Dari Pengawas Ruang)
                  </label>
                  {isSuperReviewer && selectedExam?.token && (
                    <div className="mb-2 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Token Ujian: {selectedExam.token} (Otomatis Terisi)
                      </span>
                    </div>
                  )}
                  <div className="relative max-w-xs mx-auto">
                    <Key className="w-5 h-5 text-black absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={10}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      placeholder="CONTOH: TOKEN"
                      className="form-input pl-11 text-center font-mono font-black text-lg tracking-widest uppercase rounded-xl border-2 border-sky-400 focus:border-sky-600 py-2.5 bg-white text-black"
                    />
                  </div>
                </div>

                {tokenError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{tokenError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2 border-t border-sky-200">
                  <button
                    type="button"
                    onClick={() => setSelectedExam(null)}
                    className="btn-default flex-1 justify-center font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={starting || !tokenInput.trim() || !honestyPledge}
                    className="btn-primary flex-2 justify-center font-black text-xs gap-2 py-3 shadow-glow disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4 text-black" />
                    <span>{starting ? "Menyiapkan Lembar Ujian..." : "Mulai Kerjakan Ujian Sekarang"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Branding */}

      <footer className="mt-12 py-6 border-t border-sky-300 text-center text-xs text-black font-semibold">

        <div className="font-bold text-black flex items-center justify-center gap-2">

          <span>Navin CBT Platform</span>

          <span>&bull;</span>

          <span>Digital Assessment System</span>

        </div>

        <div className="text-[11px] text-black mt-1">

          &copy; 2026 Navin CBT by <span className="font-black text-black">Navins Dev Digital Solutions</span> &bull; Bandung, Indonesia

        </div>

      </footer>

    </div>

  );

}

