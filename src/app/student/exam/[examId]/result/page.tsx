"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Sparkles,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/student/exams`);
      if (res.ok) {
        const data = await res.json();
        const curExam = data.exams.find((e: any) => e.id === examId);
        if (curExam) {
          setResultData(curExam);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-800 dark:text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Memuat hasil ujian Anda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative transition-colors duration-150">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4 shadow-sm">
          <Award className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-200 dark:border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ujian Berhasil Diselesaikan</span>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
          {resultData?.title || "Ujian Berbasis Komputer"}
        </h1>
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-6">{resultData?.subject}</p>

        {/* Score Card / Heartfelt Appreciation Card */}
        {resultData?.showResult ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 mb-6 shadow-inner">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
              Perolehan Nilai Akhir
            </div>
            <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 my-2 tracking-tight">
              {resultData?.score ?? 0}
            </div>
            <div className="text-[11px] text-slate-400">Skala Penilaian 0 - 100</div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 mb-6 text-center space-y-2">
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              Alhamdulillah, Jawaban Anda Telah Tersimpan!
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              &ldquo;Terima kasih sudah mengerjakan ujian dengan bersungguh-sungguh dan jujur. Semoga hasilnya sesuai dengan apa yang ananda ikhtiarkan.&rdquo;
            </p>
            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
              📋 Nilai dan hasil evaluasi akan diumumkan oleh Bapak/Ibu Guru pengampu.
            </div>
          </div>
        )}

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 gap-3 text-left mb-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Total Soal</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{resultData?.totalQuestions || 0} Soal</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Durasi</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{resultData?.durationMinutes || 0} Menit</div>
          </div>
        </div>

        <button
          onClick={() => router.push("/student/dashboard")}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard Siswa</span>
        </button>
      </div>
    </div>
  );
}
