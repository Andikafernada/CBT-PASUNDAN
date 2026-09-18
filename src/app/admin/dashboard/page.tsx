"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileQuestion,
  FileSpreadsheet,
  CalendarDays,
  Activity,
  Plus,
  BarChart3,
  Upload,
  Database,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Server,
  Zap,
  RefreshCw,
} from "lucide-react";

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/subjects").then((r) => r.json()),
      fetch("/api/admin/students").then((r) => r.json()),
    ]).then(([sData, gData]) => {
      setSubjects(sData.subjects || []);
      setGroups(gData.groups || []);
    });
  }, []);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createAndSelectSubject = async () => {
    if (!newSubjectCode.trim() || !newSubjectName.trim()) return;
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SUBJECT", code: newSubjectCode, name: newSubjectName }),
      });
      const data = await res.json();
      if (res.ok && data.subject) {
        setSubjects((prev) => [...prev, data.subject]);
        setSelectedSubjectIds((prev) => [...prev, data.subject.id]);
        setNewSubjectCode("");
        setNewSubjectName("");
      }
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectIds: selectedSubjectIds,
          groupIds: selectedGroupIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menyimpan");
      }
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-sky-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass max-w-lg w-full overflow-hidden shadow-2xl animate-fade-up">
        <div className="p-6 bg-gradient-to-r from-sky-200 via-blue-100 to-sky-200 border-b border-sky-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand border border-sky-300 text-black flex items-center justify-center font-black shadow-glow">
              <BookOpen className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-black text-black text-lg">Selamat Datang di Navin CBT</h2>
              <p className="text-xs text-black font-semibold">Lengkapi data ampuan Anda sebelum memulai</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className={`flex items-center gap-1 ${s < 2 ? "flex-1" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step >= s ? "gradient-brand text-black border border-sky-300" : "bg-white text-black border border-sky-200"}`}>
                  {step > s ? <Check className="w-3 h-3 text-black" /> : s}
                </div>
                <span className="text-xs font-bold text-black">
                  {s === 1 ? "Mata Pelajaran" : "Kelas / Rombel"}
                </span>
                {s < 2 && <div className="flex-1 h-px bg-sky-300 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-black font-bold">Pilih mata pelajaran yang Anda ajarkan:</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      selectedSubjectIds.includes(s.id)
                        ? "gradient-brand border-sky-400 text-black font-black"
                        : "bg-white border-sky-200 text-black hover:border-sky-400"
                    }`}
                  >
                    <div className="font-black text-black">{s.code}</div>
                    <div className="text-[11px] text-black font-medium mt-0.5 truncate">{s.name}</div>
                    {selectedSubjectIds.includes(s.id) && <Check className="w-3 h-3 text-black mt-1" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-sky-200 pt-3">
                <p className="text-xs text-black font-bold mb-2">Atau buat mata pelajaran baru:</p>
                <div className="flex gap-2">
                  <input
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="Kode (ASJ)"
                    className="w-20 form-input"
                  />
                  <input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Nama mata pelajaran"
                    className="flex-1 form-input"
                  />
                  <button
                    onClick={createAndSelectSubject}
                    className="btn-primary"
                  >
                    <Plus className="w-3.5 h-3.5 text-black" />
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

              <button
                onClick={() => { if (selectedSubjectIds.length === 0) { setError("Pilih minimal 1 mata pelajaran."); return; } setError(""); setStep(2); }}
                className="w-full btn-primary justify-center text-sm py-3"
              >
                <span className="text-black font-black">Lanjut: Pilih Kelas</span>
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-black font-bold">Pilih kelas / rombel yang Anda ampu:</p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      selectedGroupIds.includes(g.id)
                        ? "gradient-brand border-sky-400 text-black font-black"
                        : "bg-white border-sky-200 text-black hover:border-sky-400"
                    }`}
                  >
                    <div className="font-black text-black">{g.code}</div>
                    <div className="text-[11px] text-black font-medium mt-0.5 truncate">{g.name}</div>
                    {selectedGroupIds.includes(g.id) && <Check className="w-3 h-3 text-black mt-1" />}
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="btn-default flex-1 justify-center"
                >
                  Kembali
                </button>
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="btn-primary flex-1 justify-center text-sm"
                >
                  <span className="text-black font-black">{saving ? "Menyimpan..." : "Simpan & Lanjutkan"}</span>
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
  const [health, setHealth] = useState<any>(null);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  const fetchHealth = async () => {
    try {
      setRefreshingHealth(true);
      const res = await fetch("/api/admin/system/health");
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingHealth(false);
    }
  };

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
      fetchHealth();
      if (meRes.ok) {
        const me = await meRes.json();
        setUserRole(me.user?.role || "");
        if (me.user?.role === "TEACHER") {
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
      <div className="py-12 text-center text-black">
        <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-bold text-black">Memuat data analitik...</span>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 0, totalQuestions: 0, totalExams: 0, activeSessionsCount: 0 };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title text-black">Dashboard Ringkasan</h1>
            <p className="page-subtitle text-black">
              Status operasional sistem ujian CBT, bank soal, dan pemantauan peserta realtime.
            </p>
          </div>
          <div className="header-actions">
            <button
              onClick={() => router.push("/admin/grades")}
              className="btn-default"
            >
              <BarChart3 className="w-3.5 h-3.5 text-black" />
              <span className="text-black font-bold">Rekap Nilai</span>
            </button>
            <button
              onClick={() => router.push("/admin/questions/import")}
              className="btn-default"
            >
              <Upload className="w-3.5 h-3.5 text-black" />
              <span className="text-black font-bold">Import Soal</span>
            </button>
            <button
              onClick={() => router.push("/admin/exams")}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 text-black" />
              <span className="text-black font-extrabold">Buat Ujian Baru</span>
            </button>
          </div>
        </div>

        {/* KPI Cards - Strictly Soft Blue + Black Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Peserta (Siswa)", value: stats.totalStudents, sub: "Siswa terdaftar aktif", icon: Users, isWarning: false },
            { label: "Bank Soal Tersedia", value: stats.totalQuestions, sub: "Butir soal terkelola", icon: FileQuestion, isWarning: false },
            { label: "Jadwal Ujian (Tes)", value: stats.totalExams, sub: "Ujian dibuat", icon: CalendarDays, isWarning: false },
            { label: "Sesi Ujian Berlangsung", value: stats.activeSessionsCount, sub: "Peserta sedang mengerjakan", icon: Activity, isWarning: stats.activeSessionsCount > 0, pulse: true },
          ].map(({ label, value, sub, icon: Icon, isWarning, pulse }) => (
            <div key={label} className="glass p-5 relative overflow-hidden group shadow-soft hover:border-sky-400 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-black">{label}</span>
                <div className={`w-9 h-9 rounded-xl ${isWarning ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-sky-200 text-black border border-sky-300"} flex items-center justify-center ${pulse ? "animate-pulse" : ""} group-hover:scale-110 transition shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-black mt-3">{value}</div>
              <div className="text-[11px] text-black font-bold mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Realtime Observability & Server Health Card (Soft Blue Theme) */}
        <div className="glass p-5 shadow-soft border border-sky-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-sky-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-200 text-black border border-sky-300 flex items-center justify-center">
                <Server className="w-4 h-4 text-black" />
              </div>
              <div>
                <div className="text-xs font-black text-black flex items-center gap-2">
                  <span>Status Infrastruktur Server & Observabilitas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    health?.status === "ok"
                      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                      : "bg-amber-100 text-amber-950 border-amber-300"
                  }`}>
                    {health?.status === "ok" ? "🟢 Server Optimal" : "🟡 Pengecekan Sistem"}
                  </span>
                </div>
                <div className="text-[11px] text-black font-semibold mt-0.5">
                  Node.js {health?.system?.nodeVersion || "v20"} &bull; Cluster PM2 (4 Workers) &bull; Uptime: {Math.floor((health?.uptimeSeconds || 0) / 60)} Menit
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <a
                href="/api/admin/system/backup"
                download
                className="btn-secondary text-emerald-950 border-emerald-300 hover:bg-emerald-100 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Unduh Salinan Lengkap Database MariaDB (.sql.gz)"
              >
                <Database className="w-3.5 h-3.5 text-emerald-800" />
                <span className="text-emerald-950 font-black">Backup Database (.sql.gz)</span>
              </a>

              <button
                onClick={fetchHealth}
                disabled={refreshingHealth}
                className="btn-default text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-black ${refreshingHealth ? "animate-spin" : ""}`} />
                <span className="text-black font-bold">Perbarui Metrik</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Database */}
            <div className="bg-white/80 rounded-xl p-3 border border-sky-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span>MariaDB Pool</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-black border border-sky-300">
                  {health?.checks?.database?.latencyMs ?? 0} ms
                </span>
              </div>
              <div className="text-sm font-black text-black">
                {health?.checks?.database?.status === "healthy" ? "Normal & Terhubung" : "Degraded"}
              </div>
              <div className="text-[10px] text-black font-medium mt-1 truncate">
                {health?.checks?.database?.engine || "MariaDB 10.x"}
              </div>
            </div>

            {/* Redis */}
            <div className="bg-white/80 rounded-xl p-3 border border-sky-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span>Redis In-Memory</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-black border border-sky-300">
                  {health?.checks?.redis?.latencyMs ?? 0} ms
                </span>
              </div>
              <div className="text-sm font-black text-black">
                {health?.checks?.redis?.status === "healthy" ? "Cache Aktif (PONG)" : "Fallback DB"}
              </div>
              <div className="text-[10px] text-black font-medium mt-1 truncate">
                Anti-Thundering Herd Ready
              </div>
            </div>

            {/* Event Loop Lag */}
            <div className="bg-white/80 rounded-xl p-3 border border-sky-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span>Event Loop Lag</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-black border border-sky-300">
                  {health?.checks?.eventLoop?.lagMs ?? 0} ms
                </span>
              </div>
              <div className="text-sm font-black text-black">
                {((health?.checks?.eventLoop?.lagMs ?? 0) < 50) ? "Sangat Responsif" : "Beban Tinggi"}
              </div>
              <div className="text-[10px] text-black font-medium mt-1 truncate">
                Latensi V8 Event Loop
              </div>
            </div>

            {/* RAM & System */}
            <div className="bg-white/80 rounded-xl p-3 border border-sky-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-black mb-1">
                <span>RAM Server (OS)</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-black border border-sky-300">
                  {health?.system?.osMemoryMb?.usedPercent ?? 0}%
                </span>
              </div>
              <div className="text-sm font-black text-black">
                {health?.system?.osMemoryMb?.free ? `${Math.round(health.system.osMemoryMb.free / 1024 * 10) / 10} GB Free` : "Normal"}
              </div>
              <div className="text-[10px] text-black font-medium mt-1 truncate">
                Node Heap: {health?.system?.processMemoryMb?.heapUsed ?? 0} MB
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Cards - Strictly Soft Blue + Black Text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { path: "/admin/users/import", icon: FileSpreadsheet, title: "Import Template STS (Excel)", desc: "Upload template STS (Multi-Sheet X, XI, XII), generate user/password, dan unduh file terisi." },
            { path: "/admin/questions/import", icon: Upload, title: "Import Soal dari Word", desc: "Unggah file .docx untuk menyusun bank soal otomatis." },
            { path: "/admin/exams", icon: Activity, title: "Live Proctoring Ujian", desc: "Pantau ruang ujian siswa secara live & audit kecurangan." },
            { path: "/admin/grades", icon: BarChart3, title: "Rekap Nilai & Absensi", desc: "Lihat, filter, dan ekspor nilai ujian per kelas & mapel." },
            { path: "/admin/legacy-import", icon: Database, title: "Migrasi Database Legacy", desc: "Tarik data dari dump SQL ZYA CBT lama." },
          ].map(({ path, icon: Icon, title, desc }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="glass p-5 text-left hover:border-sky-400 group cursor-pointer transition shadow-soft"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-200 text-black border border-sky-300 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-sm">
                <Icon className="w-5 h-5 text-black" />
              </div>
              <h3 className="font-black text-sm text-black">{title}</h3>
              <p className="text-xs text-black font-medium mt-1">{desc}</p>
            </button>
          ))}
        </div>

        {/* Recent Activity Table - Strictly Soft Blue + Black Text */}
        <div className="glass p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-black flex items-center gap-2">
              <Activity className="w-4 h-4 text-black" />
              <span>Aktivitas Ujian Terbaru Peserta</span>
            </h2>
          </div>

          {(!data?.recentSessions || data.recentSessions.length === 0) ? (
            <div className="py-8 text-center text-xs font-bold text-black">
              Belum ada aktivitas pengerjaan ujian baru-baru ini.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-sky-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="table-th">Nama Siswa</th>
                    <th className="table-th">Judul Ujian</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Waktu Mulai</th>
                    <th className="table-th text-right">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 bg-white/70">
                  {data.recentSessions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-sky-50 transition">
                      <td className="table-td font-black text-black">
                        {s.user.name} ({s.user.username})
                      </td>
                      <td className="table-td text-black font-medium">{s.exam.title}</td>
                      <td className="table-td">
                        {s.status === "COMPLETED" ? (
                          <span className="badge-success">Selesai</span>
                        ) : s.status === "FORCE_FINISHED" ? (
                          <span className="badge-warning">Dipaksa Selesai</span>
                        ) : s.status === "TIMEOUT" ? (
                          <span className="badge-warning">Waktu Habis</span>
                        ) : s.status === "IN_PROGRESS" ? (
                          <span className="badge-info animate-pulse">Mengerjakan</span>
                        ) : (
                          <span className="badge-danger">{s.status}</span>
                        )}
                      </td>
                      <td className="table-td text-black font-semibold">{formatDate(s.startedAt)}</td>
                      <td className="table-td text-right font-black text-black text-sm">
                        {s.score ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-sky-300 flex flex-col sm:flex-row items-center justify-between text-xs text-black font-bold gap-2">
          <span>Navin CBT Platform &bull; Sistem Asesmen Berbasis Komputer Modern</span>
          <span>Developed by <strong className="text-black font-black">Navins Dev Digital Solutions</strong> &bull; Bandung, Indonesia</span>
        </div>
      </div>
    </>
  );
}
