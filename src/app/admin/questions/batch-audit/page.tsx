"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileCheck2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowLeft,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Search,
  Eye,
  Send,
  HelpCircle,
} from "lucide-react";

export default function BatchAuditPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [auditing, setAuditing] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      setAuditData(null);
      setSelectedResult(null);
    }
  };

  const handleRunAudit = async () => {
    if (files.length === 0) {
      alert("Silakan pilih minimal 1 file soal (bisa pilih puluhan file .docx / .xlsx sekaligus).");
      return;
    }

    setAuditing(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/admin/questions/batch-audit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan audit soal");

      setAuditData(data);
    } catch (err: any) {
      alert("Kesalahan audit: " + err.message);
    } finally {
      setAuditing(false);
    }
  };

  const filteredResults = auditData?.results?.filter((r: any) =>
    r.fileName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/questions"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-6 h-6 text-blue-600" />
                <span>Automated Batch Question Quality Auditor</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Pemeriksaan kualitas massal untuk puluhan file soal guru (Word / Excel) dalam hitungan detik
              </p>
            </div>
          </div>

          <Link
            href="/admin/questions/import"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition"
          >
            Buka Form Impor Satuan
          </Link>
        </div>

        {/* Upload Zone */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border-2 border-dashed border-blue-200 dark:border-blue-900/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Pilih / Drag & Drop 70 File Soal Sekaligus
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung format Microsoft Word (<code>.docx</code>) dan Excel (<code>.xlsx</code> / <code>.csv</code>)
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Pilih File Dari Komputer (Multi-Select)</span>
              <input
                type="file"
                multiple
                accept=".docx,.xlsx,.xls,.csv"
                onChange={handleFileSelection}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <button
                onClick={handleRunAudit}
                disabled={auditing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
              >
                {auditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memeriksa {files.length} File Soal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Jalankan Audit Kualitas ({files.length} File)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {files.length > 0 && !auditData && (
            <div className="text-xs text-slate-500 pt-2">
              {files.length} file dipilih. Klik <strong>Jalankan Audit Kualitas</strong> untuk memulai peninjauan.
            </div>
          )}
        </div>

        {/* Audit Results Dashboard */}
        {auditData && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Total File Diperiksa</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {auditData.totalFiles} File
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 shadow-xs">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  🟢 Lolos Uji (Valid 100%)
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {auditData.summary.valid} File
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 shadow-xs">
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  🟡 Peringatan (Warning)
                </div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {auditData.summary.warning} File
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 shadow-xs">
                <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                  🔴 Kritis (Error / Butuh Perbaikan)
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {auditData.summary.error} File
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div className="font-bold text-sm">Daftar Hasil Audit Per File Guru</div>
                <div className="relative w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter nama file mapel..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 w-10">No</th>
                      <th className="py-3 px-4">Nama File Soal</th>
                      <th className="py-3 px-4 w-28 text-center">Jumlah Soal</th>
                      <th className="py-3 px-4 w-32 text-center">Status Audit</th>
                      <th className="py-3 px-4">Temuan & Catatan Kualitas</th>
                      <th className="py-3 px-4 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredResults.map((res: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono text-center">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>{res.fileName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {(res.fileSize / 1024).toFixed(1)} KB
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          {res.totalQuestions} Soal
                        </td>
                        <td className="py-3 px-4 text-center">
                          {res.status === "VALID" ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Valid 100%
                            </span>
                          ) : res.status === "WARNING" ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Warning
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Butuh Revisi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {res.errors.length > 0 && (
                            <div className="text-rose-600 font-semibold space-y-0.5">
                              {res.errors.map((e: string, ei: number) => (
                                <div key={ei}>• {e}</div>
                              ))}
                            </div>
                          )}
                          {res.warnings.length > 0 && (
                            <div className="text-amber-600 space-y-0.5 mt-0.5">
                              {res.warnings.map((w: string, wi: number) => (
                                <div key={wi}>• {w}</div>
                              ))}
                            </div>
                          )}
                          {res.errors.length === 0 && res.warnings.length === 0 && (
                            <span className="text-emerald-600 font-medium">
                              Seluruh soal lengkap, kunci jawaban ada, dan opsi tersusun rapi.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedResult(res)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition"
                            title="Pratinjau Butir Soal"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Question Sample Preview Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Pratinjau: {selectedResult.fileName}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Menampilkan 3 butir soal sampel dari file</p>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedResult.questionsSample && selectedResult.questionsSample.length > 0 ? (
                  selectedResult.questionsSample.map((q: any, qi: number) => (
                    <div
                      key={qi}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Soal #{q.number || qi + 1}
                      </div>
                      <div
                        className="text-slate-700 dark:text-slate-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: q.content }}
                      />
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {q.options.map((opt: any, oi: number) => (
                            <div
                              key={oi}
                              className={`p-1.5 rounded-lg flex items-center gap-2 text-[11px] ${
                                opt.isCorrect
                                  ? "bg-emerald-100 text-emerald-900 font-bold border border-emerald-300"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <span className="w-5 font-mono font-bold">{opt.label || String.fromCharCode(65 + oi)}.</span>
                              <span dangerouslySetInnerHTML={{ __html: opt.content }} />
                              {opt.isCorrect && <span className="ml-auto text-emerald-600 text-[10px]">✓ KUNCI</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Tidak ada butir soal sampel yang dapat ditampilkan.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-xl transition"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
