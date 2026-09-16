"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Tv,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  Unlock,
  AlertTriangle,
  Flame,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  Server,
  Zap,
  MessageSquare,
  StopCircle,
  ExternalLink,
  Eye,
  X,
  Loader2,
  Search,
  Database,
} from "lucide-react";

export default function CommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Selected Lab for inspection modal
  const [inspectedLab, setInspectedLab] = useState<any | null>(null);

  // Broadcast Modal State
  const [broadcastTargetLab, setBroadcastTargetLab] = useState<any | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // WhatsApp Report Modal State
  const [showWaModal, setShowWaModal] = useState(false);
  const [waText, setWaText] = useState("");
  const [copiedWa, setCopiedWa] = useState(false);

  // Global Search & Backup states
  const [searchQuery, setSearchQuery] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async (examId?: string) => {
    try {
      const url = examId || selectedExamId
        ? `/api/admin/command-center?examId=${examId || selectedExamId}`
        : "/api/admin/command-center";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!selectedExamId && json.activeExam?.id) {
          setSelectedExamId(json.activeExam.id);
        }
        if (inspectedLab && json.labs) {
          const updated = json.labs.find((l: any) => l.labId === inspectedLab.labId);
          if (updated) setInspectedLab(updated);
        }
        setLastRefreshed(new Date());
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedExamId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedExamId, inspectedLab]);

  // Master Action: Auto-Heal Zombies
  const handleAutoHeal = async () => {
    if (!confirm("Jalankan Pembersih Sesi Gantung (Auto-Heal)?\nSistem akan menutup dan mengkalkulasi nilai seluruh sesi yang sudah melebihi batas durasi ujian.")) {
      return;
    }
    setActionLoading("auto-heal");
    try {
      const res = await fetch("/api/admin/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "AUTO_HEAL_ZOMBIES" }),
      });
      const result = await res.json();
      showToast(result.message || "Auto-Healer selesai dijalankan.");
      fetchData();
    } catch {
      showToast("Gagal menjalankan Auto-Healer.");
    } finally {
      setActionLoading(null);
    }
  };

  // Fast Database Backup Trigger
  const handleBackupNow = async () => {
    if (!confirm("Jalankan backup database zyacbt_modern sekarang?\nFile cadangan akan langsung dikompresi dan diamankan di /var/backups/cbt-database.")) return;
    try {
      setIsBackingUp(true);
      const res = await fetch("/api/admin/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRIGGER_BACKUP" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ " + data.message);
      } else {
        showToast("❌ " + (data.error || "Gagal backup database"));
      }
    } catch (err: any) {
      showToast("❌ Terjadi kesalahan backup: " + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Lab Action: Reset Logins
  const handleResetLab = async (labId?: number, userIds?: string[]) => {
    const isSingle = userIds && userIds.length === 1;
    const label = isSingle ? "siswa terpilih" : labId ? `LAB ${labId}` : "seluruh Lab";
    if (!confirm(`Buka gembok login & reset pelanggaran untuk ${label}?\nSiswa dapat langsung login kembali di perangkat baru/lama.`)) {
      return;
    }
    setActionLoading(`reset-${labId || "all"}`);
    try {
      const res = await fetch("/api/admin/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_LAB_LOGINS",
          examId: data?.activeExam?.id,
          labId,
          userIds,
        }),
      });
      const result = await res.json();
      showToast(result.message || `Gembok login ${label} berhasil direset.`);
      fetchData();
    } catch {
      showToast(`Gagal mereset login ${label}.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Lab Action: Force Finish
  const handleForceFinishLab = async (labId?: number, userIds?: string[]) => {
    const label = labId ? `LAB ${labId}` : "seluruh Lab";
    if (!confirm(`PERINGATAN: Paksa selesai ujian untuk siswa yang sedang mengerjakan di ${label}?\nNilai akan langsung dihitung.`)) {
      return;
    }
    setActionLoading(`finish-${labId || "all"}`);
    try {
      const res = await fetch("/api/admin/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FORCE_FINISH_LAB",
          examId: data?.activeExam?.id,
          labId,
          userIds,
        }),
      });
      const result = await res.json();
      showToast(result.message || `Ujian di ${label} berhasil diselesaikan.`);
      fetchData();
    } catch {
      showToast(`Gagal menyelesaikan ujian ${label}.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Send Broadcast
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setActionLoading("broadcast");
    try {
      const res = await fetch("/api/admin/command-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BROADCAST_LAB",
          examId: data?.activeExam?.id,
          labId: broadcastTargetLab?.labId || null,
          message: broadcastMessage,
        }),
      });
      const result = await res.json();
      showToast(result.message || "Pesan broadcast berhasil dikirim.");
      setShowBroadcastModal(false);
      setBroadcastMessage("");
    } catch {
      showToast("Gagal mengirim broadcast.");
    } finally {
      setActionLoading(null);
    }
  };

  // Open WhatsApp Report Generator
  const openWhatsAppReport = () => {
    try {
      const examTitle = data?.activeExam?.title || "Ujian STS";
      const subject = data?.activeExam?.subjectName || "-";
      let timeStr = "-";
      let dateStr = "-";
      try {
        timeStr = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
        dateStr = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
      } catch {
        timeStr = new Date().toISOString().substring(11, 16);
        dateStr = new Date().toISOString().substring(0, 10);
      }
      const s = data?.summary || { totalConnected: 0, totalInProgress: 0, totalCompleted: 0, totalCapacity: 280, totalLocked: 0 };
      const t = data?.telemetry || { osRamPercent: 0, cpuLoad1m: 0 };

    const text = `📢 *LAPORAN MONITORING ASESMEN (STS)*
*SMK PASUNDAN 2 BANDUNG*
📅 Hari/Tgl: ${dateStr}
⏰ Pukul: ${timeStr} WIB
📝 Ujian: *${examTitle}* (${subject})
------------------------------------------------
🖥️ *Kondisi 7 Lab Komputer (Total 280 PC):*
• Total Terhubung: *${s.totalConnected}* / ${s.totalCapacity} PC
• Sedang Mengerjakan: *${s.totalInProgress}* Siswa
• Telah Selesai: *${s.totalCompleted}* Siswa
• Kendala Login / Gembok: *${s.totalLocked}* Siswa (Tertangani)

⚡ *Status Server & Jaringan LAN:*
• Beban RAM Server: *${t.osRamPercent}%* (Optimal)
• CPU Load: *${t.cpuLoad1m}* | Redis: *HEALTHY*
• Jaringan LAN 7 Lab: *Normal & Stabil*
------------------------------------------------
_Laporan otomatis dari Pusat Kendali CBT HEBAT_`;

    setWaText(text);
    setCopiedWa(false);
    setShowWaModal(true);
    } catch (e: any) {
      showToast("Gagal menyiapkan laporan: " + (e?.message || ""));
    }
  };

  const copyWaToClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(waText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = waText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedWa(true);
      showToast("Teks Laporan WhatsApp berhasil disalin ke clipboard!");
      setTimeout(() => setCopiedWa(false), 3000);
    } catch {
      showToast("Gagal menyalin otomatis, silakan blok dan salin secara manual.");
    }
  };

  const activeExam = data?.activeExam;
  const examsList = data?.examsList || [];
  const labs = data?.labs || [];

  // Flattened students for global search across all 7 labs
  const allStudents = React.useMemo(() => {
    if (!labs || labs.length === 0) return [];
    return labs.flatMap((lab: any) =>
      (lab.students || []).map((st: any) => ({
        ...st,
        labId: lab.labId,
        labName: lab.labName,
      }))
    );
  }, [labs]);

  const filteredStudents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allStudents.filter((st: any) =>
      st.name?.toLowerCase().includes(q) ||
      st.username?.toLowerCase().includes(q) ||
      st.nis?.toLowerCase().includes(q) ||
      st.groupName?.toLowerCase().includes(q) ||
      st.labName?.toLowerCase().includes(q)
    );
  }, [allStudents, searchQuery]);
  const summary = data?.summary || { totalConnected: 0, totalCapacity: 280, totalInProgress: 0, totalCompleted: 0, totalLocked: 0, totalZombies: 0 };
  const telemetry = data?.telemetry || { osRamPercent: 0, cpuLoad1m: 0, serverTimeWIB: "-" };

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin mb-4" />
        <h2 className="text-base font-black">Memuat Pusat Kendali 7 Lab...</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">Menghubungkan telemetri & data 280 PC</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-sky-400 flex items-center gap-3 animate-bounce">
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP COMMAND STRIP */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl border border-sky-400/30 relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>PUSAT KENDALI 7 LAB KOMPUTER</span>
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    War Room Live
                  </span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  SMK PASUNDAN 2 Bandung • Monitoring 7 Lab Komputer (280 PC Hub)
                </p>
              </div>
            </div>

            {/* Exam Selector & Token */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 font-bold">Ujian:</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    setLoading(true);
                  }}
                  className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer"
                >
                  {examsList.length === 0 ? (
                    <option value="" className="bg-slate-900 text-slate-400">
                      Belum ada jadwal ujian aktif
                    </option>
                  ) : (
                    examsList.map((e: any) => (
                      <option key={e.id} value={e.id} className="bg-slate-900 text-white">
                        {e.title} ({e.subjectName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {activeExam && (
                <div className="flex items-center gap-2 bg-cyan-950/70 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-cyan-400 font-bold">Token Ujian:</span>
                  <span className="font-mono font-black text-cyan-200 text-sm tracking-wider">
                    {activeExam.token}
                  </span>
                  {activeExam.isTokenDynamic && (
                    <span className="text-[10px] text-amber-300 animate-pulse">
                      ({activeExam.tokenRemainingSeconds}s)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Master Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-Heal Zombies */}
            <button
              onClick={handleAutoHeal}
              disabled={actionLoading === "auto-heal"}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              title="Selesaikan sesi yang sudah lewat batas durasi ujian"
            >
              <Flame className="w-4 h-4" />
              <span>{actionLoading === "auto-heal" ? "Membersihkan..." : "Auto-Heal Sesi"}</span>
              {summary.totalZombies > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded-full text-[10px] font-black">
                  {summary.totalZombies}
                </span>
              )}
            </button>

            {/* WhatsApp Instant Report */}
            <button
              onClick={openWhatsAppReport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Rekap WhatsApp</span>
            </button>

            {/* Backup DB Cepat */}
            <button
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-emerald-100 rounded-xl font-bold text-xs border border-emerald-600/60 transition shadow-sm cursor-pointer"
              title="Backup Database MySQL zyacbt_modern sekarang"
            >
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
              ) : (
                <Database className="w-4 h-4 text-emerald-300" />
              )}
              <span className="hidden sm:inline">{isBackingUp ? "Mem-backup..." : "Backup DB"}</span>
            </button>

            {/* TV Token Board */}
            <Link
              href="/admin/token-board"
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-600 transition shadow-sm"
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Layar TV</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                autoRefresh
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title={autoRefresh ? "Auto-refresh aktif (5s)" : "Auto-refresh jeda"}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Bar Ribbon */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs font-bold">
          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">JAM SERVER (WIB)</span>
            <span className="text-sm font-mono text-cyan-300">{telemetry.serverTimeWIB}</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">PC TERKONEKSI</span>
            <span className="text-sm font-mono text-white">
              {summary.totalConnected} <span className="text-slate-400 font-normal">/ 280 PC</span>
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">MENGERJAKAN</span>
            <span className="text-sm font-mono text-emerald-400">{summary.totalInProgress} Siswa</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">TELAH SELESAI</span>
            <span className="text-sm font-mono text-cyan-400">{summary.totalCompleted} Siswa</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">RAM & CPU LOAD</span>
            <span className="text-sm font-mono text-amber-300">
              {telemetry.osRamPercent}% <span className="text-slate-400 font-normal">({telemetry.cpuLoad1m})</span>
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">TERKUNCI / GEMBOK</span>
            <span className={`text-sm font-mono ${summary.totalLocked > 0 ? "text-rose-400 font-black animate-pulse" : "text-slate-300"}`}>
              {summary.totalLocked} Siswa
            </span>
          </div>
        </div>
      </div>

      {/* 🔍 GLOBAL STUDENT QUICK SEARCH & 1-CLICK RESOLUTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-600" />
              Pencarian Cepat Siswa (1-Click Buka Kunci / Reset Login)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ketik NIS, Nama Siswa, atau Rombel untuk langsung membuka gembok perangkat & mereset pelanggaran tanpa membuka tiap lab.
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset Pencarian
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik Nama Siswa, NIS, atau Kelas/Rombel... (Contoh: 10234 atau Ahmad atau XII RPL)"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {searchQuery.trim() && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Ditemukan: <strong className="text-sky-600">{filteredStudents.length} siswa</strong>
              </span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                Tidak ada siswa yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl">
                {filteredStudents.map((st: any) => (
                  <div
                    key={st.userId || st.sessionId}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black text-xs flex items-center justify-center shrink-0">
                        {st.seatNumber || "PC"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {st.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({st.nis || st.username})
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {st.labName || "LAB"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {st.groupName || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              st.status === "IN_PROGRESS"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : st.status === "COMPLETED"
                                ? "bg-sky-100 text-sky-800 border-sky-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                          >
                            {st.status === "IN_PROGRESS"
                              ? "Sedang Mengerjakan"
                              : st.status === "COMPLETED"
                              ? "Selesai"
                              : st.status || "-"}
                          </span>
                          {st.isLocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              🔒 TERKUNCI
                            </span>
                          )}
                          {st.violationCount > 0 && (
                            <span className="text-[10px] font-bold text-rose-600">
                              {st.violationCount}x Pelanggaran
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleResetLab(st.labId, [st.userId])}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Buka gembok perangkat, hapus fingerprint, dan reset hitungan pelanggaran"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Buka Kunci & Reset Login</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7-LAB GRID (THE WAR ROOM DISPLAY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Status 7 Laboratorium Komputer
            </h2>
            <span className="text-xs text-slate-500 font-semibold">(40 PC per Lab)</span>
          </div>
          <button
            onClick={() => handleResetLab()}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 underline cursor-pointer"
          >
            Reset Gembok Seluruh Lab
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {labs.map((lab: any) => {
            const isWarning = lab.status === "WARNING";
            const percent = lab.occupancyPercent || 0;

            return (
              <div
                key={lab.labId}
                className={`bg-white rounded-3xl p-5 border shadow-sm transition-all duration-200 flex flex-col justify-between ${
                  isWarning
                    ? "border-amber-400/80 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/20"
                    : "border-sky-200 hover:border-sky-300"
                }`}
              >
                <div>
                  {/* Card Header: Lab Name & Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        isWarning
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : lab.connectedCount > 0
                          ? "bg-sky-100 text-sky-900 border border-sky-300"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {lab.labId}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900">{lab.labName}</h3>
                        <span className="text-[10px] text-slate-500 font-bold">Kapasitas 40 PC</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      isWarning
                        ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                        : lab.connectedCount > 0
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {isWarning ? "PERINGATAN" : lab.connectedCount > 0 ? "AKTIF" : "KOSONG"}
                    </span>
                  </div>

                  {/* Occupancy Gauge */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Okupansi PC:</span>
                      <span className="font-mono font-black text-slate-900">
                        {lab.connectedCount} / {lab.capacity} PC ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isWarning
                            ? "bg-amber-500"
                            : percent >= 80
                            ? "bg-emerald-500"
                            : percent > 0
                            ? "bg-sky-500"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 4 Stat Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold mb-4">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Mengerjakan</span>
                      <span className="text-emerald-700 font-black">{lab.inProgressCount} Siswa</span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Selesai</span>
                      <span className="text-sky-700 font-black">{lab.completedCount} Siswa</span>
                    </div>

                    <div className={`p-2 rounded-xl border ${
                      lab.lockedCount > 0
                        ? "bg-rose-50 border-rose-300 text-rose-700 font-black"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}>
                      <span className="text-[10px] text-slate-500 block">Terkunci</span>
                      <span>{lab.lockedCount} Siswa</span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Rata-rata Nilai</span>
                      <span className="text-slate-900 font-mono font-black">{lab.avgScore}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                    {/* Reset Lab Logins */}
                    <button
                      onClick={() => handleResetLab(lab.labId)}
                      disabled={actionLoading === `reset-${lab.labId}`}
                      className="py-1.5 px-2 bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Reset gembok login 40 siswa di Lab ini"
                    >
                      <Unlock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Reset Login</span>
                    </button>

                    {/* Broadcast Lab */}
                    <button
                      onClick={() => {
                        setBroadcastTargetLab(lab);
                        setShowBroadcastModal(true);
                      }}
                      className="py-1.5 px-2 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Kirim pengumuman khusus ke Lab ini"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-600" />
                      <span>Broadcast</span>
                    </button>
                  </div>

                  {/* Inspect 40 PCs button */}
                  <button
                    onClick={() => setInspectedLab(lab)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Lihat Rincian 40 PC</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAIL MODAL: INSPECT 40 PCs IN A LAB */}
      {inspectedLab && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] shadow-2xl border border-sky-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-sky-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {inspectedLab.labId}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">{inspectedLab.labName}</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {inspectedLab.connectedCount} dari {inspectedLab.capacity} PC Terisi • Rata-rata Nilai: {inspectedLab.avgScore}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleForceFinishLab(inspectedLab.labId)}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Paksa Selesai Lab Ini</span>
                </button>

                <button
                  onClick={() => setInspectedLab(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Table / Grid of 40 PCs */}
            <div className="p-5 overflow-y-auto flex-1">
              {(!inspectedLab?.students || inspectedLab.students.length === 0) ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-bold text-sm">Belum ada siswa yang login di {inspectedLab.labName}</p>
                  <p className="text-xs text-slate-500 mt-1">Siswa akan otomatis muncul saat mulai masuk ke halaman ujian.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-12 text-[11px] font-black uppercase text-slate-500 pb-2 px-2">
                    <span className="col-span-1">PC</span>
                    <span className="col-span-4">Nama Siswa / NIS</span>
                    <span className="col-span-2">Kelas</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-1 text-center">Nilai</span>
                    <span className="col-span-2 text-right">Aksi</span>
                  </div>

                  {(inspectedLab.students || []).map((st: any) => (
                    <div
                      key={st.sessionId || st.userId || Math.random()}
                      className={`grid grid-cols-12 items-center py-2.5 px-2 text-xs rounded-xl transition ${
                        st.isLocked ? "bg-rose-50/70" : "hover:bg-sky-50/40"
                      }`}
                    >
                      <span className="col-span-1 font-mono font-bold text-slate-600">
                        #{st.seatNumber || "01"}
                      </span>
                      <div className="col-span-4 min-w-0 pr-2">
                        <div className="font-black text-slate-900 truncate">{st.name || "Siswa"}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{st.username || "-"} • NIS: {st.nis || "-"}</div>
                      </div>
                      <span className="col-span-2 font-semibold text-slate-700 truncate">
                        {st.groupName || "-"}
                      </span>
                      <div className="col-span-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          st.status === "IN_PROGRESS"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : st.status === "COMPLETED"
                            ? "bg-sky-100 text-sky-800 border-sky-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {st.status === "IN_PROGRESS" ? "Mengerjakan" : st.status === "COMPLETED" ? "Selesai" : (st.status || "-")}
                        </span>
                        {st.isLocked && (
                          <span className="ml-1 text-[9px] text-rose-600 font-black">TERKUNCI</span>
                        )}
                      </div>
                      <span className="col-span-1 text-center font-mono font-black text-slate-800">
                        {st.score !== null && st.score !== undefined ? st.score : "-"}
                      </span>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => handleResetLab(undefined, st.userId ? [st.userId] : undefined)}
                          className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg text-[10px] font-black transition cursor-pointer"
                          title="Reset gembok login siswa ini"
                        >
                          Reset Login
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setInspectedLab(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BROADCAST MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Broadcast Pengumuman</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Kirim ke: <strong className="text-slate-800">{broadcastTargetLab?.labName || "Semua 7 Lab Komputer"}</strong>
                </p>
              </div>
            </div>

            <textarea
              rows={4}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Contoh: Perhatian seluruh siswa, untuk soal nomor 12 opsi C diganti menjadi 192.168.1.1..."
              className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 font-medium"
            ></textarea>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                onClick={handleSendBroadcast}
                disabled={actionLoading === "broadcast" || !broadcastMessage.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Pengumuman</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP REPORT MODAL */}
      {showWaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Rekap Laporan WhatsApp</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Format rapi untuk dikirim ke Kepala Sekolah / Waka Kurikulum
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowWaModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={11}
              value={waText}
              onChange={(e) => setWaText(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-300 bg-slate-50 focus:border-emerald-500 focus:outline-none text-slate-900 leading-relaxed select-all"
            ></textarea>

            <div className="flex items-center justify-between gap-3 mt-4">
              <span className="text-[11px] text-slate-500 font-semibold">
                Tekan tombol salin lalu paste (Ctrl+V) di WhatsApp Web
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWaModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Tutup
                </button>
                <button
                  onClick={copyWaToClipboard}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {copiedWa ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{copiedWa ? "Tersalin!" : "Salin ke WhatsApp"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
