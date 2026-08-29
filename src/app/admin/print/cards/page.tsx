"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Users, QrCode, School, Settings2 } from "lucide-react";

export default function PrintCardsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Customizable School Info
  const [schoolName, setSchoolName] = useState("SMK PASUNDAN 2 BANDUNG");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Cihampelas No. 222, Bandung • Telp. (022) 2033000");
  const [examTitle, setExamTitle] = useState("ASESMEN SUMATIF BERBASIS KOMPUTER (CBT)");
  const [academicYear, setAcademicYear] = useState("TAHUN AJARAN 2026/2027");
  const [headmasterName, setHeadmasterName] = useState("H. Dedi Mulyadi, M.Pd.");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      setStudents(data.students || []);
      setGroups(data.groups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (selectedGroup === "ALL") return true;
    return s.groupId === selectedGroup;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Header - Hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cetak Kartu Peserta Ujian</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Format cetak baku kartu peserta CBT siap potong (A4 8-Grid).
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
            <span>Kop & Sekolah</span>
          </button>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g._count?.users || 0} Siswa)
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* Customizable School Info Panel (Hidden on Print) */}
      {showConfig && (
        <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Sekolah</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Alamat Sekolah / Kontak</label>
            <input
              type="text"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Judul Asesmen / Ujian</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Tahun Ajaran / Semester</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Kepala Sekolah / Ketua Panitia</label>
            <input
              type="text"
              value={headmasterName}
              onChange={(e) => setHeadmasterName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Printable Cards Grid (A4 2-Column Responsive) */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs print:hidden">Memuat data peserta...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs print:hidden">Tidak ada siswa yang sesuai filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3.5 print:text-black">
          {filteredStudents.map((student) => {
            return (
              <div
                key={student.id}
                className="bg-white text-slate-900 border-2 border-slate-900 rounded-2xl p-4 flex flex-col justify-between shadow-md print:shadow-none print:rounded-lg print:border-black print:break-inside-avoid relative overflow-hidden"
                style={{ pageBreakInside: "avoid" }}
              >
                {/* School Header */}
                <div className="border-b-2 border-slate-900 pb-2 mb-2 text-center">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {schoolName}
                  </div>
                  <div className="text-[9px] text-slate-600 font-medium">
                    {schoolAddress}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-blue-900 mt-1 border-t border-slate-300 pt-1">
                    {examTitle} • {academicYear}
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex gap-3 items-center my-1.5">
                  {/* Photo / QR Silhouette */}
                  <div className="w-20 h-24 bg-slate-100 border border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center text-center p-1 shrink-0 text-slate-500">
                    <div className="text-[9px] font-bold">FOTO 2x3</div>
                    <div className="text-[7px] text-slate-400 mt-0.5">/ CAP KEPSEK</div>
                  </div>

                  {/* Student Credentials Table */}
                  <table className="w-full text-[11px] leading-tight">
                    <tbody>
                      <tr>
                        <td className="w-24 text-slate-600 font-semibold py-0.5">Nama Peserta</td>
                        <td className="w-2 text-slate-400">:</td>
                        <td className="font-bold text-slate-900">{student.name}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-600 font-semibold py-0.5">NIS / NISN</td>
                        <td className="text-slate-400">:</td>
                        <td className="font-mono text-slate-800">{student.nis || "-"}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-600 font-semibold py-0.5">Kelas / Rombel</td>
                        <td className="text-slate-400">:</td>
                        <td className="font-bold text-slate-800">{student.group?.name || "Reguler"}</td>
                      </tr>
                      <tr>
                        <td className="text-slate-600 font-semibold py-0.5">Username CBT</td>
                        <td className="text-slate-400">:</td>
                        <td className="font-mono font-bold text-blue-800 bg-blue-50 px-1 rounded inline-block">
                          {student.username}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-slate-600 font-semibold py-0.5">Password</td>
                        <td className="text-slate-400">:</td>
                        <td className="font-mono font-bold text-slate-800">
                          {student.plainPassword || "123"}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-slate-600 font-semibold py-0.5">Ruang / Sesi</td>
                        <td className="text-slate-400">:</td>
                        <td className="text-slate-700 font-medium">Lab Komputer / Sesi 1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Signature */}
                <div className="border-t border-slate-300 pt-2 mt-2 flex items-end justify-between text-[9px] text-slate-700">
                  <div className="italic text-[8px] text-slate-500 max-w-[140px]">
                    *Simpan kartu ini dengan baik selama asesmen berlangsung.
                  </div>
                  <div className="text-center">
                    <div>Kepala Sekolah / Panitia,</div>
                    <div className="h-7" />
                    <div className="font-bold underline text-slate-900">{headmasterName}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
