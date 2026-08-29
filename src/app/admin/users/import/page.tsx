"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Users,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  FileCheck,
} from "lucide-react";

export default function BulkUserImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [defaultRole, setDefaultRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Username: "guru.matematika",
        Password: "password123",
        "Nama Lengkap": "Drs. Ahmad Dahlan, M.Pd",
        Role: "GURU",
        "Kelas / Rombel": "XII-MIPA-1",
        "NIS / NIP": "197508122000031001",
        Email: "ahmad@sekolah.sch.id",
        Telepon: "081234567890",
      },
      {
        Username: "guru.fisika",
        Password: "password123",
        "Nama Lengkap": "Siti Nurhaliza, S.Si",
        Role: "GURU",
        "Kelas / Rombel": "XII-MIPA-2",
        "NIS / NIP": "198204152005012002",
        Email: "siti@sekolah.sch.id",
        Telepon: "081234567891",
      },
      {
        Username: "proktor.lab1",
        Password: "password123",
        "Nama Lengkap": "Bambang Pamungkas, S.Kom",
        Role: "OPERATOR",
        "Kelas / Rombel": "LAB-KOMPUTER-1",
        "NIS / NIP": "199002102015021003",
        Email: "proktor1@sekolah.sch.id",
        Telepon: "081234567892",
      },
      {
        Username: "siswa.andi",
        Password: "password123",
        "Nama Lengkap": "Andi Pratama",
        Role: "SISWA",
        "Kelas / Rombel": "XII-MIPA-1",
        "NIS / NIP": "20261001",
        Email: "andi@student.sch.id",
        Telepon: "081234567893",
      },
      {
        Username: "siswa.budi",
        Password: "password123",
        "Nama Lengkap": "Budi Setiawan",
        Role: "SISWA",
        "Kelas / Rombel": "XII-MIPA-1",
        "NIS / NIP": "20261002",
        Email: "budi@student.sch.id",
        Telepon: "081234567894",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 15 },
      { wch: 28 },
      { wch: 12 },
      { wch: 16 },
      { wch: 22 },
      { wch: 25 },
      { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Pengguna");
    XLSX.writeFile(workbook, "Template_Import_Pengguna_Guru_Siswa.xlsx");
  };

  // Handle File Upload & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
        setPreviewRows(rawData);
      } catch (err) {
        alert("Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .xls.");
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Submit Import
  const handleProcessImport = async () => {
    if (!file) {
      alert("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("defaultRole", defaultRole);

      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimpor pengguna");

      setImportResult(data);
      alert(`Import Selesai! ${data.createdCount} akun baru dibuat, ${data.updatedCount} akun diperbarui.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-slate-400 hover:text-blue-400 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Manajemen Pengguna</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Import Akun Guru, Siswa, & Operator Masal
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unggah file Excel (.xlsx / .xls) untuk mendaftarkan ratusan akun guru, siswa, dan proktor sekaligus dalam hitungan detik.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Format Template Excel</span>
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center transition bg-slate-950/40 relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {file ? file.name : "Klik atau seret file Excel (.xlsx / .xls) ke sini"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB • ${previewRows.length} baris data terdeteksi`
                  : "Mendukung format kolom standar: Username, Password, Nama, Role, Kelas, NIS, Email"}
              </p>
            </div>
          </div>
        </div>

        {/* Default Role Fallback */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div>
            <div className="text-xs font-bold text-white">Peran Default (Bila kolom Role kosong di Excel)</div>
            <div className="text-[11px] text-slate-400">Pilih role default jika file tidak menentukan kolom &apos;Role&apos;.</div>
          </div>
          <select
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="TEACHER">GURU / PENGUJI (TEACHER)</option>
            <option value="STUDENT">SISWA PESERTA (STUDENT)</option>
            <option value="OPERATOR">OPERATOR / PROKTOR (OPERATOR)</option>
            <option value="ADMIN">ADMINISTRATOR (ADMIN)</option>
          </select>
        </div>

        {/* Action Button */}
        {file && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setFile(null);
                setPreviewRows([]);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Reset File
            </button>
            <button
              onClick={handleProcessImport}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? "Memproses Import..." : `Simpan ${previewRows.length} Akun ke Database`}</span>
            </button>
          </div>
        )}
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Proses Import Massal Berhasil!</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-emerald-500/20">
              <div className="text-slate-400">Total Baris:</div>
              <div className="font-bold text-white text-base mt-0.5">{importResult.totalRows}</div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-emerald-500/20">
              <div className="text-slate-400">Akun Baru Dibuat:</div>
              <div className="font-bold text-emerald-400 text-base mt-0.5">{importResult.createdCount}</div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-emerald-500/20">
              <div className="text-slate-400">Akun Diperbarui:</div>
              <div className="font-bold text-blue-400 text-base mt-0.5">{importResult.updatedCount}</div>
            </div>
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-500/20 text-xs text-rose-300 space-y-1">
              <div className="font-bold">Catatan Peringatan:</div>
              {importResult.errors.map((err: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Table */}
      {previewRows.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Preview Data Excel ({previewRows.length} Baris)</span>
            </h3>
            <span className="text-xs text-slate-400">Periksa kolom sebelum menekan tombol simpan</span>
          </div>

          <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Kelas / Rombel</th>
                  <th className="py-2.5 px-3">NIS / NIP</th>
                  <th className="py-2.5 px-3">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {previewRows.map((row, idx) => {
                  const role = String(row.Role || row.role || defaultRole).toUpperCase();
                  const name = String(row.Nama || row.name || row["Nama Lengkap"] || "-");
                  const username = String(row.Username || row.username || "-");
                  const group = String(row.Kelas || row.kelas || row.Rombel || "-");
                  const nis = String(row.NIS || row.nis || row.NIP || "-");
                  const pass = String(row.Password || row.password || "123456");

                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{username}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{name}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            role.includes("GURU") || role.includes("TEACHER")
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : role.includes("OPERATOR")
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : role.includes("ADMIN")
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{group}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{nis}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{pass}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
