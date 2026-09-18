"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Save,
  Search,
  Users,
  Award,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

export default function EssayGradingPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [loading, setLoading] = useState(true);
  const [isBatchGrading, setIsBatchGrading] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [essayQuestions, setEssayQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Grade inputs per answerId: { [answerId]: { score: number, feedback: string, saving: boolean, saved: boolean } }
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: number | string; feedback: string; saving: boolean; saved: boolean }>>({});

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/exams/${examId}/essay-grading`);
      const data = await res.json();
      if (res.ok) {
        setExam(data.exam);
        setEssayQuestions(data.essayQuestions || []);
        setAnswers(data.answers || []);

        // Initialize grade inputs
        const initial: Record<string, any> = {};
        (data.answers || []).forEach((a: any) => {
          initial[a.id] = {
            score: a.scoreAwarded !== null ? a.scoreAwarded : "",
            feedback: a.teacherFeedback || "",
            saving: false,
            saved: a.scoreAwarded !== null,
          };
        });
        setGradeInputs(initial);
      }
    } catch (err) {
      console.error("Gagal memuat data esai:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (answerId: string) => {
    const input = gradeInputs[answerId];
    if (!input || input.score === "") {
      alert("Masukkan nilai angka terlebih dahulu.");
      return;
    }

    const currentQ = essayQuestions[selectedQuestionIndex];
    const scoreVal = Number(input.score);
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > (currentQ?.maxScore || 100)) {
      alert(`Nilai harus di antara 0 dan ${currentQ?.maxScore || 100}`);
      return;
    }

    setGradeInputs((prev) => ({
      ...prev,
      [answerId]: { ...prev[answerId], saving: true },
    }));

    try {
      const res = await fetch(`/api/admin/exams/${examId}/essay-grading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId,
          scoreAwarded: scoreVal,
          teacherFeedback: input.feedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan nilai");

      setGradeInputs((prev) => ({
        ...prev,
        [answerId]: { ...prev[answerId], saving: false, saved: true },
      }));

      // Update local answers array
      setAnswers((prev) =>
        prev.map((ans) =>
          ans.id === answerId
            ? { ...ans, scoreAwarded: scoreVal, teacherFeedback: input.feedback, isAiGraded: false }
            : ans
        )
      );
    } catch (err: any) {
      alert(err.message);
      setGradeInputs((prev) => ({
        ...prev,
        [answerId]: { ...prev[answerId], saving: false },
      }));
    }
  };

  const handleApproveAllAi = async () => {
    const currentQ = essayQuestions[selectedQuestionIndex];
    const qAnswers = answers.filter((a) => a.questionId === currentQ?.id);
    const aiAnswersCount = qAnswers.filter((a) => a.isAiGraded).length;

    if (aiAnswersCount === 0) {
      alert("Tidak ada nilai esai AI yang perlu disahkan pada butir soal ini.");
      return;
    }

    if (!confirm(`Sahkan seluruh ${aiAnswersCount} nilai rekomendasi AI pada butir soal ini sebagai nilai resmi guru?`)) return;

    try {
      setIsApprovingAll(true);
      const res = await fetch(`/api/admin/exams/${examId}/essay-grading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_ALL_AI",
          questionId: currentQ?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengesahkan nilai AI");

      alert(`✅ ${data.message}`);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleBatchAiGrading = async (forceReGrade = false) => {
    const currentQ = essayQuestions[selectedQuestionIndex];
    const qAnswers = answers.filter((a) => a.questionId === currentQ?.id);
    const unGradedCount = qAnswers.filter((a) => a.scoreAwarded === null).length;

    const confirmMsg = forceReGrade
      ? `Jalankan AI Auto-Grader untuk SELURUH ${qAnswers.length} jawaban siswa pada soal ini? (Nilai sebelumnya akan ditimpa rekomendasi AI)`
      : `Jalankan AI Auto-Grader untuk ${unGradedCount} jawaban siswa yang belum dinilai pada soal ini?`;

    if (!confirm(confirmMsg)) return;

    try {
      setIsBatchGrading(true);
      const res = await fetch(`/api/admin/exams/${examId}/essay-grading`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BATCH_AI_GRADE",
          questionId: currentQ?.id,
          forceReGrade,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan koreksi AI");

      alert(`✅ ${data.message}`);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsBatchGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-black font-bold flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <span>Memuat data soal & jawaban esai...</span>
      </div>
    );
  }

  if (essayQuestions.length === 0) {
    return (
      <div className="glass p-8 text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-black text-black">Tidak Ada Soal Esai</h2>
        <p className="text-xs text-black font-medium">
          Ujian ini tidak memiliki butir soal bertipe Esai / Uraian.
        </p>
        <Link href="/admin/essay-grading" className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4">
          <ArrowLeft className="w-3.5 h-3.5 text-black" />
          <span className="text-black font-black">Kembali ke Pusat Periksa Jawaban</span>
        </Link>
      </div>
    );
  }

  const currentQ = essayQuestions[selectedQuestionIndex];
  const qAnswers = answers.filter((a) => a.questionId === currentQ?.id);

  // Extract unique groups
  const groups = Array.from(new Set(qAnswers.map((a) => a.student.group))).filter(Boolean);

  const filteredAnswers = qAnswers.filter((a) => {
    if (filterGroup !== "ALL" && a.student.group !== filterGroup) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = a.student.name.toLowerCase().includes(q);
      const matchNis = (a.student.nis || "").toLowerCase().includes(q);
      if (!matchName && !matchNis) return false;
    }
    return true;
  });

  const gradedCount = qAnswers.filter((a) => a.scoreAwarded !== null).length;
  const unGradedCount = qAnswers.length - gradedCount;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-300">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/essay-grading"
            className="p-2 rounded-xl bg-white border border-sky-300 text-black hover:bg-sky-100 transition shadow-xs"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-black border border-blue-300">
                KOREKSI ESAI & AI
              </span>
              <span className="text-xs text-black font-semibold">{exam?.subject}</span>
            </div>
            <h1 className="text-xl font-black text-black tracking-tight mt-0.5">
              Koreksi Esai & Uraian: {exam?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-black font-bold">
            Terkoreksi: <span className="font-black text-emerald-950">{gradedCount} / {qAnswers.length} Siswa</span>
          </div>

          {qAnswers.filter((a) => a.isAiGraded).length > 0 && (
            <button
              onClick={handleApproveAllAi}
              disabled={isApprovingAll}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Sahkan seluruh nilai rekomendasi AI untuk butir soal ini menjadi nilai resmi guru (Opsional, nilai AI sudah aktif)"
            >
              {isApprovingAll ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white" />
              )}
              <span>Sahkan Semua Nilai AI ({qAnswers.filter((a) => a.isAiGraded).length})</span>
            </button>
          )}

          {unGradedCount > 0 && (
            <button
              onClick={() => handleBatchAiGrading(false)}
              disabled={isBatchGrading}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              title="Koreksi otomatis jawaban yang belum dinilai menggunakan AI"
            >
              {isBatchGrading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengoreksi AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>🤖 Koreksi Yang Belum ({unGradedCount})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => handleBatchAiGrading(true)}
            disabled={isBatchGrading || qAnswers.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Jalankan kembali evaluasi AI Gemini 3.6 Flash untuk seluruh jawaban siswa pada butir soal ini"
          >
            {isBatchGrading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Mengevaluasi AI...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                <span>🔄 Koreksi Ulang AI (Semua)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Informational Banner on Auto-Grading & Approval */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-300 flex items-start gap-3 shadow-xs">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shrink-0 mt-0.5 shadow-sm">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1 text-black">
          <div className="font-black text-slate-900 text-sm flex items-center gap-2 flex-wrap">
            <span>Koreksi Esai Otomatis AI (Gemini 3.6 Flash)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide uppercase">
              Otomatis Terhitung
            </span>
          </div>
          <p className="font-semibold leading-relaxed text-slate-800">
            <strong>Nilai AI sudah otomatis masuk:</strong> Setiap kali siswa menyelesaikan ujian, sistem di latar belakang langsung mengoreksi esai menggunakan AI dan nilainya <strong>sudah otomatis terakumulasi ke Nilai Akhir &amp; Rekap Nilai</strong>. Guru tidak diwajibkan mengklik tombol &ldquo;Sahkan&rdquo; agar nilai masuk ke rekap.
          </p>
          <p className="font-normal text-[11px] leading-relaxed text-slate-600">
            Halaman ini adalah <strong>Konsol Pengawasan &amp; Override Guru</strong>: Anda dapat meninjau jawaban siswa, mengesahkan nilai rekomendasi AI, atau mengedit nilai &amp; memberikan feedback personal. Anda juga dapat menjalankan koreksi ulang AI sewaktu-waktu dengan tombol <em>&ldquo;Koreksi Ulang AI (Semua)&rdquo;</em> di atas.
          </p>
        </div>
      </div>

      {/* Tabs per Soal Esai */}
      <div className="flex flex-wrap gap-2">
        {essayQuestions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setSelectedQuestionIndex(idx)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition border shadow-xs flex items-center gap-2 cursor-pointer ${
              selectedQuestionIndex === idx
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-black border-sky-300 hover:bg-sky-50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Soal Esai #{idx + 1}</span>
            <span className="px-1.5 py-0.2 rounded bg-black/10 text-[10px]">
              Maks: {q.maxScore} Poin
            </span>
          </button>
        ))}
      </div>

      {/* Question Content & Rubric Box */}
      <div className="glass p-5 space-y-3 border border-sky-300">
        <div className="flex items-center justify-between pb-2 border-b border-sky-200">
          <div className="text-xs font-black text-black flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Pertanyaan Soal Esai #{selectedQuestionIndex + 1} (Bobot Maksimal: {currentQ?.maxScore} Poin)</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-sky-200 text-sm text-black font-medium leading-relaxed">
          <MathContent content={currentQ?.content || ""} />
        </div>

        {currentQ?.rubric && (
          <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-300 text-xs text-black space-y-1">
            <div className="font-black text-sky-950 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Pedoman Penilaian / Rubrik Acuan Koreksi AI & Guru:</span>
            </div>
            <div className="font-semibold text-black pl-5">
              {currentQ.rubric}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-black">Filter Kelas:</span>
          <button
            onClick={() => setFilterGroup("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              filterGroup === "ALL" ? "bg-black text-white border-black" : "bg-white text-black border-sky-300 hover:bg-sky-50"
            }`}
          >
            Semua Kelas ({qAnswers.length})
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                filterGroup === g ? "bg-black text-white border-black" : "bg-white text-black border-sky-300 hover:bg-sky-50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-black absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama atau NIS siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-sky-300 rounded-lg text-xs text-black font-semibold focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Student Submissions List */}
      <div className="space-y-4">
        {filteredAnswers.length === 0 ? (
          <div className="glass p-8 text-center text-xs text-black font-semibold">
            Tidak ada jawaban siswa yang sesuai dengan filter.
          </div>
        ) : (
          filteredAnswers.map((item, idx) => {
            const inputState = gradeInputs[item.id] || { score: "", feedback: "", saving: false, saved: false };
            const isGraded = item.scoreAwarded !== null;

            return (
              <div
                key={item.id}
                className={`glass p-5 border transition rounded-2xl space-y-3 ${
                  item.isAiGraded
                    ? "border-purple-300 bg-purple-50/20"
                    : isGraded
                    ? "border-emerald-300 bg-white"
                    : "border-amber-300 bg-amber-50/20"
                }`}
              >
                {/* Student Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-sky-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-xs font-black text-black">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-black text-black text-sm">{item.student.name}</span>
                      <span className="text-xs text-black font-medium ml-2">
                        NIS: {item.student.nis || item.student.username} &bull; Kelas: <strong>{item.student.group}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isAiGraded ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300 flex items-center gap-1" title="Nilai otomatis dari AI Gemini (sudah aktif dan terhitung ke nilai akhir siswa)">
                        <Sparkles className="w-3 h-3 text-purple-700" />
                        <span>Dinilai AI (Aktif)</span>
                      </span>
                    ) : isGraded ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-950 border border-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-700" />
                        <span>Nilai Guru</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>Belum Dinilai</span>
                      </span>
                    )}

                    {isGraded && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1">
                        <span>Skor: {item.scoreAwarded} / {currentQ?.maxScore}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Student's Answer */}
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-black">Jawaban yang Diketik Siswa:</div>
                  <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-black font-medium leading-relaxed whitespace-pre-wrap">
                    {item.textAnswer && item.textAnswer.trim() ? (
                      item.textAnswer
                    ) : (
                      <span className="italic text-gray-500">(Siswa tidak mengisi jawaban esai ini)</span>
                    )}
                  </div>
                </div>

                {/* Grading Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 pt-2 bg-white/70 p-3 rounded-xl border border-sky-200">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-black text-black">
                      {item.isAiGraded ? "Umpan Balik AI (Dapat Diedit):" : "Catatan Koreksi / Masukan untuk Siswa (Opsional):"}
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Penjelasan cukup baik, lengkapi dengan rumus..."
                      value={inputState.feedback}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGradeInputs((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], feedback: val, saved: false },
                        }));
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-xs text-black font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-black">
                        Nilai (Maks {currentQ?.maxScore}):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={currentQ?.maxScore || 100}
                        step="0.5"
                        placeholder="0"
                        value={inputState.score}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGradeInputs((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], score: val, saved: false },
                          }));
                        }}
                        className="w-24 px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-xs font-black text-black text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {item.isAiGraded && (
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(item.id)}
                        disabled={inputState.saving}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 self-end shadow-xs transition cursor-pointer"
                        title="Setujui dan sahkan nilai dari AI ini sebagai nilai resmi guru"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui Nilai AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveGrade(item.id)}
                      disabled={inputState.saving}
                      className="btn-primary py-2 px-4 flex items-center gap-1.5 self-end cursor-pointer"
                    >
                      {inputState.saving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span className="text-black font-black">Simpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-black" />
                          <span className="text-black font-black">
                            {inputState.saved ? "Perbarui Nilai" : "Simpan Nilai"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
