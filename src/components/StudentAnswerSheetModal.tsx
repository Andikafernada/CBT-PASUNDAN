"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  BookOpen,
  User,
  GraduationCap,
  Loader2,
  Printer,
  FileText,
  Sparkles,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  sessionId: string | null;
  studentName?: string;
}

export function StudentAnswerSheetModal({
  isOpen,
  onClose,
  examId,
  sessionId,
  studentName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "UNANSWERED">("ALL");

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchDetail();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, sessionId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/exams/${examId}/sessions/${sessionId}/answers`);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal memuat rincian jawaban siswa");
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const questions = data?.questions || [];
  const filteredQuestions = questions.filter((q: any) => {
    if (filter === "CORRECT") return q.studentAnswer.isCorrect;
    if (filter === "INCORRECT") return q.studentAnswer.isAnswered && !q.studentAnswer.isCorrect;
    if (filter === "UNANSWERED") return !q.studentAnswer.isAnswered;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Lembar Analisis Jawaban Siswa
                </h3>
                {data?.summary && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      data.summary.score >= 75
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    Nilai: {data.summary.score.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data?.session?.student?.name || studentName || "Peserta Ujian"} • NIS:{" "}
                {data?.session?.student?.nis || "-"} • Kelas: {data?.session?.student?.group || "-"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-xs font-semibold">Memuat rincian 40 butir jawaban siswa...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Total Soal</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">
                    {data.summary.totalQuestions}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {data.summary.correctCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[11px] text-rose-700 font-bold flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Salah
                  </div>
                  <div className="text-xl font-black text-rose-700 mt-0.5">
                    {data.summary.incorrectCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-[11px] text-amber-700 font-bold flex items-center justify-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Kosong
                  </div>
                  <div className="text-xl font-black text-amber-700 mt-0.5">
                    {data.summary.unansweredCount}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                {[
                  { key: "ALL", label: `Semua Soal (${data.summary.totalQuestions})` },
                  { key: "CORRECT", label: `✅ Benar (${data.summary.correctCount})` },
                  { key: "INCORRECT", label: `❌ Salah (${data.summary.incorrectCount})` },
                  { key: "UNANSWERED", label: `⚪ Kosong (${data.summary.unansweredCount})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setFilter(t.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filter === t.key
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map((q: any) => {
                  const isCorrect = q.studentAnswer.isCorrect;
                  const isAnswered = q.studentAnswer.isAnswered;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-xl border transition ${
                        !isAnswered
                          ? "bg-slate-50/70 border-slate-200"
                          : isCorrect
                          ? "bg-emerald-50/30 border-emerald-200"
                          : "bg-rose-50/30 border-rose-200"
                      }`}
                    >
                      {/* Question Item Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 ${
                              !isAnswered
                                ? "bg-slate-400"
                                : isCorrect
                                ? "bg-emerald-600"
                                : "bg-rose-600"
                            }`}
                          >
                            {q.number}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {q.type === "MULTIPLE_CHOICE"
                              ? "Pilihan Ganda"
                              : q.type === "COMPLEX_MULTIPLE_CHOICE"
                              ? "Pilihan Ganda Kompleks"
                              : q.type === "TRUE_FALSE"
                              ? "Benar / Salah"
                              : q.type === "MATCHING"
                              ? "Menjodohkan"
                              : q.type === "ESSAY"
                              ? "Esai / Uraian"
                              : "Soal Ujian"}
                          </span>
                        </div>

                        <div>
                          {!isAnswered ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                              Tidak Dijawab
                            </span>
                          ) : isCorrect ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Benar (+{q.maxScore})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Salah (0)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Body */}
                      <div className="text-slate-900 text-sm font-medium leading-relaxed mb-4">
                        <MathContent content={q.content} />
                        {q.imageUrl && (
                          <div className="mt-3">
                            <img
                              src={q.imageUrl}
                              alt="Lampiran Soal"
                              className="max-h-56 rounded-lg border border-slate-200 object-contain mx-auto"
                            />
                          </div>
                        )}
                      </div>

                      {/* Options Breakdown */}
                      <div className="space-y-2 mt-3">
                        {q.options.map((opt: any) => {
                          const isStudentChoice = opt.isSelected;
                          const isKey = opt.isCorrect;

                          let cardStyle = "bg-white border-slate-200 text-slate-700";
                          let pillStyle = "bg-slate-100 text-slate-700 border-slate-300";
                          let badgeText = null;

                          if (isStudentChoice && isKey) {
                            // Student chose right
                            cardStyle = "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-400";
                            pillStyle = "bg-emerald-600 text-white font-bold";
                            badgeText = "✓ Jawaban Siswa (Benar)";
                          } else if (isStudentChoice && !isKey) {
                            // Student chose wrong
                            cardStyle = "bg-rose-50 border-rose-400 text-rose-950 font-bold ring-1 ring-rose-400";
                            pillStyle = "bg-rose-600 text-white font-bold";
                            badgeText = "✗ Jawaban Siswa (Salah)";
                          } else if (!isStudentChoice && isKey) {
                            // The actual answer key
                            cardStyle = "bg-emerald-50/60 border-emerald-300 text-emerald-900 font-semibold";
                            pillStyle = "bg-emerald-100 text-emerald-800 border-emerald-400 font-bold";
                            badgeText = "★ Kunci Jawaban Benar";
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm ${cardStyle}`}
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${pillStyle}`}
                                >
                                  {opt.key}
                                </span>
                                <div className="pt-0.5 flex-1">
                                  <MathContent content={opt.content} />
                                </div>
                              </div>
                              {badgeText && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                    badgeText.includes("Benar")
                                      ? "bg-emerald-200/80 text-emerald-900 border border-emerald-300"
                                      : "bg-rose-200/80 text-rose-900 border border-rose-300"
                                  }`}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Matching Answer Display */}
                      {q.type === "MATCHING" && q.matchingPairs && q.matchingPairs.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-[11px] font-bold text-indigo-900 mb-1 flex items-center justify-between">
                            <span>Pasangan Jawaban Siswa vs Kunci:</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Poin Diperoleh: {q.studentAnswer.scoreAwarded} / {q.maxScore}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {q.matchingPairs.map((pair: any, pIdx: number) => {
                              const isPairCorrect = pair.isCorrect;
                              return (
                                <div
                                  key={pair.id || pIdx}
                                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                                    isPairCorrect
                                      ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                                      : "bg-rose-50/70 border-rose-300 text-rose-950"
                                  }`}
                                >
                                  <div className="flex-1 font-semibold">
                                    <span className="font-bold text-slate-700 mr-1.5">{pIdx + 1}.</span>
                                    {pair.premise}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <div className="text-[10px] text-slate-500 font-medium">Dipasangkan Siswa:</div>
                                      <div className="font-bold">{pair.studentResponse}</div>
                                      {!isPairCorrect && (
                                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                          Kunci: {pair.correctResponse}
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                        isPairCorrect
                                          ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                                          : "bg-rose-200 text-rose-900 border border-rose-300"
                                      }`}
                                    >
                                      {isPairCorrect ? "✓ Benar" : "✗ Salah"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Essay Answer Display */}
                      {q.type === "ESSAY" && (
                        <div className="mt-3 space-y-2">
                          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="text-[11px] font-bold text-blue-900 mb-1 flex items-center justify-between">
                              <span>Jawaban Teks Siswa:</span>
                              <span className="text-[10px] text-blue-700 font-medium">
                                Skor: {q.studentAnswer.scoreAwarded} / {q.maxScore}
                              </span>
                            </div>
                            <div className="text-xs text-slate-800 whitespace-pre-wrap font-medium">
                              {q.studentAnswer.textAnswer || <span className="italic text-slate-400">(Kosong / Tidak dijawab)</span>}
                            </div>
                          </div>

                          {q.studentAnswer.teacherFeedback && (
                            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
                              <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                              <div className="leading-relaxed">
                                <span className="font-bold mr-1">Evaluasi AI / Guru:</span>
                                {q.studentAnswer.teacherFeedback}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            SMK Pasundan 2 Bandung • Evaluasi Otomatis CBT
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
