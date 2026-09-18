"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Clock,
  ArrowLeft,
  Sparkles,
  Layers,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function ScoreRing({ score }: { score: number }) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, safeScore)) / 100;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#bae6fd"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#0284c7"
          strokeWidth="12"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          className="transition-all duration-1000 ease-out"
        />
        <text
          x="70"
          y="76"
          textAnchor="middle"
          className="text-2xl font-black fill-slate-900"
          fontSize="24"
        >
          {Math.round(safeScore)}
        </text>
      </svg>
      <span className="text-xs font-black text-slate-700">Nilai Akhir</span>
    </div>
  );
}

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const [examRes, detailRes] = await Promise.allSettled([
        fetch(`/api/student/exams`),
        fetch(`/api/student/exams/${examId}/result`),
      ]);

      if (examRes.status === "fulfilled" && examRes.value.ok) {
        const data = await examRes.value.json();
        const curExam = data.exams?.find((e: any) => e.id === examId);
        if (curExam) setResultData(curExam);
      }

      if (detailRes.status === "fulfilled" && detailRes.value.ok) {
        const d = await detailRes.value.json();
        setDetail(d);
      }
    } catch (e) {
      console.error("Error loading exam result:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetExam = async () => {
    if (!confirm("Reset sesi ujian ini agar dapat diuji coba ulang dari awal?")) return;
    try {
      setIsResetting(true);
      const res = await fetch(`/api/student/exams/${examId}/reset`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        router.push(`/student/exam/${examId}`);
      } else {
        alert(data.error || "Gagal me-reset sesi ujian");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 flex items-center justify-center text-slate-900 font-bold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-black text-slate-800">
            Memuat hasil ujian...
          </span>
        </div>
      </div>
    );
  }

  const isSuperReviewer = Boolean(detail?.isSuperReviewer || resultData?.isSuperReviewer);
  const score = detail?.score ?? resultData?.session?.score ?? resultData?.score ?? 0;
  const isShowResult = isSuperReviewer ? true : Boolean(detail?.showResult ?? resultData?.showResult ?? true);

  // Safely extract subject title/string (Avoid React object rendering crash)
  const rawSubject = detail?.subject ?? resultData?.subject;
  const subjectName = typeof rawSubject === "object" && rawSubject !== null
    ? (rawSubject.name || rawSubject.code || "Mata Pelajaran")
    : (rawSubject || "Mata Pelajaran");

  const examTitle = detail?.title || resultData?.title || "Ujian Berbasis Komputer";
  const totalQuestions = detail?.totalQuestions ?? resultData?.questionCount ?? resultData?.totalQuestions ?? 0;
  const durationMinutes = detail?.durationMinutes ?? resultData?.durationMinutes ?? 0;

  const motivasi =
    score >= 85
      ? "🌟 Luar biasa! Kerja kerasmu membuahkan hasil yang membanggakan. Terus pertahankan!"
      : score >= 70
      ? "👏 Bagus! Nilaimu sudah baik. Sedikit lagi menuju hasil yang sempurna!"
      : score >= 55
      ? "💪 Cukup baik. Pelajari kembali materi yang kurang dikuasai, kamu pasti bisa lebih baik!"
      : "📚 Jangan menyerah! Belajar lebih giat dan jadikan ini sebagai motivasi untuk bangkit!";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-slate-900 transition-colors duration-150">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-sky-100/90 backdrop-blur-xl border-b border-sky-300 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.push("/student/dashboard")}
          className="flex items-center gap-1.5 text-xs font-black text-slate-900 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-900" />
          <span>Dashboard Siswa</span>
        </button>
        <span className="text-xs font-black text-slate-900">
          Hasil Ujian Siswa
        </span>
        <ThemeToggle />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* QC Mode Badge */}
        {isSuperReviewer && (
          <div className="p-3.5 rounded-2xl bg-purple-100/90 border border-purple-300 text-purple-950 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 font-black text-xs">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
              <span>Akun Super Siswa (QA / QC Mode)</span>
            </div>
            <button
              onClick={handleResetExam}
              disabled={isResetting}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Reset sesi agar bisa mengerjakan lagi dari soal awal"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Resetting..." : "Uji Ulang"}</span>
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="glass p-6 text-center shadow-soft border border-sky-300">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-200 border border-sky-300 text-slate-900 text-xs font-black mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Ujian Berhasil Diselesaikan</span>
          </div>
          <h1 className="text-lg font-black text-slate-900 mb-1 tracking-tight leading-tight">
            {examTitle}
          </h1>
          <p className="text-xs font-black text-sky-800 underline">
            {subjectName}
          </p>
        </div>

        {/* Score Display */}
        {isShowResult ? (
          <div className="glass p-6 flex flex-col items-center gap-4 shadow-soft border border-sky-300">
            <ScoreRing score={score} />
            <p className="text-xs text-slate-700 text-center leading-relaxed font-bold px-4">
              {motivasi}
            </p>
          </div>
        ) : (
          <div className="glass p-6 text-center space-y-3 shadow-soft border border-sky-300">
            <div className="w-14 h-14 rounded-2xl bg-sky-200 border border-sky-300 flex items-center justify-center text-slate-900 mx-auto shadow-sm">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-sm font-black text-slate-900">
              Alhamdulillah, Jawaban Tersimpan!
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              &ldquo;Terima kasih sudah mengerjakan ujian dengan bersungguh-sungguh dan jujur. Semoga hasilnya sesuai dengan yang ananda ikhtiarkan.&rdquo;
            </p>
            <div className="pt-2 text-[11px] text-slate-600 font-semibold border-t border-sky-200">
              📋 Nilai dan hasil evaluasi akan diumumkan oleh Bapak/Ibu Guru pengampu.
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: Layers,
              label: "Total Soal",
              value: `${totalQuestions} Soal`,
            },
            {
              icon: Clock,
              label: "Durasi Ujian",
              value: `${durationMinutes} Menit`,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass p-4 shadow-soft border border-sky-300">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 font-black">
                <Icon className="w-3.5 h-3.5 text-blue-600" />
                <span>{label}</span>
              </div>
              <div className="text-base font-black text-slate-900">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* AI Essay Feedback (if detail available) */}
        {detail?.essayAnswers && detail.essayAnswers.length > 0 && (
          <div className="glass p-5 space-y-4 shadow-soft border border-sky-300">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Umpan Balik Esai (AI Grader)
            </h2>
            {detail.essayAnswers.map((a: any, i: number) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white border border-sky-200 space-y-2"
              >
                <div className="text-xs font-black text-slate-900 line-clamp-2">
                  {i + 1}. {a.question}
                </div>
                <div className="text-xs text-slate-700 font-semibold">
                  <span>Jawaban: </span>
                  {a.answer || (
                    <span className="italic text-slate-400">(kosong)</span>
                  )}
                </div>
                {a.feedback && (
                  <div className="p-2.5 rounded-lg bg-sky-100 border border-sky-300 text-xs text-slate-800 font-bold">
                    💬 {a.feedback}
                  </div>
                )}
                {a.score !== undefined && (
                  <div className="text-right text-xs font-black text-emerald-700">
                    Skor: {a.score}/{a.maxScore}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back / QC Action Buttons */}
        <div className="space-y-2 pt-2">
          {isSuperReviewer && (
            <button
              onClick={handleResetExam}
              disabled={isResetting}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Mereset Sesi..." : "Reset Sesi & Uji Ulang Ujian Ini"}</span>
            </button>
          )}

          <button
            onClick={() => router.push("/student/dashboard")}
            className="w-full py-3.5 btn-primary justify-center text-sm font-black shadow-glow"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Dashboard Siswa</span>
          </button>
        </div>

        {/* Footer Branding */}
        <div className="text-center pt-2 text-xs text-slate-500 font-semibold">
          <div className="font-bold text-slate-700">Navin CBT &bull; Digital Assessment Platform</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            &copy; 2026 Navin CBT by <span className="font-black text-slate-700">Navins Dev</span> &bull; Bandung, Indonesia
          </div>
        </div>
      </div>
    </div>
  );
}
