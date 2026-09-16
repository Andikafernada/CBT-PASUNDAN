"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  Download,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Eye,
} from "lucide-react";
import { StudentAnswerSheetModal } from "@/components/StudentAnswerSheetModal";
import * as XLSX from "xlsx";

export default function GradesPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterExam, setFilterExam] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterJurusan, setFilterJurusan] = useState("ALL");
  const [filterJalur, setFilterJalur] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "score" | "date">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAnswerSheet, setSelectedAnswerSheet] = useState<{ isOpen: boolean; examId: string; sessionId: string; studentName: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/grades");
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exams = useMemo(() => {
    const seen = new Set<string>();
    return grades
      .filter((g) => {
        if (seen.has(g.examId)) return false;
        seen.add(g.examId);
        return true;
      })
      .map((g) => ({ id: g.examId, title: g.examTitle }));
  }, [grades]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    return grades
      .filter((g) => {
        if (!g.groupName || g.groupName === "-") return false;
        if (seen.has(g.groupName)) return false;
        seen.add(g.groupName);
        return true;
      })
      .map((g) => ({ name: g.groupName }));
  }, [grades]);

  const jurusans = useMemo(() => {
    const seen = new Set<string>();
    return grades
      .map((g) => g.jurusan || "UMUM")
      .filter((jur) => {
        if (seen.has(jur)) return false;
        seen.add(jur);
        return true;
      })
      .sort();
  }, [grades]);

  const filtered = useMemo(() => {
    let list = [...grades];
    if (filterExam !== "ALL") list = list.filter((g) => g.examId === filterExam);
    if (filterGroup !== "ALL") list = list.filter((g) => g.groupName === filterGroup);
    if (filterJurusan !== "ALL") list = list.filter((g) => (g.jurusan || "UMUM") === filterJurusan);
    if (filterJalur === "REGULER") list = list.filter((g) => !g.isPkl);
    if (filterJalur === "PKL") list = list.filter((g) => g.isPkl);
    if (filterStatus !== "ALL") list = list.filter((g) => g.attendanceStatus === filterStatus);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.studentName?.toLowerCase().includes(q) ||
          g.username?.toLowerCase().includes(q) ||
          g.examTitle?.toLowerCase().includes(q) ||
          g.jurusan?.toLowerCase().includes(q) ||
          g.nis?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === "name") {
        va = a.studentName || "";
        vb = b.studentName || "";
      } else if (sortBy === "score") {
        va = a.score ?? -1;
        vb = b.score ?? -1;
      } else {
        va = a.session?.finishedAt ? new Date(a.session.finishedAt).getTime() : 0;
        vb = b.session?.finishedAt ? new Date(b.session.finishedAt).getTime() : 0;
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [grades, filterExam, filterGroup, filterJurusan, filterJalur, filterStatus, search, sortBy, sortAsc]);

  const toggleSort = (col: "name" | "score" | "date") => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else {
      setSortBy(col);
      setSortAsc(col !== "date");
    }
  };

  const avgScore = useMemo(() => {
    const done = filtered.filter(
      (g) => g.score !== null && g.score !== undefined
    );
    if (!done.length) return "-";
    return (
      done.reduce((acc, g) => acc + (g.score || 0), 0) / done.length
    ).toFixed(1);
  }, [filtered]);

  const makeRow = (g: any, idx: number) => {
    const scoreVal = typeof g.score === "number" ? g.score : (Number(g.score) || 0);
    const kkm = 75;
    const statusKetuntasan = scoreVal >= kkm ? "TUNTAS" : "BELUM TUNTAS";
    let predikat = "D";
    if (scoreVal >= 90) predikat = "A";
    else if (scoreVal >= 80) predikat = "B";
    else if (scoreVal >= 75) predikat = "C";

    return {
      "No": idx + 1,
      "NIS": g.nis || g.username || "",
      "Nama Siswa": g.studentName || "",
      "Jurusan": g.jurusan || "-",
      "Kelas / Rombel": g.groupName || "",
      "Jalur Pelaksanaan": g.jalur || (g.isPkl ? "PKL (Smartphone HP)" : "Reguler (PC Lab)"),
      "Mata Pelajaran": g.subjectName || "",
      "Nama Ujian": g.examTitle || "",
      "Status Kehadiran": g.attendanceStatus || "",
      "Nilai Akhir": g.score !== null && g.score !== undefined ? g.score : 0,
      "KKM": kkm,
      "Predikat": predikat,
      "Ketuntasan": statusKetuntasan,
      "Keterangan": g.note || (scoreVal >= kkm ? "Kompeten" : "Perlu Remedial"),
    };
  };

  // 1. Ekspor Multi-Sheet Pintar per Jurusan & PKL
  const exportMultiSheet = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Semua Jurusan
    const allRows = filtered.map(makeRow);
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, wsAll, "Semua Jurusan");

    // Sheet per Jurusan: TKRO, TP, TBSM, RPL
    const jurusanList = ["TKRO", "TP", "TBSM", "RPL"];
    jurusanList.forEach((jur) => {
      const jurRows = filtered
        .filter((g) => (g.jurusan || "").toUpperCase().includes(jur))
        .map(makeRow);
      if (jurRows.length > 0) {
        const wsJur = XLSX.utils.json_to_sheet(jurRows);
        XLSX.utils.book_append_sheet(wb, wsJur, `Jurusan ${jur}`);
      }
    });

    // Sheet Khusus Siswa PKL (Smartphone HP)
    const pklRows = filtered
      .filter((g) => g.isPkl || (g.groupName || "").toUpperCase().includes("PKL"))
      .map(makeRow);
    if (pklRows.length > 0) {
      const wsPkl = XLSX.utils.json_to_sheet(pklRows);
      XLSX.utils.book_append_sheet(wb, wsPkl, "Khusus Siswa PKL");
    }

    // Sheet Khusus Siswa Reguler (PC Lab Sekolah)
    const regRows = filtered
      .filter((g) => !g.isPkl && !(g.groupName || "").toUpperCase().includes("PKL"))
      .map(makeRow);
    if (regRows.length > 0) {
      const wsReg = XLSX.utils.json_to_sheet(regRows);
      XLSX.utils.book_append_sheet(wb, wsReg, "Reguler PC Lab");
    }

    XLSX.writeFile(
      wb,
      `rekap-nilai-multisheet-${filterExam !== "ALL" ? filterExam : "semua"}-${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // 2. Ekspor Format e-Rapor
  const exportExcel = (format: "STANDARD" | "ERAPOR" = "STANDARD") => {
    if (format === "ERAPOR") {
      const rows = filtered.map(makeRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Format e-Rapor");
      XLSX.writeFile(
        wb,
        `eRapor-CBT-${filterExam !== "ALL" ? filterExam : "Semua"}-${new Date().toISOString().split("T")[0]}.xlsx`
      );
      return;
    }

    const rows = filtered.map((g) => ({
      "Nama Siswa": g.studentName || "",
      Username: g.username || "",
      NIS: g.nis || "",
      Jurusan: g.jurusan || "-",
      Kelas: g.groupName || "",
      Jalur: g.jalur || (g.isPkl ? "PKL (HP)" : "Reguler (PC)"),
      Ujian: g.examTitle || "",
      "Mata Pelajaran": g.subjectName || "",
      "Status Kehadiran": g.attendanceStatus || "",
      Nilai: g.score ?? "",
      Keterangan: g.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
    XLSX.writeFile(
      wb,
      `rekap-nilai-${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const statusBadge = (status: string) => {
    if (status === "HADIR" || status === "HADIR_SUSULAN") {
      return <span className="badge-success">Hadir</span>;
    }
    if (status === "SEDANG_MENGERJAKAN") {
      return <span className="badge-info animate-pulse">Mengerjakan</span>;
    }
    if (status === "WAKTU_HABIS" || status === "DIPAKSA_SELESAI") {
      return <span className="badge-warning">Waktu Habis</span>;
    }
    if (status === "TIDAK_HADIR") {
      return <span className="badge-danger">Tidak Hadir</span>;
    }
    return <span className="badge-neutral">{status}</span>;
  };

  const SortIcon = ({ col }: { col: "name" | "score" | "date" }) =>
    sortBy === col ? (
      sortAsc ? (
        <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-black" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-black" />
      )
    ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-black" />
            Rekap Nilai & Asesmen Siswa (Multi-Jurusan & PKL)
          </h1>
          <p className="page-subtitle text-black font-bold">
            Total {filtered.length} data peserta • Rata-rata nilai: <strong className="text-black font-black text-sm">{avgScore}</strong>
          </p>
        </div>
        <div className="header-actions flex-wrap">
          <Link
            href={filterExam !== "ALL" ? `/admin/exams/${filterExam}/essay-grading` : "/admin/essay-grading"}
            className="btn-secondary text-blue-900 border-blue-300 hover:bg-blue-50 shadow-xs flex items-center gap-1.5"
            title="Buka Lembar Periksa & Validasi Jawaban Esai Siswa (AI Gemini)"
          >
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span className="text-black font-black">Periksa Jawaban Esai (AI)</span>
          </Link>

          <button onClick={loadData} className="btn-icon" title="Refresh Data">
            <RefreshCw className="w-4 h-4 text-black" />
          </button>

          <button
            onClick={exportMultiSheet}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-blue-700/20 flex items-center gap-1.5 transition cursor-pointer"
            title="Download 1 File Excel dengan Sheet Terpisah per Jurusan & PKL"
          >
            <Layers className="w-4 h-4 text-white" />
            <span>📊 Multi-Sheet per Jurusan (.xlsx)</span>
          </button>

          <button
            onClick={() => exportExcel("ERAPOR")}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            title="Download Rekap Nilai Format Standar e-Rapor / Dapodik"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Format e-Rapor</span>
          </button>

          <button
            onClick={() => exportExcel("STANDARD")}
            className="btn-primary"
          >
            <FileSpreadsheet className="w-4 h-4 text-black" />
            <span className="text-black font-black">Export Excel Standar</span>
          </button>
        </div>
      </div>

      {/* Filters (Grid 6 Kolom Responsive) */}
      <div className="glass p-4 rounded-2xl shadow-soft border border-sky-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 1. Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / NIS..."
              className="form-input pl-10"
            />
          </div>

          {/* 2. Filter Ujian / Mapel */}
          <select
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Ujian / Mapel —</option>
            {exams.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          {/* 3. Filter Jurusan */}
          <select
            value={filterJurusan}
            onChange={(e) => setFilterJurusan(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Jurusan —</option>
            {jurusans.map((jur: string) => (
              <option key={jur} value={jur}>
                Jurusan {jur}
              </option>
            ))}
          </select>

          {/* 4. Filter Jalur Pelaksanaan (Sekolah vs PKL) */}
          <select
            value={filterJalur}
            onChange={(e) => setFilterJalur(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Jalur Pelaksanaan —</option>
            <option value="REGULER">🏫 Reguler (PC Lab Sekolah)</option>
            <option value="PKL">🏭 PKL (Smartphone HP)</option>
          </select>

          {/* 5. Filter Kelas / Rombel */}
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Kelas / Rombel —</option>
            {groups.map((g: any) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>

          {/* 6. Filter Status Kehadiran */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Status —</option>
            <option value="HADIR">Hadir</option>
            <option value="HADIR_SUSULAN">Hadir (Susulan)</option>
            <option value="SEDANG_MENGERJAKAN">Sedang Mengerjakan</option>
            <option value="WAKTU_HABIS">Waktu Habis</option>
            <option value="DIPAKSA_SELESAI">Dipaksa Selesai</option>
            <option value="TIDAK_HADIR">Tidak Hadir</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-black font-bold">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center rounded-3xl shadow-soft">
          <BarChart3 className="w-12 h-12 text-black mx-auto mb-3 opacity-60" />
          <p className="text-sm font-black text-black">
            Tidak ada data nilai ditemukan pada filter ini
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl shadow-soft border border-sky-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th
                    className="table-th cursor-pointer select-none"
                    onClick={() => toggleSort("name")}
                  >
                    Siswa <SortIcon col="name" />
                  </th>
                  <th className="table-th">Jurusan & Jalur</th>
                  <th className="table-th">Kelas / Rombel</th>
                  <th className="table-th">Ujian & Mapel</th>
                  <th className="table-th">Status</th>
                  <th
                    className="table-th cursor-pointer select-none text-right"
                    onClick={() => toggleSort("score")}
                  >
                    Nilai <SortIcon col="score" />
                  </th>
                  <th className="table-th text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100 bg-white/70">
                {filtered.map((g, idx) => (
                  <tr
                    key={`${g.examId}-${g.studentId}`}
                    className="hover:bg-sky-50 transition"
                  >
                    <td className="table-td text-black font-bold">{idx + 1}</td>
                    <td className="table-td">
                      <div className="font-black text-black text-xs">
                        {g.studentName}
                      </div>
                      <div className="text-[10px] text-black font-bold">
                        {g.username}
                        {g.nis && g.nis !== "-" ? ` • ${g.nis}` : ""}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-950 border border-blue-300">
                          {g.jurusan || "UMUM"}
                        </span>
                        {g.isPkl ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300 flex items-center gap-0.5">
                            <span>🏭 PKL</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-0.5">
                            <span>🏫 Lab</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-black font-bold">
                      {g.groupName || "-"}
                    </td>
                    <td className="table-td max-w-[200px] truncate">
                      <div className="text-black font-black truncate">
                        {g.examTitle}
                      </div>
                      <div className="text-[10px] text-black font-medium">
                        {g.subjectName}
                      </div>
                    </td>
                    <td className="table-td">
                      {statusBadge(g.attendanceStatus)}
                    </td>
                    <td className="table-td text-right">
                      {g.score !== null && g.score !== undefined ? (
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-black">
                            {g.score}
                          </span>
                          <span className={`text-[10px] font-bold ${g.score >= 75 ? "text-emerald-700" : "text-rose-600"}`}>
                            {g.score >= 75 ? "TUNTAS" : "REMEDIAL"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-black italic text-[11px] font-bold">
                          {g.attendanceStatus === "TIDAK_HADIR"
                            ? "Absen"
                            : "Belum dinilai"}
                        </span>
                      )}
                    </td>
                    <td className="table-td text-center">
                      {g.session?.id ? (
                        <button
                          onClick={() =>
                            setSelectedAnswerSheet({
                              isOpen: true,
                              examId: g.examId,
                              sessionId: g.session.id,
                              studentName: g.studentName,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                          title="Lihat Lembar Jawaban Lengkap Siswa"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          <span>Lembar Jawaban</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3.5 border-t border-sky-300 text-xs text-black font-bold flex flex-col sm:flex-row items-center justify-between gap-2 bg-sky-100/60">
            <span>
              Menampilkan{" "}
              <strong className="text-black font-black">
                {filtered.length}
              </strong>{" "}
              dari{" "}
              <strong className="text-black font-black">
                {grades.length}
              </strong>{" "}
              data peserta
            </span>
            <span>
              Rata-rata nilai:{" "}
              <strong className="text-black font-black text-sm">
                {avgScore}
              </strong>
            </span>
          </div>
        </div>
      )}

      {selectedAnswerSheet && (
        <StudentAnswerSheetModal
          isOpen={selectedAnswerSheet.isOpen}
          onClose={() => setSelectedAnswerSheet(null)}
          examId={selectedAnswerSheet.examId}
          sessionId={selectedAnswerSheet.sessionId}
          studentName={selectedAnswerSheet.studentName}
        />
      )}
    </div>
  );
}
