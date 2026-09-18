"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  BookOpen,
  ArrowRight,
  BarChart3,
  Layers,
  Users,
  Award,
  RefreshCw,
} from "lucide-react";

interface ExamOverview {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  category: string;
  totalQuestions: number;
  totalEssayQuestions: number;
  totalSubmissions: number;
  totalEssayAnswers: number;
  aiGradedCount: number;
  teacherGradedCount: number;
  ungradedCount: number;
  hasPendingValidation: boolean;
  isFullyValidated: boolean;
}

export default function EssayGradingHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamOverview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "NEED_VALIDATION" | "COMPLETED" | "NO_ESSAY">("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/essay-grading");
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error("Gagal memuat daftar ujian:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPendingAi = exams.reduce((acc, e) => acc + e.aiGradedCount, 0);
  const totalValidated = exams.reduce((acc, e) => acc + e.teacherGradedCount, 0);
  const totalUngraded = exams.reduce((acc, e) => acc + e.ungradedCount, 0);

  const filteredExams = exams.filter((exam) => {
    const matchSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (filterTab === "NEED_VALIDATION") return exam.totalEssayQuestions > 0 && exam.hasPendingValidation;
    if (filterTab === "COMPLETED") return exam.totalEssayQuestions > 0 && exam.isFullyValidated;
    if (filterTab === "NO_ESSAY") return exam.totalEssayQuestions === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass p-6 sm:p-7 rounded-3xl border border-sky-300 bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-50 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-sky-300 text-xs font-black text-black shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Koreksi Pintar & Validasi AI Gemini</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Periksa Jawaban Siswa & Validasi Koreksi Esai
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
            Periksa hasil jawaban esai siswa yang telah dikoreksi secara otomatis oleh AI (nilai sudah otomatis masuk ke rekap nilai), validasi status resmi guru, atau sesuaikan catatan evaluasi bila diperlukan.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2.5 bg-white hover:bg-sky-50 text-black border border-sky-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-black ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border border-purple-200 bg-purple-50/50 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Koreksi AI (Nilai Aktif)</div>
            <div className="text-2xl font-black text-purple-950 mt-0.5">{totalPendingAi}</div>
            <div className="text-[11px] text-purple-600 font-medium">Nilai AI sudah masuk & siap ditinjau</div>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Tervalidasi Guru</div>
            <div className="text-2xl font-black text-emerald-950 mt-0.5">{totalValidated}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Nilai resmi telah disahkan</div>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Belum Dinilai</div>
            <div className="text-2xl font-black text-amber-950 mt-0.5">{totalUngraded}</div>
            <div className="text-[11px] text-amber-600 font-medium">Menunggu penilaian guru/AI</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: "Semua Ujian" },
            { id: "NEED_VALIDATION", label: `Perlu Validasi (${exams.filter((e) => e.hasPendingValidation && e.totalEssayQuestions > 0).length})` },
            { id: "COMPLETED", label: "Selesai Divalidasi" },
            { id: "NO_ESSAY", label: "Tanpa Soal Esai" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari judul ujian atau mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-600 font-bold">Memuat daftar asesmen & status koreksi esai...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="glass p-12 text-center rounded-3xl border border-slate-200 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-black text-sm text-slate-800">Tidak Ada Ujian Ditemukan</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Silakan ganti kata kunci pencarian atau tab filter di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((item) => {
            const hasEssays = item.totalEssayQuestions > 0;

            return (
              <div
                key={item.id}
                className={`glass p-5 rounded-2xl border transition flex flex-col justify-between shadow-xs hover:shadow-md ${
                  item.hasPendingValidation && hasEssays
                    ? "border-purple-300 hover:border-purple-400 bg-purple-50/10"
                    : "border-slate-200 hover:border-blue-300 bg-white"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {item.subject}
                    </span>

                    {hasEssays ? (
                      item.hasPendingValidation ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-700" />
                          <span>Dinilai AI (Aktif)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Tervalidasi Lengkap</span>
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        PG / Otomatis
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-black text-sm text-slate-900 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.totalSubmissions} Siswa</span>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.totalQuestions} Soal ({item.totalEssayQuestions} Esai)</span>
                      </span>
                    </div>
                  </div>

                  {/* Essay Grading Status Breakdown */}
                  {hasEssays ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Status Koreksi Esai:</span>
                        <span>{item.totalEssayAnswers} Lembar Masuk</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold">
                        <div className="p-1.5 rounded-lg bg-purple-100 text-purple-950 border border-purple-200">
                          <div>{item.aiGradedCount}</div>
                          <div className="text-[9px] font-medium text-purple-700">Dinilai AI</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-200">
                          <div>{item.teacherGradedCount}</div>
                          <div className="text-[9px] font-medium text-emerald-700">Valid Guru</div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-200">
                          <div>{item.ungradedCount}</div>
                          <div className="text-[9px] font-medium text-amber-700">Belum Nilai</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium italic">
                      Paket ujian ini berbasis penilaian otomatis sistem (Pilihan Ganda/Kompleks/Menjodohkan).
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                  {hasEssays ? (
                    <button
                      onClick={() => router.push(`/admin/exams/${item.id}/essay-grading`)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Periksa & Validasi Jawaban</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/admin/grades?examId=${item.id}`)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Lihat Rekap Nilai Siswa</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
