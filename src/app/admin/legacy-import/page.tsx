"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  Users,
  FileQuestion,
} from "lucide-react";

export default function LegacyImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sqlText, setSqlText] = useState("");
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const text = await selectedFile.text();
      setSqlText(text);
      setError(null);
    }
  };

  const handleRunMigration = async () => {
    if (!sqlText || sqlText.trim() === "") {
      setError("Silakan pilih file SQL atau tempelkan skrip SQL dump ZYACBT");
      return;
    }

    setImporting(true);
    setError(null);
    setStats(null);

    try {
      const res = await fetch("/api/admin/import/legacy-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sqlContent: sqlText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan migrasi database");

      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Migrasi Database ZYACBT Legacy</h1>
        <p className="text-xs text-slate-400 mt-1">
          Import otomatis bank soal, mata pelajaran, topik, dan akun peserta dari file dump SQL ZYACBT lama.
        </p>
      </div>

      {/* Migration Notice */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-300">
        <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-white">Kompatibilitas Penuh:</span> Parser modern ini secara otomatis membaca tabel `cbt_modul`, `cbt_topik`, `cbt_soal`, `cbt_jawaban`, `cbt_user`, dan mengonversinya ke skema modern ZYACBT Next-Gen.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload or Paste SQL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-white">Pilih File Dump Database (.sql)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              File `zyacbt-public-2024-05-05-tanpa-database.sql` atau file backup ZYACBT lainnya.
            </p>
          </div>

          <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition border border-slate-700">
            <span>Pilih File .SQL</span>
            <input type="file" accept=".sql" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {file && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span className="font-mono">{file.name}</span>
            <span className="text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Atau Tempel / Review Skrip SQL Dump di bawah:
          </label>
          <textarea
            rows={8}
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            placeholder="INSERT INTO `cbt_soal` ... ; INSERT INTO `cbt_jawaban` ... ;"
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
          />
        </div>

        <button
          onClick={handleRunMigration}
          disabled={importing || !sqlText}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses & Mengimpor Data Legacy...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>Mulai Migrasi Database ke Versi Modern</span>
            </>
          )}
        </button>
      </div>

      {/* Migration Stats Result */}
      {stats && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4 animate-in zoom-in-95">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm">Migrasi Data ZYACBT Berhasil Selesai!</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xl font-black text-white">{stats.topics}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Topik Termigrasi</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xl font-black text-blue-400">{stats.questions}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Butir Soal</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xl font-black text-emerald-400">{stats.options}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Opsi Jawaban</div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xl font-black text-amber-400">{stats.users}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Akun Siswa</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => router.push("/admin/questions")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition"
            >
              Lihat Bank Soal
            </button>
            <button
              onClick={() => router.push("/admin/exams")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
            >
              Buat Ujian Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
