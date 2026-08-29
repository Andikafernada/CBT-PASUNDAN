"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  RotateCcw,
  Clock,
  Key,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Play,
  Lock,
  Unlock,
  StopCircle,
  PlusCircle,
  Search,
  Filter,
  Layers,
  BarChart3,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  MoreVertical,
  Laptop,
  Check,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

export default function ExamProctorPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [groupByClass, setGroupByClass] = useState(false);
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Time Add Modal State
  const [selectedSessionForTime, setSelectedSessionForTime] = useState<any | null>(null);
  const [timeToAdd, setTimeToAdd] = useState<number>(10);

  useEffect(() => {
    fetchProctorData();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchProctorData(false);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [examId, autoRefresh]);

  const fetchProctorData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`/api/admin/exams/${examId}/proctor`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleAction = async (
    action: string,
    sessionId?: string,
    additionalMinutes?: number | null,
    isDynamic?: boolean
  ) => {
    if (action === "RESET" && !confirm("Yakin ingin mereset sesi peserta ini? Semua jawaban akan dihapus dan peserta dapat mengulang dari awal.")) {
      return;
    }
    if (action === "FORCE_FINISH" && !confirm("Yakin ingin menghentikan paksa ujian peserta ini? Nilai akan dihitung dari jawaban yang telah tersimpan.")) {
      return;
    }

    setActionLoading((sessionId || "") + action);
    try {
      const res = await fetch(`/api/admin/exams/${examId}/proctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId, additionalMinutes, isDynamic }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal memproses aksi");

      await fetchProctorData(false);
      if (action === "ADD_TIME") {
        setSelectedSessionForTime(null);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const exam = data?.exam;
  const sessions = data?.sessions || [];

  // Extract unique class groups from active sessions
  const availableGroups: string[] = Array.from(
    new Set(sessions.map((s: any) => s.user.group?.name || "Reguler").filter(Boolean))
  );

  const filteredSessions = sessions.filter((s: any) => {
    const groupName = s.user.group?.name || "Reguler";
    const matchGroup = selectedGroup === "ALL" || groupName === selectedGroup;
    const matchSearch =
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.user.username.toLowerCase().includes(search.toLowerCase()) ||
      groupName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
    return matchGroup && matchSearch && matchStatus;
  });

  const inProgressCount = sessions.filter((s: any) => s.status === "IN_PROGRESS").length;
  const completedCount = sessions.filter((s: any) => s.status === "COMPLETED").length;
  const suspendedCount = sessions.filter((s: any) => s.status === "SUSPENDED").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/exams")}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{exam?.title}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE PROCTOR
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Kode: <span className="font-mono text-slate-300">{exam?.code}</span> • Token:{" "}
              <span className="font-mono font-bold text-amber-400">{exam?.token}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === "GRID" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
              title="Tampilan Kartu Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                viewMode === "TABLE" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>

          <button
            onClick={() => router.push(`/admin/exams/${examId}/analysis`)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Buka Analisis Butir Soal Psikometri"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analisis Soal</span>
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span className="hidden sm:inline">Auto-Refresh (5s)</span>
          </label>

          <button
            onClick={() => fetchProctorData(true)}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Dynamic Token Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Key className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Token Ujian Aktif</span>
              {exam?.isTokenDynamic ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                  Dinamis (Refresh Tiap 15 Menit)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Statis
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-3xl font-black text-amber-400 tracking-wider">
                {exam?.token}
              </span>
              {exam?.isTokenDynamic && exam?.tokenSecondsLeft && (
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  Rotasi dalam: <span className="font-bold text-white">{formatTime(exam.tokenSecondsLeft)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleAction("TOGGLE_DYNAMIC_TOKEN", "", null, !exam?.isTokenDynamic)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
              exam?.isTokenDynamic
                ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-500/30 shadow-md shadow-purple-600/20"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {exam?.isTokenDynamic ? "Mode: Token Dinamis 15m (Aktif)" : "Ganti ke Token Dinamis 15m"}
          </button>

          <button
            onClick={() => handleAction("REGENERATE_TOKEN")}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Generate Acak Token Baru"
          >
            Acak Token Baru
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-slate-400 text-xs font-semibold">Total Peserta Ikut</div>
          <div className="text-2xl font-black text-white mt-1">{sessions.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Sedang Mengerjakan</span>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{inProgressCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-emerald-400 text-xs font-semibold">Telah Selesai</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{completedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="text-rose-400 text-xs font-semibold">Dibekukan (Pelanggaran)</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{suspendedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama peserta, NIS, username, atau kelas..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Per Kelas / Rombel */}
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Kelas ({availableGroups.length} Kelas)</option>
          {availableGroups.map((g) => {
            const countInGroup = sessions.filter((s: any) => (s.user.group?.name || "Reguler") === g).length;
            return (
              <option key={g} value={g}>
                Kelas: {g} ({countInGroup} Siswa)
              </option>
            );
          })}
        </select>

        {/* Filter Status Pengerjaan */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Status ({sessions.length})</option>
          <option value="IN_PROGRESS">🟢 Mengerjakan ({inProgressCount})</option>
          <option value="COMPLETED">🏁 Selesai ({completedCount})</option>
          <option value="SUSPENDED">🔴 Dibekukan ({suspendedCount})</option>
        </select>

        {/* Group By Class Toggle */}
        <button
          onClick={() => setGroupByClass(!groupByClass)}
          className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
            groupByClass
              ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
          title="Kelompokkan tampilan berdasarkan Rombel/Kelas"
        >
          <Layers className="w-4 h-4" />
          <span>Grup Kelas</span>
        </button>
      </div>

      {/* LIVE PROCTORING VIEW */}
      {filteredSessions.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          Tidak ada data peserta yang cocok dengan kriteria pencarian.
        </div>
      ) : viewMode === "GRID" ? (
        /* 1. CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSessions.map((s: any) => {
            const isInProgress = s.status === "IN_PROGRESS";
            const isCompleted = s.status === "COMPLETED";
            const isSuspended = s.status === "SUSPENDED";
            const hasViolations = s.violationCount > 0;

            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative shadow-lg ${
                  isSuspended
                    ? "bg-rose-950/20 border-rose-500/50 shadow-rose-900/10"
                    : isInProgress && hasViolations
                    ? "bg-amber-950/20 border-amber-500/40 shadow-amber-900/10"
                    : isInProgress
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    : "bg-slate-900/50 border-slate-800/60 opacity-90"
                }`}
              >
                <div>
                  {/* Card Header: Avatar & Status Badge */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/70">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase text-white shadow ${
                          isSuspended
                            ? "bg-rose-600"
                            : isInProgress
                            ? "bg-blue-600"
                            : "bg-emerald-600"
                        }`}
                      >
                        {s.user.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs leading-snug line-clamp-1">
                          {s.user.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{s.user.username}</span>
                          <span>•</span>
                          <span>{s.user.group?.name || "Reguler"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {isInProgress ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Aktif
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" />
                        Nilai: {s.score ?? 0}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" />
                        Beku
                      </span>
                    )}
                  </div>

                  {/* Progress & Time Info */}
                  <div className="py-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Progres Soal:</span>
                      <span className="font-bold text-white">
                        {s.answeredCount} / {s.totalQuestions} ({s.progressPercent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted
                            ? "bg-emerald-500"
                            : isSuspended
                            ? "bg-rose-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${s.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Sisa Waktu:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatTime(s.remainingSeconds)}
                        </span>
                      </div>

                      <div
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 ${
                          hasViolations
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "text-slate-500"
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        <span>{s.violationCount}x</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-800/70 grid grid-cols-2 gap-1.5">
                  {isSuspended && (
                    <button
                      onClick={() => handleAction("UNLOCK", s.id)}
                      className="col-span-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Buka Kunci
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedSessionForTime(s);
                          setTimeToAdd(10);
                        }}
                        className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
                        title="Tambah Waktu Ujian"
                      >
                        <PlusCircle className="w-3 h-3 text-blue-400" /> +Waktu
                      </button>

                      <button
                        onClick={() => handleAction("FORCE_FINISH", s.id)}
                        className="py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1"
                        title="Hentikan & Hitung Nilai Sekarang"
                      >
                        <StopCircle className="w-3 h-3" /> Selesai
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleAction("RESET_LOGIN", s.id)}
                    className={`py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] rounded-lg border border-slate-800 transition flex items-center justify-center gap-1 ${
                      isInProgress ? "col-span-2" : "col-span-1"
                    }`}
                    title="Buka Kunci Perangkat jika siswa ganti laptop/komputer"
                  >
                    <Laptop className="w-3 h-3 text-amber-400" /> Reset Perangkat
                  </button>

                  <button
                    onClick={() => handleAction("RESET", s.id)}
                    className={`py-1 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-[10px] rounded-lg border border-slate-800 hover:border-rose-500/30 transition flex items-center justify-center gap-1 ${
                      isInProgress ? "col-span-2" : "col-span-1"
                    }`}
                    title="Hapus sesi agar peserta mengulang"
                  >
                    <RotateCcw className="w-3 h-3" /> Ulang Dari Awal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Siswa / Akun</th>
                  <th className="py-3 px-4">Status & Waktu</th>
                  <th className="py-3 px-4">Progres Lembar Soal</th>
                  <th className="py-3 px-4 text-center">Pelanggaran</th>
                  <th className="py-3 px-4 text-right">Aksi Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSessions.map((s: any) => {
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{s.user.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{s.user.username}</span>
                          <span>•</span>
                          <span>{s.user.group?.name || "Kelas Reguler"}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-500">{s.ipAddress || "127.0.0.1"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          {s.status === "IN_PROGRESS" ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" /> Mengerjakan
                            </span>
                          ) : s.status === "COMPLETED" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Selesai ({s.score ?? 0})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Dibekukan
                            </span>
                          )}
                        </div>
                        {s.status === "IN_PROGRESS" && (
                          <div className="text-[11px] font-mono text-slate-400">
                            Sisa: {formatTime(s.remainingSeconds)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>
                            {s.answeredCount} dari {s.totalQuestions} Soal
                          </span>
                          <span className="font-bold text-white">{s.progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${s.progressPercent}%` }}
                          />
                        </div>
                        {s.doubtfulCount > 0 && (
                          <div className="text-[10px] text-amber-400 mt-1">
                            {s.doubtfulCount} soal ditandai ragu-ragu
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                            s.violationCount > 0
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-slate-950 text-slate-500"
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{s.violationCount}x</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === "SUSPENDED" && (
                            <button
                              onClick={() => handleAction("UNLOCK", s.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition"
                              title="Buka Kunci Akun"
                            >
                              <Unlock className="w-3.5 h-3.5 inline mr-1" /> Buka Kunci
                            </button>
                          )}

                          {s.status === "IN_PROGRESS" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedSessionForTime(s);
                                  setTimeToAdd(10);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 transition"
                                title="Tambah Waktu"
                              >
                                +Waktu
                              </button>

                              <button
                                onClick={() => handleAction("FORCE_FINISH", s.id)}
                                className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold rounded-lg transition"
                                title="Hentikan Paksa"
                              >
                                Selesaikan
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleAction("RESET_LOGIN", s.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Reset Kunci Perangkat"
                          >
                            <Laptop className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleAction("RESET", s.id)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title="Reset & Ulang Sesi"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extra Time Modal */}
      {selectedSessionForTime && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Tambah Waktu Pengerjaan</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Peserta: <strong className="text-white">{selectedSessionForTime.user.name}</strong> ({selectedSessionForTime.user.username})
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Pilih Tambahan Menit:</label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15, 20, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimeToAdd(m)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      timeToAdd === m
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                        : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    +{m} Menit
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSessionForTime(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => handleAction("ADD_TIME", selectedSessionForTime.id, timeToAdd)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                Simpan & Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
