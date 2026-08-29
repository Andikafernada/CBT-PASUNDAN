"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Settings2 } from "lucide-react";

export default function PrintAttendancePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Customizable Official Details
  const [schoolName, setSchoolName] = useState("SMK PASUNDAN 2 BANDUNG");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Cihampelas No. 222, Bandung • Telp. (022) 2033000");
  const [roomName, setRoomName] = useState("Laboratorium Komputer 01");
  const [sessionName, setSessionName] = useState("Sesi 1 (07.30 - 09.30 WIB)");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [proctorName, setProctorName] = useState("Andika Fernanda, S.Kom");
  const [proctorNip, setProctorNip] = useState("19950812 202201 1 002");
  const [invigilator1, setInvigilator1] = useState("Dra. Hj. Siti Aminah, M.Pd");
  const [invigilator1Nip, setInvigilator1Nip] = useState("19780820 200501 2 004");
  const [invigilator2, setInvigilator2] = useState("Budi Darmawan, S.Pd");
  const [invigilator2Nip, setInvigilator2Nip] = useState("19900215 201903 1 008");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stuRes, examRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/exams"),
      ]);
      const stuData = await stuRes.json();
      const examData = await examRes.json();

      setStudents(stuData.students || []);
      setGroups(stuData.groups || []);
      setExams(examData.exams || []);
      if (examData.exams?.length > 0) {
        setSelectedExam(examData.exams[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExam) || exams[0];
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
            <h1 className="text-xl font-bold text-white tracking-tight">Cetak Daftar Hadir Peserta</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Lembar presensi dan tanda tangan resmi ujian di ruang tes.
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
            <span>Pengawas & Ruang</span>
          </button>

          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} ({ex.code})
              </option>
            ))}
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Daftar Hadir</span>
          </button>
        </div>
      </div>

      {/* Config Panel (Hidden on Print) */}
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
            <label className="block text-slate-400 font-semibold mb-1">Ruang Ujian</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Sesi Pelaksanaan</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Proktor</label>
            <input
              type="text"
              value={proctorName}
              onChange={(e) => setProctorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Pengawas Ruang 1</label>
            <input
              type="text"
              value={invigilator1}
              onChange={(e) => setInvigilator1(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Pengawas Ruang 2</label>
            <input
              type="text"
              value={invigilator2}
              onChange={(e) => setInvigilator2(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Printable Sheet (Standard A4 Portrait) */}
      <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:text-black">
        {/* Formal Kop Surat */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
            {schoolName}
          </h2>
          <p className="text-xs text-slate-600 font-medium">{schoolAddress}</p>
          <div className="border-t border-slate-900 mt-2 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              DAFTAR HADIR PESERTA ASESMEN SUMATIF BERBASIS KOMPUTER (CBT)
            </h3>
            <p className="text-xs font-semibold text-slate-700">TAHUN AJARAN 2026/2027</p>
          </div>
        </div>

        {/* Exam Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-4 border border-slate-300 p-3 rounded-lg bg-slate-50 print:bg-white print:border-slate-800">
          <div className="flex">
            <span className="w-28 text-slate-600 font-semibold">Mata Pelajaran</span>
            <span className="w-3 text-slate-400">:</span>
            <span className="font-bold text-slate-900">{currentExam?.subject?.name || currentExam?.title || "Semua Pelajaran"}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-semibold">Hari / Tanggal</span>
            <span className="w-3 text-slate-400">:</span>
            <span className="font-medium text-slate-900">{examDate}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-semibold">Ruang / Tempat</span>
            <span className="w-3 text-slate-400">:</span>
            <span className="font-medium text-slate-900">{roomName}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-semibold">Sesi / Waktu</span>
            <span className="w-3 text-slate-400">:</span>
            <span className="font-medium text-slate-900">{sessionName}</span>
          </div>
        </div>

        {/* Student Attendance Table with Zig-Zag Signatures */}
        <table className="w-full text-xs border-collapse border border-slate-900 mb-6">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-slate-900 font-bold border-b border-slate-900 text-center">
              <th className="border border-slate-900 py-2 px-2 w-10">No</th>
              <th className="border border-slate-900 py-2 px-3 w-28">No. Peserta / NIS</th>
              <th className="border border-slate-900 py-2 px-4 text-left">Nama Lengkap Siswa</th>
              <th className="border border-slate-900 py-2 px-3 w-24">Kelas</th>
              <th className="border border-slate-900 py-2 px-3 w-48" colSpan={2}>
                Tanda Tangan Peserta
              </th>
              <th className="border border-slate-900 py-2 px-2 w-20">Ket.</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Tidak ada peserta untuk filter kelas ini.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => {
                const isEven = (idx + 1) % 2 === 0;
                return (
                  <tr key={s.id} className="border-b border-slate-900">
                    <td className="border border-slate-900 py-2 text-center font-medium">{idx + 1}</td>
                    <td className="border border-slate-900 py-2 px-3 text-center font-mono">{s.nis || s.username}</td>
                    <td className="border border-slate-900 py-2 px-4 font-semibold">{s.name}</td>
                    <td className="border border-slate-900 py-2 px-3 text-center">{s.group?.name || "Reguler"}</td>
                    
                    {/* Zig Zag Signatures */}
                    <td className="border-y border-l border-slate-900 py-2 px-2 w-24 align-top">
                      {!isEven && (
                        <div className="text-[10px] text-slate-500">
                          {idx + 1}. ....................
                        </div>
                      )}
                    </td>
                    <td className="border-y border-r border-slate-900 py-2 px-2 w-24 align-top">
                      {isEven && (
                        <div className="text-[10px] text-slate-500">
                          {idx + 1}. ....................
                        </div>
                      )}
                    </td>

                    <td className="border border-slate-900 py-2 text-center text-[10px] text-slate-500">
                      [ &nbsp; ] Hadir
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Official Signatures */}
        <div className="border-t-2 border-slate-900 pt-4 mt-6 grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <div className="font-semibold text-slate-700">Pengawas Ruang 1</div>
            <div className="h-14" />
            <div className="font-bold underline text-slate-900">{invigilator1}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {invigilator1Nip}</div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">Pengawas Ruang 2</div>
            <div className="h-14" />
            <div className="font-bold underline text-slate-900">{invigilator2}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {invigilator2Nip}</div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">Proktor / Teknisi CBT</div>
            <div className="h-14" />
            <div className="font-bold underline text-slate-900">{proctorName}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {proctorNip}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
