"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Clock, Key, CheckCircle2, AlertCircle, PlayCircle, LogOut,
  Sparkles, FileText, User, Star, X, XCircle, ArrowRight, ShieldCheck, BookOpen, Layers
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StudentDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
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
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setLoading(false);
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
    if (activeTab === "ACTIVE") return item.sessionStatus === "IN_PROGRESS" || item.status === "BERLANGSUNG";
    if (activeTab === "COMPLETED") return item.sessionStatus === "COMPLETED" || item.sessionStatus === "FORCE_FINISHED" || item.sessionStatus === "TIMEOUT";
    if (activeTab === "UPCOMING") return item.status === "BELUM_MULAI";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-black transition-colors duration-150">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-sky-300 bg-sky-100/90 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-glow border border-sky-300">
              <GraduationCap className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-black leading-tight">
                CBT HEBAT SMK PASUNDAN 2 BANDUNG
              </h1>
              <p className="text-[11px] text-black font-semibold">
                Portal Asesmen Siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-sky-300 text-xs font-black text-black shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>{currentUser?.name || "Siswa"}</span>
              <span className="text-[10px] text-black font-semibold">({currentUser?.group?.name || "Kelas"})</span>
            </div>

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-sky-300 text-black hover:bg-rose-50 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-black" />
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
              Selamat Datang, {currentUser?.name || "Siswa"}!
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "Semua Ujian" },
            { id: "ACTIVE", label: "Ujian Berlangsung" },
            { id: "UPCOMING", label: "Akan Datang" },
            { id: "COMPLETED", label: "Riwayat Selesai" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "gradient-brand text-black shadow-glow border border-sky-300"
                  : "bg-white text-black border border-sky-200 hover:bg-sky-50 font-bold"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                  className="glass p-6 rounded-3xl shadow-soft flex flex-col justify-between hover:border-sky-400 transition group border border-sky-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="badge-info">
                        {item.subject?.name || "Mata Pelajaran"}
                      </span>
                      {isFinished ? (
                        <span className="badge-success">Selesai</span>
                      ) : isInProgress ? (
                        <span className="badge-warning animate-pulse">Sedang Berjalan</span>
                      ) : (
                        <span className="badge-neutral">Tersedia</span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-black text-base text-black group-hover:underline line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-black font-medium mt-1 line-clamp-2">
                        {item.description || "Asesmen kompetensi mata pelajaran terpadu SMK Pasundan 2 Bandung."}
                      </p>
                    </div>

                    {item.sessionName && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-sky-100/90 border border-sky-300 text-xs text-black font-bold">
                        <span className="flex items-center gap-1.5 text-blue-900">
                          <Clock className="w-3.5 h-3.5 text-blue-700" />
                          <span>{item.sessionName}</span>
                        </span>
                        {item.room && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-sky-300 text-[11px] font-black text-black shadow-2xs">
                            {item.room}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200 text-xs">
                      <div className="flex items-center gap-1.5 text-black font-bold">
                        <Clock className="w-3.5 h-3.5 text-black" />
                        <span>{item.durationMinutes} Menit</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-black font-bold">
                        <Layers className="w-3.5 h-3.5 text-black" />
                        <span>{item.totalQuestions || 0} Soal</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-sky-200">
                    {isFinished ? (
                      <button
                        onClick={() => router.push(`/student/exam/${item.id}/result`)}
                        className="w-full py-2.5 btn-default justify-center text-xs font-black"
                      >
                        <CheckCircle2 className="w-4 h-4 text-black" />
                        <span>Lihat Hasil Ujian</span>
                      </button>
                    ) : isInProgress ? (
                      <button
                        onClick={() => router.push(`/student/exam/${item.id}`)}
                        className="w-full py-2.5 btn-warning justify-center text-xs font-black"
                      >
                        <PlayCircle className="w-4 h-4 text-black" />
                        <span>Lanjutkan Ujian</span>
                      </button>
                    ) : (item.effectiveStartTime && new Date() < new Date(item.effectiveStartTime)) ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-100 border border-slate-300 text-slate-500 rounded-xl text-xs font-black cursor-not-allowed flex items-center justify-center gap-1.5"
                        title={`Sesi dimulai pukul ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(item.effectiveStartTime))} WIB`}
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{item.sessionName || "Sesi"} Belum Dibuka</span>
                      </button>
                    ) : (item.effectiveEndTime && new Date() > new Date(item.effectiveEndTime)) ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-black cursor-not-allowed flex items-center justify-center gap-1.5"
                        title="Waktu sesi telah berakhir"
                      >
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span>Waktu {item.sessionName || "Sesi"} Berakhir</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedExam(item);
                          setTokenInput("");
                          setTokenError(null);
                        }}
                        className="w-full py-2.5 btn-primary justify-center text-xs font-black shadow-glow"
                      >
                        <span>Mulai Kerjakan Ujian</span>
                        <ArrowRight className="w-4 h-4 text-black" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Pre-Exam Reflection & Token Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-sky-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass max-w-lg w-full p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-sky-300">
            <button
              onClick={() => setSelectedExam(null)}
              className="absolute top-4 right-4 p-1.5 text-black hover:bg-sky-200 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5 text-black" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl gradient-brand text-black flex items-center justify-center shadow-glow border border-sky-300">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-black">
                  Refleksi Kesiapan Siswa
                </h3>
                <p className="text-xs text-black font-semibold">
                  {selectedExam.title} • {selectedExam.subject?.name || "Asesmen"}
                </p>
              </div>
            </div>

            <form onSubmit={handleStartExam} className="space-y-4 text-xs">
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

              <div>
                <label className="block font-black text-black mb-1.5">
                  2. Tingkat Kesiapan (1 - 5 Bintang)
                </label>
                <div className="flex items-center justify-center gap-2 p-3 bg-white border border-sky-200 rounded-2xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReadinessRate(star)}
                      className="p-1 transition hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= readinessRate
                            ? "text-amber-500 fill-amber-400"
                            : "text-slate-300"
                        }`}
                      />
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
                  <strong>Pakta Integritas Kejujuran:</strong> Saya berjanji mengerjakan ujian ini secara mandiri, jujur, dan mematuhi seluruh tata tertib asesmen CBT HEBAT SMK Pasundan 2 Bandung.
                </span>
              </label>

              <div>
                <label className="block font-black text-black mb-1.5">
                  3. Masukkan Token Ujian (Dari Proktor / Pengawas)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: DNS2026"
                    className="form-input pl-10 text-center font-mono font-black text-base tracking-widest uppercase"
                  />
                </div>
              </div>

              {tokenError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold">
                  {tokenError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="btn-default flex-1 justify-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={starting || !tokenInput.trim() || !honestyPledge}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  {starting ? "Menyiapkan Soal..." : "Simpan & Mulai Ujian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-12 py-6 border-t border-sky-300 text-center text-xs text-black font-semibold">
        <div className="font-bold text-black">CBT HEBAT SMK PASUNDAN 2 Bandung</div>
        <div className="text-[11px] text-black mt-1">
          Development by <span className="font-black text-black">Andika Fernanda</span>
        </div>
      </footer>
    </div>
  );
}
