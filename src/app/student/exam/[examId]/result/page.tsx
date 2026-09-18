"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Layers,
  MessageSquare,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
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
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text
          x="70"
          y="65"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="30"
          fontWeight="900"
          fill="#000000"
        >
          {score}
        </text>
        <text
          x="70"
          y="88"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight="700"
          fill="#000000"
        >
          dari 100
        </text>
      </svg>
      <span className="badge-info text-xs px-3 py-1 font-black">
        {score >= 85 ? "Sangat Baik" : score >= 70 ? "Baik" : score >= 55 ? "Cukup" : "Perlu Bimbingan"}
      </span>
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

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const examRes = await fetch(`/api/student/exams`);
      if (examRes.ok) {
        const data = await examRes.json();
        const curExam = data.exams.find((e: any) => e.id === examId);
        if (curExam) setResultData(curExam);
      }
      try {
        const detailRes = await fetch(`/api/student/exams/${examId}/result`);
        if (detailRes.ok) {
          const d = await detailRes.json();
          setDetail(d);
        }
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 flex items-center justify-center text-black font-bold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-black text-black">
            Memuat hasil ujian...
          </span>
        </div>
      </div>
    );
  }

  const score = resultData?.score ?? 0;
  const motivasi =
    score >= 85
      ? "🌟 Luar biasa! Kerja kerasmu membuahkan hasil yang membanggakan. Terus pertahankan!"
      : score >= 70
      ? "👏 Bagus! Nilaimu sudah baik. Sedikit lagi menuju hasil yang sempurna!"
      : score >= 55
      ? "💪 Cukup baik. Pelajari kembali materi yang kurang dikuasai, kamu pasti bisa lebih baik!"
      : "📚 Jangan menyerah! Belajar lebih giat dan jadikan ini sebagai motivasi untuk bangkit!";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-black transition-colors duration-150">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-sky-100/90 backdrop-blur-xl border-b border-sky-300 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={() => router.push("/student/dashboard")}
          className="flex items-center gap-1.5 text-xs font-black text-black hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black" />
          <span>Dashboard Siswa</span>
        </button>
        <span className="text-xs font-black text-black">
          Hasil Ujian Siswa
        </span>
        <ThemeToggle />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Header Card */}
        <div className="glass p-6 text-center shadow-soft border border-sky-300">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-200 border border-sky-300 text-black text-xs font-black mb-4">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Ujian Berhasil Diselesaikan</span>
          </div>
          <h1 className="text-lg font-black text-black mb-1 tracking-tight leading-tight">
            {resultData?.title || "Ujian Berbasis Komputer"}
          </h1>
          <p className="text-xs font-black text-black underline">
            {resultData?.subject}
          </p>
        </div>

        {/* Score Display */}
        {resultData?.showResult ? (
          <div className="glass p-6 flex flex-col items-center gap-4 shadow-soft border border-sky-300">
            <ScoreRing score={score} />
            <p className="text-xs text-black text-center leading-relaxed font-bold px-4">
              {motivasi}
            </p>
          </div>
        ) : (
          <div className="glass p-6 text-center space-y-3 shadow-soft border border-sky-300">
            <div className="w-14 h-14 rounded-2xl bg-sky-200 border border-sky-300 flex items-center justify-center text-black mx-auto shadow-sm">
              <Award className="w-8 h-8 text-black" />
            </div>
            <div className="text-sm font-black text-black">
              Alhamdulillah, Jawaban Tersimpan!
            </div>
            <p className="text-xs text-black leading-relaxed font-bold">
              &ldquo;Terima kasih sudah mengerjakan ujian dengan bersungguh-sungguh dan jujur. Semoga hasilnya sesuai dengan yang ananda ikhtiarkan.&rdquo;
            </p>
            <div className="pt-2 text-[11px] text-black font-semibold border-t border-sky-200">
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
              value: `${resultData?.totalQuestions || 0} Soal`,
            },
            {
              icon: Clock,
              label: "Durasi Ujian",
              value: `${resultData?.durationMinutes || 0} Menit`,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass p-4 shadow-soft border border-sky-300">
              <div className="flex items-center gap-1.5 text-xs text-black mb-2 font-black">
                <Icon className="w-3.5 h-3.5 text-black" />
                <span>{label}</span>
              </div>
              <div className="text-base font-black text-black">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* AI Essay Feedback (if detail available) */}
        {detail?.essayAnswers && detail.essayAnswers.length > 0 && (
          <div className="glass p-5 space-y-4 shadow-soft border border-sky-300">
            <h2 className="text-sm font-black text-black flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-black" />
              Umpan Balik Esai (AI Grader)
            </h2>
            {detail.essayAnswers.map((a: any, i: number) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white border border-sky-200 space-y-2"
              >
                <div className="text-xs font-black text-black line-clamp-2">
                  {i + 1}. {a.question}
                </div>
                <div className="text-xs text-black font-semibold">
                  <span>Jawaban: </span>
                  {a.answer || (
                    <span className="italic text-black">(kosong)</span>
                  )}
                </div>
                {a.feedback && (
                  <div className="p-2.5 rounded-lg bg-sky-100 border border-sky-300 text-xs text-black font-bold">
                    💬 {a.feedback}
                  </div>
                )}
                {a.score !== undefined && (
                  <div className="text-right text-xs font-black text-black">
                    Skor: {a.score}/{a.maxScore}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.push("/student/dashboard")}
          className="w-full py-3.5 btn-primary justify-center text-sm font-black shadow-glow"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
          <span className="text-black font-black">Kembali ke Dashboard Siswa</span>
        </button>

        {/* Footer Branding */}
        <div className="text-center pt-2 text-xs text-black font-semibold">
          <div className="font-bold text-black">Navin CBT &bull; Digital Assessment Platform</div>
          <div className="text-[11px] text-black mt-0.5">
            &copy; 2026 Navin CBT by <span className="font-black text-black">Navins Dev</span> &bull; Bandung, Indonesia
          </div>
        </div>
      </div>
    </div>
  );
}
