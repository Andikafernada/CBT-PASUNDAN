"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  X,
  FileText,
  Activity,
  Heart,
  Star,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function StudentComplianceReportPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Student Detail Drawer
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    fetchComplianceData();
  }, [selectedGroup, selectedRisk]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedGroup !== "ALL") params.append("groupId", selectedGroup);
      if (selectedRisk !== "ALL") params.append("risk", selectedRisk);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/reports/student-compliance?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplianceData();
  };

  const handleExportCSV = () => {
    if (!data?.students) return;

    const headers = [
      "NIS",
      "Nama Siswa",
      "Kelas / Rombel",
      "Total Mapel Dikerjakan",
      "Total Akumulasi Pelanggaran",
      "Total Terlambat Login",
      "Total Ujian Susulan",
      "Tingkat Risiko Siswa",
    ];

    const rows = data.students.map((s: any) => [
      `"${s.nis}"`,
      `"${s.name}"`,
      `"${s.groupName}"`,
      s.totalCompleted,
      s.totalViolations,
      s.totalLateCount,
      s.totalSupplementaryCount,
      s.riskLevel === "HIGH" ? "RISIKO TINGGI (BK)" : s.riskLevel === "MEDIUM" ? "PANTAUAN" : "DISIPLIN",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Kedisiplinan_Siswa_CBT_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Rekap Kedisiplinan & Pelanggaran Siswa
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg">
              Audit BK & Kesiswaan
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Akumulasi riwayat pelanggaran anti-cheat, keterlambatan login, dan ujian susulan lintas seluruh mata pelajaran.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor CSV / Excel</span>
          </button>

          <button
            onClick={() => router.push("/admin/print/student-compliance")}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Berita Acara BK (A4)</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Siswa Terdata</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {data?.stats?.totalStudents || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Seluruh rombel peserta ujian</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Disiplin & Bersih</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {data?.stats?.lowRiskCount || 0}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">0 pelanggaran & tepat waktu</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Perlu Pantauan</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {data?.stats?.mediumRiskCount || 0}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">1 - 4x pelanggaran / telat</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Risiko Tinggi (BK)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">
            {data?.stats?.highRiskCount || 0}
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1">≥5x pelanggaran / sering susulan</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Nama Siswa atau NIS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Rombel:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Kelas</option>
              {data?.groups?.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status Risiko:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="HIGH">Risiko Tinggi (≥5x / Telat)</option>
              <option value="MEDIUM">Pantauan (1-4x)</option>
              <option value="LOW">Disiplin & Bersih (0x)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Aggregated Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Identitas Siswa</th>
                <th className="py-3.5 px-4 font-bold">Kelas / Rombel</th>
                <th className="py-3.5 px-4 font-bold text-center">Mapel Diikuti</th>
                <th className="py-3.5 px-4 font-bold text-center">Akumulasi Pelanggaran</th>
                <th className="py-3.5 px-4 font-bold text-center">Riwayat Waktu</th>
                <th className="py-3.5 px-4 font-bold text-center">Tingkat Risiko</th>
                <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Memuat rekapitulasi audit siswa...</p>
                  </td>
                </tr>
              ) : !data?.students || data.students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold">Tidak Ada Data Siswa yang Sesuai Filter</p>
                  </td>
                </tr>
              ) : (
                data.students.map((student: any) => {
                  const isHigh = student.riskLevel === "HIGH";
                  const isMedium = student.riskLevel === "MEDIUM";

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{student.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NIS: {student.nis}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                          {student.groupName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        {student.totalCompleted} Mapel
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {student.totalViolations > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs ${
                              student.totalViolations >= 5
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>{student.totalViolations}x Strike</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>0 (Bersih)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {student.totalLateCount > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {student.totalLateCount}x Telat Login
                            </span>
                          )}
                          {student.totalSupplementaryCount > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {student.totalSupplementaryCount}x Susulan
                            </span>
                          )}
                          {student.totalLateCount === 0 && student.totalSupplementaryCount === 0 && (
                            <span className="text-[11px] text-slate-500 font-medium">Selalu Tepat Waktu</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isHigh ? (
                          <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase shadow-sm shadow-rose-600/30">
                            Risiko Tinggi (BK)
                          </span>
                        ) : isMedium ? (
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                            Perlu Pantauan
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                            Disiplin
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <span>Rincian</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Subject Breakdown & Violation Timeline Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Student Header */}
            <div className="flex items-start gap-3.5 mb-6 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-600/30 shrink-0">
                {selectedStudent.name?.charAt(0) || "S"}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">{selectedStudent.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>NIS: <strong className="text-slate-200">{selectedStudent.nis}</strong></span>
                  <span>•</span>
                  <span>Rombel: <strong className="text-slate-200">{selectedStudent.groupName}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Total Akumulasi: {selectedStudent.totalViolations}x Pelanggaran
                  </span>
                  {selectedStudent.riskLevel === "HIGH" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                      Rekomendasi Pembinaan BK
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Subject-by-Subject Audit Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Rincian Riwayat per Mata Pelajaran ({selectedStudent.subjectBreakdowns?.length || 0})</span>
              </h4>

              {selectedStudent.subjectBreakdowns?.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                  Siswa ini belum memulai mata pelajaran ujian apa pun.
                </div>
              ) : (
                selectedStudent.subjectBreakdowns?.map((sub: any, idx: number) => {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                    >
                      {/* Subject Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{sub.subjectName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">({sub.examTitle})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Jadwal: {formatDate(sub.scheduledStart)} ({formatTimestamp(sub.scheduledStart)})</span>
                            <span>•</span>
                            <span>Mulai Nyata: <strong className="text-slate-200">{formatDate(sub.actualStart)} {formatTimestamp(sub.actualStart)}</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-400">
                            Skor: {sub.score ?? "-"}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      {/* Badges: Time & Violations */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900 text-xs">
                        {sub.timeStatus === "SUPPLEMENTARY" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            🟣 Ujian Susulan (Beda Hari)
                          </span>
                        ) : sub.timeStatus === "LATE" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🟡 Terlambat Login ({sub.lateMinutes} Menit)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            🟢 Tepat Waktu
                          </span>
                        )}

                        {sub.violationCount > 0 ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            🔴 {sub.violationCount}x Pelanggaran
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            0 Pelanggaran
                          </span>
                        )}

                        {/* Student Reflection Info */}
                        {sub.reflection && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Kondisi Fisik: {sub.reflection.physicalState === "FIT" ? "🔥 Fit" : sub.reflection.physicalState === "UNWELL" ? "🩹 Kurang Fit" : "😊 Cukup"} • Kesiapan: {sub.reflection.readinessRate}⭐
                          </span>
                        )}
                      </div>

                      {/* Timestamped Violation Logs */}
                      {sub.violations && sub.violations.length > 0 && (
                        <div className="mt-2 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-1 text-[11px]">
                          <div className="font-bold text-rose-400 text-xs mb-1">Kronologi Pelanggaran Layar:</div>
                          {sub.violations.map((v: any, vIdx: number) => (
                            <div key={vIdx} className="text-slate-300 flex items-start gap-1.5">
                              <span className="font-mono text-rose-400 font-bold">[{formatTimestamp(v.timestamp)}]</span>
                              <span>{v.details || v.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
