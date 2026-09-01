"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Users, ShieldAlert, Settings2 } from "lucide-react";

export default function PrintStudentCompliancePage() {
  const [data, setData] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Official Details
  const [schoolName, setSchoolName] = useState("SMK PASUNDAN 2 BANDUNG");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Cihampelas No. 222, Bandung • Telp. (022) 2033000");
  const [academicYear, setAcademicYear] = useState("TAHUN AJARAN 2026/2027");
  const [docTitle, setDocTitle] = useState("BERITA ACARA AUDIT KEDISIPLINAN & PELANGGARAN ASESMEN");
  const [bkCoordinator, setBkCoordinator] = useState("Dra. Hj. Siti Aminah, M.Pd");
  const [bkNip, setBkNip] = useState("19780820 200501 2 004");
  const [proctorName, setProctorName] = useState("Andika Fernanda, S.Kom");
  const [proctorNip, setProctorNip] = useState("19950812 202201 1 002");
  const [headmasterName, setHeadmasterName] = useState("H. Dedi Mulyadi, M.Pd.");
  const [headmasterNip, setHeadmasterNip] = useState("19680315 199403 1 006");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchComplianceData();
  }, [selectedGroup]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedGroup !== "ALL") params.append("groupId", selectedGroup);

      const res = await fetch(`/api/admin/reports/student-compliance?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setGroups(json.groups || []);
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

  return (
    <div className="space-y-6">
      {/* Control Header - Hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports/students"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cetak Berita Acara Kedisiplinan Siswa</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Format cetak resmi rekapitulasi pelanggaran dan keterlambatan untuk BK & Kesiswaan (A4 Baku).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showConfig
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Kop & TTD</span>
          </button>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="ALL">Semua Rombel</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (Ctrl+P)</span>
          </button>
        </div>
      </div>

      {/* Config Drawer (Hidden when printing) */}
      {showConfig && (
        <div className="print:hidden p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
          <div className="font-bold text-white mb-1">Pengaturan Informasi Dokumen:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Nama Sekolah</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Koordinator BK / Kesiswaan</label>
              <input
                type="text"
                value={bkCoordinator}
                onChange={(e) => setBkCoordinator(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Nama Proktor Utama</label>
              <input
                type="text"
                value={proctorName}
                onChange={(e) => setProctorName(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet (Standard A4 Official Layout) */}
      <div className="bg-white text-black p-8 sm:p-12 rounded-2xl shadow-xl print:shadow-none print:p-0 max-w-5xl mx-auto print:max-w-none text-xs font-serif leading-normal">
        {/* Kop Surat Resmi */}
        <div className="text-center pb-4 border-b-2 border-double border-black mb-6">
          <div className="font-bold text-base tracking-wide uppercase">YAYASAN PENDIDIKAN DASAR DAN MENENGAH PASUNDAN</div>
          <div className="font-extrabold text-xl tracking-wider uppercase mt-0.5">{schoolName}</div>
          <div className="text-[11px] font-sans text-gray-700 mt-1">{schoolAddress}</div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <div className="font-bold text-sm underline uppercase tracking-wide">{docTitle}</div>
          <div className="text-[11px] font-sans font-semibold mt-1">
            {academicYear} • Rombel: {selectedGroup === "ALL" ? "SEMUA KELAS" : groups.find((g) => g.id === selectedGroup)?.name}
          </div>
        </div>

        {/* Introduction Paragraph */}
        <p className="font-sans text-[11px] leading-relaxed mb-4 text-justify">
          Berdasarkan hasil audit sistem pengawasan digital <em>Computer-Based Test (CBT)</em>, berikut disampaikan rekapitulasi data akumulasi pelanggaran tata tertib ujian, keterlambatan login, dan keikutsertaan ujian susulan peserta didik untuk ditindaklanjuti oleh Guru Bimbingan & Konseling (BK) serta Tim Kesiswaan:
        </p>

        {/* Summary Table */}
        <table className="w-full border-collapse border border-black text-[11px] font-sans mb-6">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-black p-2 w-8">No</th>
              <th className="border border-black p-2 w-24">NIS</th>
              <th className="border border-black p-2 text-left">Nama Peserta Didik</th>
              <th className="border border-black p-2 w-24">Kelas / Rombel</th>
              <th className="border border-black p-2 w-20">Mapel Selesai</th>
              <th className="border border-black p-2 w-24">Akumulasi Pelanggaran</th>
              <th className="border border-black p-2 w-28">Status Waktu</th>
              <th className="border border-black p-2 w-24">Rekomendasi</th>
            </tr>
          </thead>
          <tbody>
            {!data?.students || data.students.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black p-4 text-center text-gray-500">
                  Tidak ada catatan pelanggaran pada rombel ini.
                </td>
              </tr>
            ) : (
              data.students.map((st: any, idx: number) => {
                const isHigh = st.riskLevel === "HIGH";
                const isMedium = st.riskLevel === "MEDIUM";

                return (
                  <tr key={st.id} className={isHigh ? "bg-red-50" : ""}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 text-center font-mono font-semibold">{st.nis}</td>
                    <td className="border border-black p-2 font-bold">{st.name}</td>
                    <td className="border border-black p-2 text-center">{st.groupName}</td>
                    <td className="border border-black p-2 text-center">{st.totalCompleted} Mapel</td>
                    <td className="border border-black p-2 text-center font-black">
                      {st.totalViolations > 0 ? `${st.totalViolations}x Strike` : "0 (Bersih)"}
                    </td>
                    <td className="border border-black p-2 text-center text-[10px]">
                      {st.totalLateCount > 0 && `${st.totalLateCount}x Telat `}
                      {st.totalSupplementaryCount > 0 && `${st.totalSupplementaryCount}x Susulan`}
                      {st.totalLateCount === 0 && st.totalSupplementaryCount === 0 && "Tepat Waktu"}
                    </td>
                    <td className="border border-black p-2 text-center font-bold text-[10px]">
                      {isHigh ? "Bimbingan BK" : isMedium ? "Pantauan" : "Tertib"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-4 text-center font-sans text-[11px] pt-6 mt-8">
          <div>
            <div>Mengetahui,</div>
            <div className="font-semibold">Koordinator BK / Kesiswaan</div>
            <div className="h-16" />
            <div className="font-bold underline">{bkCoordinator}</div>
            <div className="text-[10px] text-gray-600">NIP. {bkNip}</div>
          </div>

          <div>
            <div>Proktor Utama CBT,</div>
            <div className="font-semibold">Lab Komputer Asesmen</div>
            <div className="h-16" />
            <div className="font-bold underline">{proctorName}</div>
            <div className="text-[10px] text-gray-600">NIP. {proctorNip}</div>
          </div>

          <div>
            <div>Bandung, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="font-semibold">Kepala Sekolah,</div>
            <div className="h-16" />
            <div className="font-bold underline">{headmasterName}</div>
            <div className="text-[10px] text-gray-600">NIP. {headmasterNip}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
