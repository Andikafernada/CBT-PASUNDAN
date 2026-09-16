"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Layers,
  Sparkles,
  Loader2,
  Download,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Scale,
  AlignLeft,
} from "lucide-react";
import { MathContent } from "@/components/MathContent";

export default function ImportQuestionsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        if (data.subjects?.[0]?.id) setSelectedSubjectId(data.subjects[0].id);
      })
      .catch(console.error);
  }, []);

  const handleDownloadWordTemplate = () => {
    window.location.href = "/api/admin/questions/template-word";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedQuestions([]);
      setSuccessCount(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import/word", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses file soal");

      setParsedQuestions(data.questions || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!selectedSubjectId) {
      alert("Silakan pilih Mata Pelajaran tujuan penyimpanan terlebih dahulu.");
      return;
    }

    setImporting(true);
    let count = 0;

    try {
      for (const q of parsedQuestions) {
        const safeContent = (q.content && q.content.trim())
          ? q.content.trim()
          : (q.type === "MATCHING"
              ? "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan:"
              : `Soal Nomor ${q.number || count + 1}`);

        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            type: q.type || "MULTIPLE_CHOICE",
            content: safeContent,
            difficulty: q.difficulty || "MEDIUM",
            points: q.points || 1.0,
            options: q.options || [],
            matchingPairs: q.matchingPairs || [],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Soal #${q.number || count + 1}: ${errData.error || "Gagal disimpan"}`);
        }
        count++;
      }

      setSuccessCount(count);
      setParsedQuestions([]);
      setFile(null);
      alert(`✅ Berhasil menyimpan ${count} butir soal ke dalam Bank Soal!`);
      router.push("/admin/questions");
    } catch (err: any) {
      alert("Terjadi kesalahan saat menyimpan soal: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const getTypeBadge = (type: string, pairCount?: number) => {
    switch (type) {
      case "COMPLEX_MULTIPLE_CHOICE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <CheckSquare className="w-3.5 h-3.5 text-purple-600" /> PG Kompleks
          </span>
        );
      case "TRUE_FALSE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <Scale className="w-3.5 h-3.5 text-amber-600" /> Benar / Salah
          </span>
        );
      case "MATCHING":
        return (
          <span className="px-2.5 py-1 text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Menjodohkan {pairCount ? `(${pairCount} Pasangan)` : ""}
          </span>
        );
      case "ESSAY":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <AlignLeft className="w-3.5 h-3.5 text-emerald-600" /> Esai / Uraian
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-lg flex items-center gap-1.5 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Pilihan Ganda (PG)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-sky-200">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/questions"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-400 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Bank Soal</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-black tracking-tight mt-1">
            Import Bank Soal Microsoft Word (.docx)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unggah dokumen Microsoft Word (.docx) untuk memasukkan berbagai bentuk soal (PG, Pilihan Ganda Kompleks, Benar/Salah, Menjodohkan, Esai).
          </p>
        </div>

        {/* Download Empty Word Template */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadWordTemplate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Template Kosong (.docx)</span>
          </button>
        </div>
      </div>

      {/* Target Topic Selection */}
      <div className="glass p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-black uppercase tracking-wider mb-2">
            1. Pilih Mata Pelajaran Tujuan:
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        {/* Upload Box */}
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-black uppercase tracking-wider mb-2">
            2. Unggah File Dokumen Soal (.docx):
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-sky-200 hover:border-blue-500/60 rounded-2xl p-8 text-center transition bg-sky-50 relative">
            <input
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-black">
                  {file ? file.name : "Klik atau seret file Word (.docx) ke sini"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Mendukung soal PG, PG Kompleks, Benar/Salah, Menjodohkan, Esai, dan Rumus Matematika KaTeX ($f(x)=2x^2+5$)
                </p>
              </div>
            </div>
          </div>
        </div>

        {file && parsedQuestions.length === 0 && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleParse}
              disabled={parsing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menganalisis Dokumen Word...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Proses & Tampilkan Preview Soal</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successCount !== null && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="font-bold text-sm">Import Soal Berhasil!</div>
              <div className="text-xs text-emerald-400/80 mt-0.5">
                Sebanyak {successCount} butir soal telah berhasil disimpan ke database.
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/questions")}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            Review di Bank Soal
          </button>
        </div>
      )}

      {/* Preview Parsed Questions */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-4 rounded-2xl border border-sky-300 shadow-soft">
            <div>
              <div className="text-sm font-black text-slate-900">
                Hasil Analisis: {parsedQuestions.length} Butir Soal Terdeteksi
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-medium">
                Review butir soal, tipe soal, dan kunci jawaban sebelum disimpan ke Bank Soal.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setParsedQuestions([])}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs"
              >
                Batal
              </button>
              <button
                onClick={handleSaveToDatabase}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Bank Soal...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Semua ({parsedQuestions.length} Soal)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Breakdown Stats Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-sky-300 text-xs shadow-soft">
            <span className="font-black text-slate-800">Komposisi Soal:</span>
            <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 font-black border border-blue-200">
              PG: {parsedQuestions.filter(q => q.type === "MULTIPLE_CHOICE").length}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-purple-100 text-purple-900 font-black border border-purple-200">
              PG Kompleks: {parsedQuestions.filter(q => q.type === "COMPLEX_MULTIPLE_CHOICE").length}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black border border-amber-200">
              Benar/Salah: {parsedQuestions.filter(q => q.type === "TRUE_FALSE").length}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-950 font-black border border-indigo-300 flex items-center gap-1 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              Menjodohkan: {parsedQuestions.filter(q => q.type === "MATCHING").length}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-black border border-emerald-200">
              Esai: {parsedQuestions.filter(q => q.type === "ESSAY").length}
            </span>
          </div>

          <div className="space-y-4">
            {parsedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-sky-300 hover:border-sky-400 transition shadow-soft space-y-3"
              >
                <div className="flex items-center justify-between border-b border-sky-200 pb-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">Soal Nomor {q.number || idx + 1}</span>
                    {getTypeBadge(q.type, q.matchingPairs?.length)}
                  </div>
                  <span className="text-slate-600 font-bold">
                    Kunci Jawaban: <strong className="text-emerald-700 font-black">{q.correctAnswer || "Esai/Terlampir"}</strong>
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-900 leading-relaxed bg-sky-50/70 p-3.5 rounded-xl border border-sky-200">
                  <MathContent content={q.content} />
                </div>

                {/* Render Options if PG / MC / TF */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt: any, optIdx: number) => (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs ${
                          opt.isCorrect
                            ? "bg-emerald-50 border-2 border-emerald-400 text-emerald-950 font-bold"
                            : "bg-white border-sky-200 text-slate-900 font-semibold"
                        }`}
                      >
                        <span className="font-black">{opt.label || String.fromCharCode(65 + optIdx)}.</span>
                        <div className="flex-1">
                          <MathContent content={opt.content} />
                        </div>
                        {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Matching Pairs if Matching */}
                {q.matchingPairs && q.matchingPairs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-sky-200">
                    <div className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pasangan Menjodohkan ({q.matchingPairs.length} Pasangan):</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {q.matchingPairs.map((pair: any, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span className="w-5 h-5 rounded bg-indigo-200 text-indigo-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {pIdx + 1}
                            </span>
                            <span>{pair.premise}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-950 font-bold shadow-2xs">
                            <span className="text-indigo-500 font-black">➔</span>
                            <span>{pair.response}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
