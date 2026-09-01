"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3, Download, RefreshCw, Filter, Users, CheckCircle, XCircle,
  Clock, AlertTriangle, BookOpen, ChevronDown, Plus, Loader2,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  HADIR: { label: "✅ Hadir", color: "emerald" },
  HADIR_SUSULAN: { label: "🔵 Hadir Susulan", color: "blue" },
  DIPAKSA_SELESAI: { label: "🟠 Dipaksa Selesai", color: "orange" },
  WAKTU_HABIS: { label: "🟠 Waktu Habis", color: "amber" },
  SEDANG_MENGERJAKAN: { label: "🔄 Mengerjakan", color: "indigo" },
  TIDAK_HADIR: { label: "🔴 Tidak Hadir", color: "rose" },
};

export default function GradesPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [userRole, setUserRole] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/admin/subjects").then((r) => r.json()),
      fetch("/api/admin/groups").then((r) => r.json()),
    ]).then(([me, subj, grp]) => {
      setUserRole(me.user?.role || "");
      setSubjects(subj.subjects || []);
      setGroups(grp.groups || []);
      fetchGrades();
    });
  }, []);

  const fetchGrades = async (subjectId = "", groupId = "") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", subjectId);
    if (groupId) params.set("groupId", groupId);
    const res = await fetch(`/api/admin/grades?${params}`);
    const d = await res.json();
    setGrades(d.grades || []);
    setLoading(false);
  };

  const applyFilter = () => fetchGrades(filterSubjectId, filterGroupId);

  const exportCSV = async () => {
    setExporting(true);
    const params = new URLSearchParams({ format: "csv" });
    if (filterSubjectId) params.set("subjectId", filterSubjectId);
    if (filterGroupId) params.set("groupId", filterGroupId);
    const res = await fetch(`/api/admin/grades?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-nilai-${Date.now()}.csv`;
    a.click();
    setExporting(false);
  };

  const filtered = filterStatus ? grades.filter((g) => g.attendanceStatus === filterStatus) : grades;

  const summary = {
    hadir: grades.filter((g) => g.attendanceStatus === "HADIR").length,
    hadir_susulan: grades.filter((g) => g.attendanceStatus === "HADIR_SUSULAN").length,
    dipaksa: grades.filter((g) => g.attendanceStatus === "DIPAKSA_SELESAI" || g.attendanceStatus === "WAKTU_HABIS").length,
    tidak_hadir: grades.filter((g) => g.attendanceStatus === "TIDAK_HADIR").length,
    avg: grades.filter((g) => g.score !== null).length > 0
      ? (grades.filter((g) => g.score !== null).reduce((sum, g) => sum + g.score, 0) / grades.filter((g) => g.score !== null).length).toFixed(1)
      : "-",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            Rekap Nilai & Absensi Ujian
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Data nilai dan kehadiran seluruh peserta ujian {userRole === "TEACHER" ? "dari kelas ampuan Anda" : "lintas kelas & mata pelajaran"}.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting || grades.length === 0}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Hadir Normal", value: summary.hadir, color: "emerald", icon: CheckCircle },
          { label: "Hadir Susulan", value: summary.hadir_susulan, color: "blue", icon: BookOpen },
          { label: "Auto/Paksa Selesai", value: summary.dipaksa, color: "amber", icon: Clock },
          { label: "Tidak Hadir", value: summary.tidak_hadir, color: "rose", icon: XCircle },
          { label: "Rata-rata Nilai", value: summary.avg, color: "violet", icon: BarChart3 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs`}>
            <div className={`text-${color}-600 dark:text-${color}-400 flex items-center gap-1 mb-1`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </div>
            <div className={`text-2xl font-black text-${color}-600 dark:text-${color}-300`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-2xs">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Mata Pelajaran</label>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white min-w-40"
          >
            <option value="">Semua Mapel</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Kelas / Rombel</label>
          <select
            value={filterGroupId}
            onChange={(e) => setFilterGroupId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white min-w-36"
          >
            <option value="">Semua Kelas</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Status Kehadiran</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white min-w-44"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button
          onClick={applyFilter}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition h-[30px] shadow-2xs"
        >
          <Filter className="w-3.5 h-3.5" />
          Terapkan
        </button>
        <button
          onClick={() => { setFilterSubjectId(""); setFilterGroupId(""); setFilterStatus(""); fetchGrades(); }}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs flex items-center gap-1 transition h-[30px]"
        >
          <RefreshCw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs">Memuat rekap nilai...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">Tidak ada data dengan filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80 font-bold">
                <tr>
                  <th className="py-3 px-3 text-left">No</th>
                  <th className="py-3 px-3 text-left">NIS</th>
                  <th className="py-3 px-3 text-left">Nama Siswa</th>
                  <th className="py-3 px-3 text-left">Kelas</th>
                  <th className="py-3 px-3 text-left">Mata Pelajaran</th>
                  {userRole !== "TEACHER" && <th className="py-3 px-3 text-left">Guru</th>}
                  <th className="py-3 px-3 text-left">Judul Ujian</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Nilai</th>
                  <th className="py-3 px-3 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((row, i) => {
                  const statusInfo = STATUS_LABELS[row.attendanceStatus] || { label: row.attendanceStatus, color: "slate" };
                  return (
                    <tr key={`${row.examId}-${row.studentId}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{row.nis}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{row.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{row.groupName}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{row.subjectName}</td>
                      {userRole !== "TEACHER" && <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{row.teacherName}</td>}
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{row.examTitle}{row.isSupplementary && <span className="ml-1 text-[9px] text-blue-500 font-bold">[SUSULAN]</span>}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full bg-${statusInfo.color}-50 dark:bg-${statusInfo.color}-500/10 text-${statusInfo.color}-700 dark:text-${statusInfo.color}-400 border border-${statusInfo.color}-200 dark:border-${statusInfo.color}-500/20 text-[10px] font-bold whitespace-nowrap`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black text-base ${row.score !== null ? (row.score >= 75 ? "text-emerald-600 dark:text-emerald-400" : row.score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400") : "text-slate-500 dark:text-slate-400"}`}>
                        {row.score !== null ? row.score : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Total: {filtered.length} baris rekap nilai</p>
    </div>
  );
}
