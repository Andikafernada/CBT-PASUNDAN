"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BarChart3,
  Users,
  Award,
  BookOpen,
  Sparkles,
  Zap,
  Plus,
  Clock,
  Send,
  Loader2,
  Layers,
  ChevronRight,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

export default function ItemAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "PSYCHOMETRICS">("ATTENDANCE");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Supplementary Exam Modal
  const [showSuppModal, setShowSuppModal] = useState(false);
  const [suppForm, setSuppForm] = useState({
    title: "",
    code: "",
    durationMinutes: 60,
    startTime: "",
    endTime: "",
    token: "SUSULAN",
    useParentQuestions: true,
  });
  const [creatingSupp, setCreatingSupp] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analysisRes, forceRes] = await Promise.all([
        fetch(`/api/admin/exams/${examId}/item-analysis`),
        fetch(`/api/admin/exams/${examId}/force-finish`),
      ]);

      if (analysisRes.ok) setData(await analysisRes.json());
      if (forceRes.ok) {
        const fData = await forceRes.json();
        setAttendanceData(fData);
        setSuppForm((prev) => ({
          ...prev,
          title: `Ujian Susulan: ${fData.exam?.title || ""}`,
          code: `SUS-${Date.now().toString().slice(-5)}`,
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceFinishOne = async (sessionId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghentikan paksa ujian siswa ini dan menghitung nilainya sekarang?")) return;
    try {
      setActionLoading(sessionId);
      const res = await fetch(`/api/admin/exams/${examId}/force-finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FORCE_FINISH_ONE", sessionId }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message);
        fetchData();
      } else {
        alert(d.error || "Gagal force finish");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceFinishAll = async () => {
    if (!confirm("Apakah Anda yakin ingin menghentikan paksa SEMUA siswa yang sedang mengerjakan ujian ini?")) return;
    try {
      setActionLoading("ALL");
      const res = await fetch(`/api/admin/exams/${examId}/force-finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FORCE_FINISH_ALL" }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message);
        fetchData();
      } else {
        alert(d.error || "Gagal force finish semua");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSupplementary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingSupp(true);
      const res = await fetch(`/api/admin/exams/${examId}/supplementary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suppForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal membuat ujian susulan");
      alert("✅ Ujian susulan berhasil dibuat!");
      setShowSuppModal(false);
      router.push("/admin/exams");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingSupp(false);
    }
  };

  const exportCSV = () => {
    if (!data || !data.items || data.items.length === 0) return;
    let csv = `Analisis Butir Soal - ${data.exam.title}\n`;
    csv += `Mata Pelajaran: ${data.exam.subject}, Peserta: ${data.totalParticipants}, Cronbach Alpha: ${data.cronbachAlpha} (${data.reliabilityCategory})\n\n`;
    csv += `No,Topik,Tingkat Kesukaran (P),Kategori Kesukaran,Daya Beda (D),Kategori Daya Beda,Rekomendasi Butir Soal\n`;
    data.items.forEach((item: any) => {
      csv += `${item.number},"${item.topicName}",${item.difficultyIndex},${item.difficultyCategory},${item.discriminationIndex},${item.discriminationCategory},${item.statusRecommendation}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Analisis_Butir_Soal_${data.exam.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const studentsList = attendanceData?.students || [];
  const summary = attendanceData?.summary || { total: 0, hadir: 0, sedangMengerjakan: 0, dipaksaSelesai: 0, waktuHabis: 0, tidakHadir: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/exams`}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Laporan & Rekap Ujian
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">{data?.exam?.code || attendanceData?.exam?.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              {data?.exam?.title || attendanceData?.exam?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSuppModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian Susulan</span>
          </button>
          {activeTab === "PSYCHOMETRICS" && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Analisis</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "ATTENDANCE"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Status Kehadiran & Nilai Peserta ({summary.total})</span>
        </button>
        <button
          onClick={() => setActiveTab("PSYCHOMETRICS")}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "PSYCHOMETRICS"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analisis Butir Soal & Psikometri ({data?.items?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: ATTENDANCE & GRADES */}
      {activeTab === "ATTENDANCE" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-emerald-400 flex items-center gap-1 mb-1 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hadir Selesai</span>
              </div>
              <div className="text-2xl font-black text-emerald-300">{summary.hadir}</div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-amber-400 flex items-center gap-1 mb-1 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Waktu Habis / Dipaksa</span>
              </div>
              <div className="text-2xl font-black text-amber-300">{summary.dipaksaSelesai + summary.waktuHabis}</div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-400 flex items-center gap-1 mb-1 text-[11px] font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Sedang Mengerjakan</span>
              </div>
              <div className="text-2xl font-black text-blue-300">{summary.sedangMengerjakan}</div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="text-rose-400 flex items-center gap-1 mb-1 text-[11px] font-bold">
                <XCircle className="w-3.5 h-3.5" />
                <span>Tidak Hadir (Susulan)</span>
              </div>
              <div className="text-2xl font-black text-rose-300">{summary.tidakHadir}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1 text-[11px] font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>Total Sasaran</span>
              </div>
              <div className="text-2xl font-black text-white">{summary.total}</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-white text-sm">Daftar Status & Nilai Peserta</div>
              {summary.sedangMengerjakan > 0 && (
                <button
                  onClick={handleForceFinishAll}
                  disabled={actionLoading === "ALL"}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Paksa Selesaikan Semua ({summary.sedangMengerjakan})</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <tr>
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">NIS</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Progres Jawaban</th>
                    <th className="py-3 px-3 text-right">Nilai Akhir</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {studentsList.map((row: any, i: number) => {
                    const isFinished = ["HADIR", "DIPAKSA_SELESAI", "WAKTU_HABIS"].includes(row.attendanceStatus);
                    return (
                      <tr key={row.student.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-500">{i + 1}</td>
                        <td className="py-3 px-3 text-slate-400">{row.student.nis || "-"}</td>
                        <td className="py-3 px-3 font-semibold text-white">{row.student.name}</td>
                        <td className="py-3 px-3 text-slate-300">{row.student.groupName}</td>
                        <td className="py-3 px-3 text-center">
                          {row.attendanceStatus === "HADIR" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              Hadir (Selesai)
                            </span>
                          ) : row.attendanceStatus === "DIPAKSA_SELESAI" ? (
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
                              Dipaksa Selesai
                            </span>
                          ) : row.attendanceStatus === "WAKTU_HABIS" ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              Waktu Habis
                            </span>
                          ) : row.attendanceStatus === "SEDANG_MENGERJAKAN" ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold animate-pulse">
                              Mengerjakan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                              Tidak Hadir
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {row.session ? `${row.session.answeredCount} / ${row.session.totalQuestions}` : "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm text-emerald-400">
                          {row.session?.score !== null && row.session?.score !== undefined ? row.session.score : "-"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {row.attendanceStatus === "SEDANG_MENGERJAKAN" && (
                            <button
                              onClick={() => handleForceFinishOne(row.session.id)}
                              disabled={actionLoading === row.session.id}
                              className="px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/30 rounded-lg text-[11px] font-semibold transition"
                            >
                              {actionLoading === row.session.id ? "Memproses..." : "Paksa Selesai"}
                            </button>
                          )}
                          {row.attendanceStatus === "TIDAK_HADIR" && (
                            <button
                              onClick={() => setShowSuppModal(true)}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition"
                            >
                              Ikutkan Susulan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PSYCHOMETRICS */}
      {activeTab === "PSYCHOMETRICS" && data && (
        <div className="space-y-6">
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Total Peserta Ujian</div>
                <div className="text-2xl font-bold text-white mt-0.5">{data.totalParticipants} Siswa</div>
                <div className="text-[10px] text-slate-500">Kelompok 27%: {data.upperGroupSize} Siswa</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Reliabilitas Cronbach&apos;s α</div>
                <div className="text-2xl font-bold text-purple-400 mt-0.5">{data.cronbachAlpha}</div>
                <div className="text-[10px] text-slate-400">{data.reliabilityCategory}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Rata-Rata Nilai</div>
                <div className="text-2xl font-bold text-white mt-0.5">{data.averageScore} / 100</div>
                <div className="text-[10px] text-slate-500">Tertinggi: {data.highestScore} • Terendah: {data.lowestScore}</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Status Kualitas Soal</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-bold">
                  <span className="text-emerald-400">{data.summary.countExcellent + data.summary.countGood} Baik</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400">{data.summary.countRevision} Revisi</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-rose-400">{data.summary.countDiscard} Dibuang</span>
                </div>
                <div className="text-[10px] text-slate-500">{data.items.length} Total Butir Soal</div>
              </div>
            </div>
          </div>

          {/* Item Analysis Detailed Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Tabel Analisis Psikometri per Butir Soal</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Indeks Kesukaran (P) & Daya Beda (D)</span>
            </div>

            {data.items.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Belum ada data siswa yang menyelesaikan ujian ini untuk dianalisis.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {data.items.map((item: any) => (
                  <div key={item.questionId} className="p-5 hover:bg-slate-800/30 transition space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 font-bold text-xs text-white flex items-center justify-center shrink-0">
                          {item.number}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-300">{item.topicName}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.correctCount} Siswa Benar • {item.incorrectCount} Siswa Salah
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] flex items-center gap-1.5">
                          <span className="text-slate-500 font-mono">P = {item.difficultyIndex}</span>
                          <span className="font-bold text-blue-400">({item.difficultyCategory})</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] flex items-center gap-1.5">
                          <span className="text-slate-500 font-mono">D = {item.discriminationIndex}</span>
                          <span className="font-bold text-emerald-400">({item.discriminationCategory})</span>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border ${
                            item.statusRecommendation === "SANGAT_BAIK" || item.statusRecommendation === "BAIK"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.statusRecommendation === "REVISI"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          <span>{item.statusRecommendation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 line-clamp-2">
                      <MathContent content={item.content} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Buat Ujian Susulan */}
      {showSuppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Buat Sesi Ujian Susulan</h3>
                <p className="text-xs text-slate-400">
                  Dikhususkan bagi {summary.tidakHadir} siswa yang tidak hadir pada jadwal utama
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSupplementary} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Judul Ujian Susulan</label>
                <input
                  type="text"
                  required
                  value={suppForm.title}
                  onChange={(e) => setSuppForm({ ...suppForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kode Ujian Baru</label>
                  <input
                    type="text"
                    required
                    value={suppForm.code}
                    onChange={(e) => setSuppForm({ ...suppForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    value={suppForm.durationMinutes}
                    onChange={(e) => setSuppForm({ ...suppForm, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Token Akses Ujian Susulan</label>
                <input
                  type="text"
                  required
                  value={suppForm.token}
                  onChange={(e) => setSuppForm({ ...suppForm, token: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suppForm.useParentQuestions}
                    onChange={(e) => setSuppForm({ ...suppForm, useParentQuestions: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="text-slate-300 font-medium">
                    Gunakan butir soal yang sama persis dengan ujian utama
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSuppModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingSupp}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingSupp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Terbitkan Ujian Susulan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
