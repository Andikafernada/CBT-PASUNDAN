"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Settings2 } from "lucide-react";

export default function PrintMinutesPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Official Details
  const [schoolName, setSchoolName] = useState("SMK PASUNDAN 2 BANDUNG");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Cihampelas No. 222, Bandung • Telp. (022) 2033000");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [roomName, setRoomName] = useState("Laboratorium Komputer 01");
  const [sessionName, setSessionName] = useState("Sesi 1 (07.30 - 09.30 WIB)");
  const [dayName, setDayName] = useState("Senin");
  const [examDateStr, setExamDateStr] = useState("28 Agustus 2026");
  const [registeredCount, setRegisteredCount] = useState<number>(36);
  const [presentCount, setPresentCount] = useState<number>(36);
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [absentNotes, setAbsentNotes] = useState<string>("-");
  const [proctorName, setProctorName] = useState("Ahmad Fauzi, S.Kom");
  const [proctorNip, setProctorNip] = useState("19850412 201101 1 003");
  const [technicianName, setTechnicianName] = useState("Andika Fernanda, S.Kom");
  const [technicianNip, setTechnicianNip] = useState("19950812 202201 1 002");
  const [invigilatorName, setInvigilatorName] = useState("Dra. Hj. Siti Aminah, M.Pd");
  const [invigilatorNip, setInvigilatorNip] = useState("19780820 200501 2 004");
  const [notes, setNotes] = useState(
    "Pelaksanaan asesmen berbasis komputer berjalan dengan tertib, lancar, dan aman. Seluruh perangkat klien dan koneksi server lokal berfungsi optimal tanpa gangguan teknis."
  );
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/exams");
      const data = await res.json();
      setExams(data.exams || []);
      if (data.exams?.length > 0) {
        setSelectedExam(data.exams[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExam) || exams[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Header - Hidden on Print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cetak Berita Acara Ujian</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Dokumen legalitas pelaksanaan asesmen CBT untuk panitia dan dinas.
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
            <span>Isi Berita Acara</span>
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

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Berita Acara</span>
          </button>
        </div>
      </div>

      {/* Config Form (Hidden on Print) */}
      {showConfig && (
        <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Hari & Tanggal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                placeholder="Hari (e.g. Senin)"
                className="w-1/3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
              <input
                type="text"
                value={examDateStr}
                onChange={(e) => setExamDateStr(e.target.value)}
                placeholder="Tanggal Lengkap"
                className="w-2/3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Ruang & Sesi</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Jumlah Peserta (Daftar / Hadir / Absen)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={registeredCount}
                onChange={(e) => setRegisteredCount(Number(e.target.value))}
                className="w-1/3 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
              <input
                type="number"
                value={presentCount}
                onChange={(e) => setPresentCount(Number(e.target.value))}
                className="w-1/3 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
              <input
                type="number"
                value={absentCount}
                onChange={(e) => setAbsentCount(Number(e.target.value))}
                className="w-1/3 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Pengawas Ruang</label>
            <input
              type="text"
              value={invigilatorName}
              onChange={(e) => setInvigilatorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Proktor</label>
            <input
              type="text"
              value={proctorName}
              onChange={(e) => setProctorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nama Teknisi</label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-slate-400 font-semibold mb-1">Catatan Kejadian Selama Ujian</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
            />
          </div>
        </div>
      )}

      {/* Printable Sheet (Standard A4) */}
      <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl p-10 shadow-2xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:text-black">
        {/* Formal Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
            {schoolName}
          </h2>
          <p className="text-xs text-slate-600 font-medium">{schoolAddress}</p>
          <div className="border-t border-slate-900 mt-3 pt-2">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
              BERITA ACARA PELAKSANAAN ASESMEN BERBASIS KOMPUTER (CBT)
            </h3>
            <p className="text-xs font-bold text-slate-700">TAHUN AJARAN {academicYear}</p>
          </div>
        </div>

        {/* Statement Body */}
        <div className="text-xs leading-relaxed space-y-4">
          <p>
            Pada hari ini <strong>{dayName}</strong> tanggal <strong>{examDateStr}</strong>, di <strong>{schoolName}</strong> telah diselenggarakan Asesmen Berbasis Komputer (CBT) untuk:
          </p>

          <table className="w-full text-xs ml-4 border-none">
            <tbody>
              <tr>
                <td className="w-44 font-semibold text-slate-700 py-1">Mata Pelajaran</td>
                <td className="w-3">:</td>
                <td className="font-bold text-slate-900">{currentExam?.subject?.name || currentExam?.title}</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-700 py-1">Kode Asesmen</td>
                <td>:</td>
                <td className="font-mono text-slate-800">{currentExam?.code || "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-700 py-1">Ruang / Sesi</td>
                <td>:</td>
                <td className="font-semibold text-slate-900">{roomName} / {sessionName}</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-700 py-1">Alokasi Waktu</td>
                <td>:</td>
                <td className="font-semibold text-slate-900">{currentExam?.durationMinutes || 90} Menit</td>
              </tr>
            </tbody>
          </table>

          <div className="border border-slate-900 p-4 rounded-lg bg-slate-50 print:bg-white space-y-2">
            <div className="font-bold text-slate-900 underline mb-2">REKAPITULASI KEHADIRAN PESERTA:</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border border-slate-400 p-2 rounded bg-white">
                <div className="text-[10px] text-slate-600 font-semibold">Jumlah Terdaftar</div>
                <div className="text-lg font-black text-slate-900">{registeredCount} Orang</div>
              </div>
              <div className="border border-slate-400 p-2 rounded bg-white">
                <div className="text-[10px] text-emerald-700 font-semibold">Jumlah Hadir</div>
                <div className="text-lg font-black text-emerald-700">{presentCount} Orang</div>
              </div>
              <div className="border border-slate-400 p-2 rounded bg-white">
                <div className="text-[10px] text-rose-700 font-semibold">Jumlah Tidak Hadir</div>
                <div className="text-lg font-black text-rose-700">{absentCount} Orang</div>
              </div>
            </div>

            {absentCount > 0 && (
              <div className="text-[11px] pt-1">
                <span className="font-semibold text-slate-700">Keterangan Peserta Tidak Hadir: </span>
                <span className="italic">{absentNotes}</span>
              </div>
            )}
          </div>

          <div>
            <div className="font-bold text-slate-900 mb-1">CATATAN KHUSUS SELAMA PELAKSANAAN ASESMEN:</div>
            <div className="border border-slate-900 p-3 rounded-lg min-h-[70px] bg-slate-50 print:bg-white italic text-slate-800">
              "{notes}"
            </div>
          </div>

          <p className="pt-2">
            Demikian Berita Acara ini dibuat dengan sesungguhnya dan penuh tanggung jawab untuk dapat dipergunakan sebagaimana mestinya.
          </p>
        </div>

        {/* Footer Signatures (3 Signers) */}
        <div className="border-t-2 border-slate-900 pt-6 mt-8 grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <div className="font-semibold text-slate-700">Pengawas Ruang</div>
            <div className="h-16" />
            <div className="font-bold underline text-slate-900">{invigilatorName}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {invigilatorNip}</div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">Teknisi Ruang</div>
            <div className="h-16" />
            <div className="font-bold underline text-slate-900">{technicianName}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {technicianNip}</div>
          </div>

          <div>
            <div className="font-semibold text-slate-700">Proktor CBT</div>
            <div className="h-16" />
            <div className="font-bold underline text-slate-900">{proctorName}</div>
            <div className="text-[10px] text-slate-600 font-mono">NIP. {proctorNip}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
