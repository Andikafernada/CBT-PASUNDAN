"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldAlert, AlertTriangle, CheckCircle2, Search, Filter, Calendar, School, Clock } from "lucide-react";

export default function ViolationReportPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("ALL");
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // School metadata
  const schoolName = "SMK PASUNDAN 2 BANDUNG";
  const schoolAddress = "Jl. Cihampelas No. 222, Bandung • Telp. (022) 2033000";
  const currentDateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    fetchViolations();
  }, [selectedExamId, selectedGroupId]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const url = `/api/admin/reports/violations?examId=${selectedExamId}&groupId=${selectedGroupId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setExams(data.exams || []);
        setGroups(data.groups || []);
        setViolations(data.violations || []);
        if (!selectedExamId && data.activeExamId) {
          setSelectedExamId(data.activeExamId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentExamObj = exams.find((e) => e.id === selectedExamId);
  const currentGroupObj = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 print:bg-white text-slate-800 dark:text-slate-100 print:text-black">
      {/* Top Controls Toolbar - Hidden on Print */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/exams"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Laporan Kejadian & Pelanggaran Siswa (Untuk Wali Kelas / BK)</span>
              </h1>
              <p className="text-xs text-slate-500">
                Dokumen resmi berita acara insiden ujian untuk pelaporan dan tindak lanjut wali kelas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Exam Selector */}
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.code})
                </option>
              ))}
            </select>

            {/* Group / Class Filter */}
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelas / Rombel</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Printable Document */}
      <main className="max-w-5xl mx-auto p-6 md:p-10 print:p-0">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
          {/* Official School Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h2 className="text-xl font-black tracking-wide text-slate-900 uppercase">
              {schoolName}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">{schoolAddress}</p>
            <div className="mt-3 py-1.5 px-4 bg-rose-50 border border-rose-200 inline-block rounded-xl">
              <span className="font-extrabold text-sm text-rose-800 tracking-wide uppercase">
                BERITA ACARA & REKAPITULASI PELANGGARAN UJIAN CBT
              </span>
            </div>
          </div>

          {/* Exam & Class Details Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Mata Uji / Asesmen</span>
                <span className="font-bold text-slate-900">: {currentExamObj?.title || "-"}</span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Kode Ujian</span>
                <span className="font-mono font-bold text-slate-800">: {currentExamObj?.code || "-"}</span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Batas Toleransi</span>
                <span className="font-semibold text-rose-700">: Maksimal {currentExamObj?.maxViolations || 3} kali</span>
              </div>
            </div>

            <div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Kelas / Rombel</span>
                <span className="font-bold text-slate-900">
                  : {selectedGroupId === "ALL" ? "Semua Kelas" : currentGroupObj?.name || selectedGroupId}
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Hari, Tanggal</span>
                <span className="font-medium text-slate-800">: {currentDateStr}</span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="w-28 text-slate-500">Total Terdeteksi</span>
                <span className="font-black text-rose-600">: {violations.length} Siswa</span>
              </div>
            </div>
          </div>

          {/* Violation Table */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Memuat rekapitulasi data pelanggaran...</div>
          ) : violations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="font-bold text-sm text-emerald-900">Tidak Ada Pelanggaran Ditemukan!</div>
              <p className="text-xs text-emerald-700 mt-1">
                Seluruh siswa pada filter ini mengerjakan ujian dengan tertib dan mematuhi aturan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-44">Nama Siswa / NIS</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-28">Kelas</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-36">Perangkat / IP</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-24 text-center">Frekuensi</th>
                    <th className="py-2.5 px-3 border-r border-slate-300">Rincian Kronologis Pelanggaran</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {violations.map((v, i) => (
                    <tr key={v.sessionId} className={i % 2 === 1 ? "bg-slate-50/70" : ""}>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-bold text-slate-500">
                        {i + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{v.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIS: {v.nis}</div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-800">
                        {v.groupName}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-[11px]">
                        <div>{v.deviceType}</div>
                        <div className="font-mono text-[9px] text-slate-500">{v.ipAddress}</div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center">
                        <span className="px-2 py-0.5 font-black text-rose-700 bg-rose-100 rounded-full text-xs">
                          {v.violationCount}x
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-[10.5px]">
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                          {v.logs.map((log: any, lIdx: number) => {
                            const timeFormatted = new Date(log.time).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            });
                            return (
                              <li key={lIdx}>
                                <span className="font-mono text-[10px] text-slate-500">[{timeFormatted}]</span>{" "}
                                <span className="font-medium text-rose-900">{log.type}</span>: {log.details}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {v.status === "SUSPENDED" ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded">
                            Terkunci (Beku)
                          </span>
                        ) : v.status === "IN_PROGRESS" ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-[10px] rounded">
                            Dibuka Kembali
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold text-[10px] rounded">
                            Selesai Ujian
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures for Official Report */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs break-inside-avoid">
                <div>
                  <p className="text-slate-600">Mengetahui,</p>
                  <p className="font-bold text-slate-900">Wali Kelas / Guru BK</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">( ............................................ )</p>
                  <p className="text-[10px] text-slate-500">NIP. -</p>
                </div>

                <div>
                  <p className="text-slate-600">Disaksikan oleh,</p>
                  <p className="font-bold text-slate-900">Proktor / Pengawas Ruang</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">( ............................................ )</p>
                  <p className="text-[10px] text-slate-500">NIP. -</p>
                </div>

                <div>
                  <p className="text-slate-600">Bandung, {currentDateStr}</p>
                  <p className="font-bold text-slate-900">Ketua Panitia Asesmen CBT</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline text-slate-900">H. Dedi Mulyadi, M.Pd.</p>
                  <p className="text-[10px] text-slate-500">Kepala SMK Pasundan 2 Bandung</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
