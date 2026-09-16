"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileCheck2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Save,
  Database,
  BookOpen,
  CheckSquare,
  Scale,
  AlignLeft,
  Eye,
  Check,
  AlertCircle,
  HelpCircle
} from "lucide-react";

export default function McpNormalizerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [savingToBank, setSavingToBank] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [normalizeResult, setNormalizeResult] = useState<any>(null);
  const [saveSuccessResult, setSaveSuccessResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Subject list for direct Bank Soal saving
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [showQuestionPreview, setShowQuestionPreview] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((res) => res.json())
      .then((data) => {
        const subs = data.subjects || [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubjectId(subs[0].id);
      })
      .catch(console.error);
  }, []);

  const handleSelectFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
      setError("Harap pilih file dengan format Word (.docx).");
      return;
    }
    setFile(selectedFile);
    setAuditResult(null);
    setNormalizeResult(null);
    setSaveSuccessResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  // Test with built-in sample file
  const handleLoadSample = async () => {
    try {
      setError(null);
      const res = await fetch("/Contoh_Soal_Bergambar.docx");
      if (!res.ok) throw new Error("File sampel tidak ditemukan di server");
      const blob = await res.blob();
      const sampleFile = new File([blob], "Contoh_Soal_Bergambar.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      handleSelectFile(sampleFile);
    } catch (err: any) {
      setError("Gagal memuat file sampel: " + err.message);
    }
  };

  const handleAudit = async () => {
    if (!file) return;
    try {
      setAuditing(true);
      setError(null);
      setSaveSuccessResult(null);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/mcp/audit", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan audit MCP");
      setAuditResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuditing(false);
    }
  };

  const handleNormalizeAndDownload = async () => {
    if (!file) return;
    try {
      setNormalizing(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/mcp/normalize", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal melakukan normalisasi file via MCP");
      }

      const qCount = res.headers.get("X-MCP-Questions") || "35";
      const imgCount = res.headers.get("X-MCP-Images") || "0";
      const preserved = res.headers.get("X-MCP-Preserved") === "true";
      const fixedCount = res.headers.get("X-MCP-Fixed") || "0";
      const msg = decodeURIComponent(res.headers.get("X-MCP-Message") || "Normalisasi sukses");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const downloadName = `${baseName}_STANDAR_CBT.docx`;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setNormalizeResult({
        totalQuestions: qCount,
        imagesCount: imgCount,
        imagesPreserved: preserved,
        fixedCount,
        message: msg,
        fileName: downloadName,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setNormalizing(false);
    }
  };

  const handleSaveDirectToBank = async () => {
    if (!file) return;
    if (!selectedSubjectId) {
      alert("Silakan pilih Mata Pelajaran tujuan penyimpanan terlebih dahulu.");
      return;
    }

    const selectedSubObj = subjects.find((s) => s.id === selectedSubjectId);
    const subName = selectedSubObj ? `${selectedSubObj.name} (${selectedSubObj.code})` : "Mata Pelajaran";

    const confirmMsg = `Konfirmasi Simpan ke Bank Soal:\n\n` +
      `File: ${file.name}\n` +
      `Mapel Tujuan: ${subName}\n` +
      `Seluruh butir soal akan dinormalisasi oleh MCP AI dan disimpan langsung ke database.\n\n` +
      `Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setSavingToBank(true);
      setError(null);
      setSaveSuccessResult(null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("subjectId", selectedSubjectId);

      const res = await fetch("/api/admin/mcp/save-to-bank", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan soal ke Bank Soal");

      setSaveSuccessResult({
        count: data.count,
        subjectName: subName,
        message: data.message || `Berhasil menyimpan ${data.count} butir soal ke Bank Soal!`,
      });
    } catch (err: any) {
      setError("Gagal menyimpan ke Bank Soal: " + err.message);
    } finally {
      setSavingToBank(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "COMPLEX_MULTIPLE_CHOICE":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 rounded-md inline-flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-purple-600" /> PG Kompleks
          </span>
        );
      case "TRUE_FALSE":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-md inline-flex items-center gap-1">
            <Scale className="w-3 h-3 text-amber-600" /> Benar / Salah
          </span>
        );
      case "MATCHING":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-md inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-600" /> Menjodohkan
          </span>
        );
      case "ESSAY":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md inline-flex items-center gap-1">
            <AlignLeft className="w-3 h-3 text-emerald-600" /> Esai / Uraian
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-md inline-flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-600" /> Pilihan Ganda
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Model Context Protocol (MCP AI Normalizer)
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-300">
              <Cpu className="w-3 h-3 text-purple-600" />
              <span>Superuser Console</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit cerdas naskah soal guru, hubungkan kunci jawaban terpisah, standarisasi 5 mode soal CBT, dan preservasi 100% gambar tanpa merubah isi/maksud soal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Muat file soal contoh untuk langsung mencoba"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Coba File Sampel</span>
          </button>

          <Link
            href="/admin/questions"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lihat Bank Soal</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Mata Pelajaran Tujuan Penyimpanan (Bank Soal):</span>
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                  : file
                  ? "border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50"
                  : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  file
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                }`}
              >
                {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800">
                  {file ? file.name : "Klik atau seret file Word (.docx) naskah soal guru ke sini"}
                </div>
                <p className="text-[11px] text-slate-500">
                  {file
                    ? `Ukuran: ${(file.size / 1024).toFixed(1)} KB • Siap diaudit & dinormalisasi MCP AI`
                    : "Mendukung format PG (1..20), Menjodohkan (Matching), Esai, gambar embedded, dan tabel kunci terpisah"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={handleAudit}
                disabled={!file || auditing || normalizing || savingToBank}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {auditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Menganalisa...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    <span>1. Analisa Audit File</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNormalizeAndDownload}
                disabled={!file || auditing || normalizing || savingToBank}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {normalizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Menormalisasi...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>2. Unduh Hasil (.docx)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveDirectToBank}
                disabled={!file || auditing || normalizing || savingToBank}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingToBank ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Bank...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>3. 1-Klik Simpan ke Bank</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Direct Save Banner */}
            {saveSuccessResult && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{saveSuccessResult.message}</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Sebanyak <strong>{saveSuccessResult.count} butir soal</strong> dari file <strong>{file?.name}</strong> telah berhasil distandarisasi dan langsung tersimpan ke Mata Pelajaran <strong>{saveSuccessResult.subjectName}</strong>.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <Link
                    href={`/admin/questions?subjectId=${selectedSubjectId}`}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Buka Bank Soal Mapel Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Normalize Success Banner */}
            {normalizeResult && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>File Berhasil Dinormalisasi & Terunduh! ({normalizeResult.fileName})</span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  {normalizeResult.message} ({normalizeResult.totalQuestions} soal terdeteksi, {normalizeResult.imagesCount} gambar dipertahankan 100%).
                </p>
              </div>
            )}

            {/* Audit Results View */}
            {auditResult && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5 animate-in fade-in duration-200">
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Diagnosis Audit Dokumen:
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      {auditResult.filename || file?.name}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      auditResult.status === "HEALTHY"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {auditResult.status === "HEALTHY" ? "Format Standar" : "Perlu Penyesuaian Struktur"}
                  </span>
                </div>

                {/* Counter Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-medium">Total Soal</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {auditResult.detected_questions}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-medium">Gambar (Preserved)</div>
                    <div className="text-xl font-black text-blue-600 mt-0.5">
                      {auditResult.total_images}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-medium">Kunci Terpisah di Tabel</div>
                    <div className="text-xl font-black text-purple-600 mt-0.5">
                      {auditResult.separate_keys_found || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-medium">Opsi Belum Berhuruf</div>
                    <div className="text-xl font-black text-rose-600 mt-0.5">
                      {auditResult.unlabelled_options || 0}
                    </div>
                  </div>
                </div>

                {/* Breakdown by CBT Type */}
                {auditResult.types_breakdown && (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Komposisi 5 Bentuk Soal Terdeteksi:</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Total: {auditResult.detected_questions} Butir
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">Pilihan Ganda</span>
                        <span className="px-2 py-0.5 text-xs font-black bg-blue-600 text-white rounded-md">
                          {auditResult.types_breakdown.MULTIPLE_CHOICE || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900">Menjodohkan</span>
                        <span className="px-2 py-0.5 text-xs font-black bg-indigo-600 text-white rounded-md">
                          {auditResult.types_breakdown.MATCHING || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">Esai / Uraian</span>
                        <span className="px-2 py-0.5 text-xs font-black bg-emerald-600 text-white rounded-md">
                          {auditResult.types_breakdown.ESSAY || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900">PG Kompleks</span>
                        <span className="px-2 py-0.5 text-xs font-black bg-purple-600 text-white rounded-md">
                          {auditResult.types_breakdown.COMPLEX_MULTIPLE_CHOICE || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900">Benar / Salah</span>
                        <span className="px-2 py-0.5 text-xs font-black bg-amber-600 text-white rounded-md">
                          {auditResult.types_breakdown.TRUE_FALSE || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues Detected & AI Fix Plans */}
                {auditResult.issues_detected && auditResult.issues_detected.length > 0 ? (
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                    <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Penyesuaian Struktur Diperlukan ({auditResult.issues_detected.length} Catatan):</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                        AI Fix Ready (100% Otomatis)
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {auditResult.issues_detected.map((issue: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] flex items-start gap-2 text-slate-700"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] shrink-0">
                            Soal #{issue.question_number}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800">{issue.message}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5">
                              ✨ Rencana Penyesuaian AI: <em>{issue.ai_fix_plan}</em>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Format dokumen sangat rapi! Seluruh nomor soal, opsi, dan kunci jawaban teridentifikasi sempurna.</span>
                  </div>
                )}

                {/* Questions Preview List Accordion */}
                {auditResult.questions_detail && auditResult.questions_detail.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowQuestionPreview(!showQuestionPreview)}
                      className="text-xs font-bold text-slate-800 flex items-center justify-between w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Daftar {auditResult.questions_detail.length} Butir Soal Teridentifikasi</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {showQuestionPreview ? "Sembunyikan Daftar ▲" : "Tampilkan Daftar ▼"}
                      </span>
                    </button>

                    {showQuestionPreview && (
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-white">
                        {auditResult.questions_detail.map((q: any) => (
                          <div
                            key={q.number}
                            className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-start gap-2 flex-1">
                              <span className="font-bold text-slate-700 w-7 shrink-0">#{q.number}</span>
                              <div className="space-y-1 flex-1">
                                <div className="text-slate-800 line-clamp-1 font-medium">
                                  {q.snippet || `Butir Soal Nomor ${q.number}`}
                                </div>
                                {q.issues && q.issues.length > 0 && (
                                  <div className="text-[10px] text-amber-700 font-medium">
                                    ⚠️ {q.issues.join(" • ")}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {getTypeBadge(q.type)}
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                                Kunci: {q.key}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  q.status === "OK"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {q.status === "OK" ? "OK" : "AI Fix"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation Box */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Rekomendasi MCP AI:</strong> {auditResult.recommendation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: MCP Principles & Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Standar Protokol MCP CBT</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Engine Model Context Protocol dirancang khusus agar Superuser dapat menerima berbagai format naskah soal dari guru dan mengonversinya menjadi format standar CBT secara presisi.
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Preservasi Teks Asli</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  AI tidak memparafrase, tidak memotong, dan tidak mengarang soal maupun opsi. Kalimat guru dipertahankan 100% kata per kata.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>100% Preservasi Media Gambar</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Seluruh elemen gambar XML (drawing, pict, w:object) dan relasi Word tetap utuh tanpa terhapus atau rusak.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Dukungan 5 Bentuk Soal CBT</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Mendukung Pilihan Ganda Tunggal, PG Kompleks, Benar/Salah, Menjodohkan (Matching), dan Esai/Uraian.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Sinkronisasi Kunci Terpisah</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Jika guru meletakkan kunci jawaban di tabel akhir dokumen, MCP otomatis membaca nomor kunci dan menautkannya ke masing-masing butir soal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
