"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileQuestion, CalendarDays, Activity, Plus, ArrowRight,
  ShieldCheck, Upload, Database, BookOpen, BarChart3, X, Check, ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Subject { id: string; name: string; code: string; }
interface Group { id: string; name: string; code: string; }

function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/subjects").then((r) => r.json()).then((d) => setSubjects(d.subjects || []));
    fetch("/api/admin/groups").then((r) => r.json()).then((d) => setGroups(d.groups || []));
  }, []);

  const toggleSubject = (id: string) =>
    setSelectedSubjectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleGroup = (id: string) =>
    setSelectedGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const createAndSelectSubject = async () => {
    if (!newSubjectName || !newSubjectCode) return;
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubjectName, code: newSubjectCode }),
    });
    const d = await res.json();
    if (d.subject) {
      setSubjects((prev) => [...prev, d.subject]);
      setSelectedSubjectIds((prev) => [...prev, d.subject.id]);
      setNewSubjectName("");
      setNewSubjectCode("");
    }
  };

  const saveAndFinish = async () => {
    if (selectedSubjectIds.length === 0) {
      setError("Pilih minimal 1 mata pelajaran yang Anda ampu.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/teacher/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectIds: selectedSubjectIds, groupIds: selectedGroupIds }),
    });
    setSaving(false);
    if (res.ok) onComplete();
    else setError("Gagal menyimpan data. Coba lagi.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Selamat Datang, Bapak/Ibu Guru! 👋</h2>
              <p className="text-xs text-slate-400">Lengkapi data ampuan Anda sebelum memulai</p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className={`flex items-center gap-1 ${s < 2 ? "flex-1" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                  {step > s ? <Check className="w-3 h-3" /> : s}
                </div>
                <span className={`text-xs ${step >= s ? "text-blue-300" : "text-slate-500"}`}>
                  {s === 1 ? "Mata Pelajaran" : "Kelas / Rombel"}
                </span>
                {s < 2 && <div className="flex-1 h-px bg-slate-700 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 font-medium">Pilih mata pelajaran yang Anda ajarkan:</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      selectedSubjectIds.includes(s.id)
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="font-bold">{s.code}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{s.name}</div>
                    {selectedSubjectIds.includes(s.id) && <Check className="w-3 h-3 text-blue-400 mt-1" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-400 mb-2">Atau buat mata pelajaran baru:</p>
                <div className="flex gap-2">
                  <input
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="Kode (ASJ)"
                    className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Nama mata pelajaran"
                    className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <button
                    onClick={createAndSelectSubject}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                onClick={() => { if (selectedSubjectIds.length === 0) { setError("Pilih minimal 1 mata pelajaran."); return; } setError(""); setStep(2); }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <span>Lanjut: Pilih Kelas</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 font-medium">Pilih kelas / rombel yang Anda ampu:</p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      selectedGroupIds.includes(g.id)
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="font-bold">{g.code}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{g.name}</div>
                    {selectedGroupIds.includes(g.id) && <Check className="w-3 h-3 text-emerald-400 mt-1" />}
                  </button>
                ))}
                {groups.length === 0 && (
                  <div className="col-span-2 text-center text-xs text-slate-500 py-4">
                    Belum ada data kelas. Admin/Operator perlu menambahkan kelas terlebih dahulu.
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Pilih kelas untuk memfilter soal & rekap nilai secara otomatis. Lewati jika belum ada kelas.</p>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition">
                  ← Kembali
                </button>
                <button
                  onClick={saveAndFinish}
                  disabled={saving}
                  className="flex-2 flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  {saving ? "Menyimpan..." : (
                    <><Check className="w-4 h-4" /><span>Selesai & Mulai</span></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const [dashRes, meRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/auth/me"),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setUserRole(me.user?.role || "");
        if (me.user?.role === "TEACHER") {
          // Cek apakah guru sudah punya ampuan
          const profileRes = await fetch("/api/admin/teacher/profile");
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (!profile.hasAssignments) setShowOnboarding(true);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs">Memuat data analitik...</span>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 0, totalQuestions: 0, totalExams: 0, activeSessionsCount: 0 };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Dashboard Ringkasan</h1>
            <p className="text-xs text-slate-400 mt-1">
              Status operasional sistem ujian CBT, bank soal, dan pemantauan peserta realtime.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/admin/grades")}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rekap Nilai</span>
            </button>
            <button
              onClick={() => router.push("/admin/questions/import")}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Soal</span>
            </button>
            <button
              onClick={() => router.push("/admin/exams")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Ujian Baru</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Peserta (Siswa)", value: stats.totalStudents, sub: "Siswa terdaftar aktif", icon: Users, color: "blue" },
            { label: "Bank Soal Tersedia", value: stats.totalQuestions, sub: "Butir soal terkelola", icon: FileQuestion, color: "indigo" },
            { label: "Jadwal Ujian (Tes)", value: stats.totalExams, sub: "Ujian dibuat", icon: CalendarDays, color: "teal" },
            { label: "Sesi Ujian Berlangsung", value: stats.activeSessionsCount, sub: "Peserta sedang mengerjakan", icon: Activity, color: "amber", pulse: true },
          ].map(({ label, value, sub, icon: Icon, color, pulse }) => (
            <div key={label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{label}</span>
                <div className={`w-9 h-9 rounded-xl bg-${color}-500/10 text-${color}-400 flex items-center justify-center ${pulse ? "animate-pulse" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className={`text-3xl font-black ${color === "amber" ? "text-amber-400" : "text-white"} mt-3`}>{value}</div>
              <div className={`text-[11px] ${color === "amber" ? "text-amber-500/80" : "text-slate-500"} mt-1`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { path: "/admin/questions/import", icon: Upload, color: "blue", title: "Import Soal dari Word", desc: "Unggah file .docx untuk menyusun bank soal otomatis." },
            { path: "/admin/legacy-import", icon: Database, color: "indigo", title: "Migrasi Database Legacy", desc: "Tarik data dari dump SQL ZYA CBT lama." },
            { path: "/admin/exams", icon: Activity, color: "emerald", title: "Live Proctoring Ujian", desc: "Pantau ruang ujian siswa secara live & audit kecurangan." },
            { path: "/admin/grades", icon: BarChart3, color: "violet", title: "Rekap Nilai & Absensi", desc: "Lihat, filter, dan ekspor nilai ujian per kelas & mapel." },
          ].map(({ path, icon: Icon, color, title, desc }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 text-left hover:border-blue-500/50 transition group"
            >
              <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 text-${color}-400 flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </button>
          ))}
        </div>

        {/* Recent Activity Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Aktivitas Ujian Terbaru Peserta</span>
            </h2>
          </div>

          {(!data?.recentSessions || data.recentSessions.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Belum ada aktivitas pengerjaan ujian baru-baru ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Judul Ujian</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Waktu Mulai</th>
                    <th className="py-3 px-3 text-right">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.recentSessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-white">
                        {s.user.name} ({s.user.username})
                      </td>
                      <td className="py-3 px-3 text-slate-300">{s.exam.title}</td>
                      <td className="py-3 px-3">
                        {s.status === "COMPLETED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">Selesai</span>
                        ) : s.status === "FORCE_FINISHED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">Dipaksa Selesai</span>
                        ) : s.status === "TIMEOUT" ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">Waktu Habis</span>
                        ) : s.status === "IN_PROGRESS" ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold animate-pulse">Mengerjakan</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">{s.status}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{formatDate(s.startedAt)}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 text-sm">
                        {s.score ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>CBT SMK Pasundan 2 Bandung &bull; Sistem Asesmen Berbasis Komputer Modern</span>
          <span>Development by <strong className="text-slate-700 dark:text-slate-200">Andika Fernanda</strong></span>
        </div>
      </div>
    </>
  );
}
