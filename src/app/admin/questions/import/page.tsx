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
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            type: q.type || "MULTIPLE_CHOICE",
            content: q.content,
            difficulty: q.difficulty || "MEDIUM",
            points: q.points || 1.0,
            options: q.options || [],
            matchingPairs: q.matchingPairs || [],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Gagal menyimpan butir soal #${count + 1}`);
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "COMPLEX_MULTIPLE_CHOICE":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded flex items-center gap-1">
            <CheckSquare className="w-3 h-3" /> PG Kompleks (MC)
          </span>
        );
      case "TRUE_FALSE":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded flex items-center gap-1">
            <Scale className="w-3 h-3" /> Benar / Salah (T/F)
          </span>
        );
      case "MATCHING":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 rounded flex items-center gap-1">
            <Layers className="w-3 h-3" /> Menjodohkan
          </span>
        );
      case "ESSAY":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded flex items-center gap-1">
            <AlignLeft className="w-3 h-3" /> Esai / Uraian
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Pilihan Ganda (PG)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            1. Pilih Mata Pelajaran Tujuan:
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        {/* Upload Box */}
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            2. Unggah File Dokumen Soal (.docx):
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center transition bg-slate-950/40 relative">
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
                <p className="text-sm font-bold text-slate-900 dark:text-white">
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
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Hasil Analisis: {parsedQuestions.length} Butir Soal Terdeteksi
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review butir soal, tipe soal, dan kunci jawaban sebelum disimpan ke database.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setParsedQuestions([])}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveToDatabase}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50"
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

          <div className="space-y-4">
            {parsedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-200 dark:border-slate-700 transition shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400">Soal Nomor {q.number || idx + 1}</span>
                    {getTypeBadge(q.type)}
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Kunci Jawaban: <strong className="text-emerald-400">{q.correctAnswer || "Esai/Terlampir"}</strong>
                  </span>
                </div>

                <div className="text-sm text-slate-100 leading-relaxed bg-slate-950/40 p-3 rounded-xl">
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
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold"
                            : "bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="font-bold">{opt.label || String.fromCharCode(65 + optIdx)}.</span>
                        <div className="flex-1">
                          <MathContent content={opt.content} />
                        </div>
                        {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Matching Pairs if Matching */}
                {q.matchingPairs && q.matchingPairs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Pasangan Menjodohkan:</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.matchingPairs.map((pair: any, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-4"
                        >
                          <span className="font-semibold text-slate-900 dark:text-white">{pair.premise}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-indigo-300 font-semibold">{pair.response}</span>
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
