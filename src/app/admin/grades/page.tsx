"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { StudentAnswerSheetModal } from "@/components/StudentAnswerSheetModal";
import * as XLSX from "xlsx";

export default function GradesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GradesContent />
    </Suspense>
  );
}

function GradesContent() {
  const searchParams = useSearchParams();
  const urlExamId = searchParams.get("examId");

  const [grades, setGrades] = useState<any[]>([]);
  const [examOptions, setExamOptions] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterExam, setFilterExam] = useState(urlExamId || "ALL");
  const [filterSession, setFilterSession] = useState("ALL");
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterJurusan, setFilterJurusan] = useState("ALL");
  const [filterJalur, setFilterJalur] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "score" | "date">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAnswerSheet, setSelectedAnswerSheet] = useState<{
    isOpen: boolean;
    examId: string;
    sessionId: string;
    studentName: string;
  } | null>(null);

  // Load daftar exam untuk filter dropdown
  useEffect(() => {
    fetch("/api/admin/exams")
      .then((res) => res.json())
      .then((data) => {
        if (data.exams && Array.isArray(data.exams)) {
          setExamOptions(data.exams.map((e: any) => ({ id: e.id, title: e.title })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData(urlExamId || undefined);
  }, [urlExamId]);

  const loadData = async (targetExamId?: string) => {
    try {
      setLoading(true);
      const queryParam = targetExamId && targetExamId !== "ALL" ? `?examId=${targetExamId}` : "";
      const res = await fetch(`/api/admin/grades${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
        if (targetExamId && targetExamId !== "ALL") {
          setFilterExam(targetExamId);
        }
      }
    } catch (e) {
      console.error("Gagal memuat rekap nilai:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExamFilterChange = (val: string) => {
    setFilterExam(val);
    if (val === "ALL") {
      loadData(undefined);
    } else {
      loadData(val);
    }
  };

  // Gabungkan pilihan ujian dari API dan dari data rekap
  const exams = useMemo(() => {
    const map = new Map<string, string>();
    examOptions.forEach((e) => map.set(e.id, e.title));
    grades.forEach((g) => {
      if (g.examId && g.examTitle) {
        map.set(g.examId, g.examTitle);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [examOptions, grades]);

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

  const sessions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    grades.forEach((g) => {
      const s = g.sessionName || (g.isSusulan ? "Susulan" : "Sesi 1");
      if (!seen.has(s)) {
        seen.add(s);
        list.push(s);
      }
    });
    return list.sort();
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
    if (filterSession !== "ALL") {
      list = list.filter((g) => {
        const s = g.sessionName || (g.isSusulan ? "Susulan" : "Sesi 1");
        return s === filterSession;
      });
    }
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
  }, [grades, filterExam, filterSession, filterGroup, filterJurusan, filterJalur, filterStatus, search, sortBy, sortAsc]);

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
      No: idx + 1,
      NIS: g.nis || g.username || "",
      "Nama Siswa": g.studentName || "",
      Jurusan: g.jurusan || "-",
      "Kelas / Rombel": g.groupName || "",
      "Sesi Ujian": g.sessionName || (g.isSusulan ? "Susulan" : "Sesi 1"),
      "Ruang Lab": g.room || "-",
      "Jalur Pelaksanaan": g.jalur || (g.isPkl ? "PKL (Smartphone HP)" : "Reguler (PC Lab)"),
      "Mata Pelajaran": g.subjectName || "",
      "Nama Ujian": g.examTitle || "",
      "Status Kehadiran": g.attendanceStatus || "",
      "Nilai Akhir (Skala 100)": g.score !== null && g.score !== undefined ? g.score : 0,
      "Poin Diperoleh": g.totalScoreAwarded ?? 0,
      "Benar Penuh (1 Poin)": g.fullCorrectCount ?? 0,
      "Sebagian Benar (Parsial)": g.partialCorrectCount ?? 0,
      "Salah (0 Poin)": g.incorrectCount ?? 0,
      "Kosong (Belum Diisi)": g.unansweredCount ?? 0,
      "Total Soal": g.totalQuestions || 40,
      KKM: kkm,
      Predikat: predikat,
      Ketuntasan: statusKetuntasan,
      Keterangan: g.note || (scoreVal >= kkm ? "Kompeten" : "Perlu Remedial"),
    };
  };

  // 1. Ekspor Multi-Sheet Pintar per Jurusan & PKL
  const exportMultiSheet = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Semua Jurusan
    const allRows = filtered.map(makeRow);
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(wb, wsAll, "Semua Peserta");

    // Sheet per Jurusan: TKRO, TP, TBSM, RPL, TKJ, TAV
    const jurusanList = ["TKRO", "TP", "TBSM", "RPL", "TKJ", "TAV"];
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
      Sesi: g.sessionName || (g.isSusulan ? "Susulan" : "Sesi 1"),
      Ruang: g.room || "-",
      Jalur: g.jalur || (g.isPkl ? "PKL (HP)" : "Reguler (PC)"),
      Ujian: g.examTitle || "",
      "Mata Pelajaran": g.subjectName || "",
      "Status Kehadiran": g.attendanceStatus || "",
      Nilai: g.score ?? "",
      "Poin Diperoleh": g.totalScoreAwarded ?? 0,
      "Benar Penuh": g.fullCorrectCount ?? 0,
      "Sebagian Benar": g.partialCorrectCount ?? 0,
      Salah: g.incorrectCount ?? 0,
      Kosong: g.unansweredCount ?? 0,
      "Total Soal": g.totalQuestions || 40,
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
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Hadir
        </span>
      );
    }
    if (status === "SEDANG_MENGERJAKAN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
          <Clock className="w-3 h-3 text-amber-600" />
          Sedang Ujian
        </span>
      );
    }
    if (status === "DIPAKSA_SELESAI") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
          Selesai (Pengawas)
        </span>
      );
    }
    if (status === "WAKTU_HABIS") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-300">
          Waktu Habis
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
        <XCircle className="w-3 h-3 text-rose-600" />
        Belum Hadir
      </span>
    );
  };

  const sessionBadge = (sessionName: string, isSusulan: boolean, room?: string) => {
    const sName = sessionName || (isSusulan ? "Susulan" : "Sesi 1");
    let colorClass = "bg-sky-100 text-sky-950 border-sky-300";
    if (sName.includes("1")) colorClass = "bg-blue-100 text-blue-950 border-blue-300";
    else if (sName.includes("2")) colorClass = "bg-indigo-100 text-indigo-950 border-indigo-300";
    else if (sName.includes("3")) colorClass = "bg-purple-100 text-purple-950 border-purple-300";
    else if (isSusulan || sName.toLowerCase().includes("susulan")) colorClass = "bg-amber-100 text-amber-950 border-amber-300";

    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${colorClass}`}>
          <Clock className="w-2.5 h-2.5" />
          {sName}
        </span>
        {room && room !== "-" && (
          <span className="text-[10px] font-bold text-black opacity-80">
            {room}
          </span>
        )}
      </div>
    );
  };

  const SortIcon = ({ col }: { col: "name" | "score" | "date" }) => {
    if (sortBy !== col) return null;
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-black" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-black" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-sky-600" />
            Rekap Nilai & Analisis Ujian CBT
          </h1>
          <p className="text-xs text-black font-semibold mt-1">
            Data rekapitulasi nilai, sesi pengerjaan, dan rincian butir jawaban peserta ujian secara real-time
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadData(filterExam !== "ALL" ? filterExam : undefined)}
            className="btn-secondary"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 text-black ${loading ? "animate-spin" : ""}`} />
            <span className="text-black font-black">Refresh</span>
          </button>

          <button
            onClick={exportMultiSheet}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs hover:opacity-95 transition"
            title="Download Excel Multi-Sheet Pintar (Semua Jurusan + Sheet Khusus PKL + Reguler)"
          >
            <Layers className="w-4 h-4 text-white" />
            <span>Excel Multi-Sheet Pintar</span>
          </button>

          <button
            onClick={() => exportExcel("ERAPOR")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-95 transition"
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

      {/* Filters (Grid 7 Kolom Responsive) */}
      <div className="glass p-4 rounded-2xl shadow-soft border border-sky-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
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
            onChange={(e) => handleExamFilterChange(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Ujian / Mapel —</option>
            {exams.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

          {/* 3. Filter Sesi (Baru!) */}
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Sesi —</option>
            {sessions.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* 4. Filter Jurusan */}
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

          {/* 5. Filter Jalur Pelaksanaan (Sekolah vs PKL) */}
          <select
            value={filterJalur}
            onChange={(e) => setFilterJalur(e.target.value)}
            className="form-input font-bold"
          >
            <option value="ALL">— Semua Jalur Pelaksanaan —</option>
            <option value="REGULER">🏫 Reguler (PC Lab Sekolah)</option>
            <option value="PKL">🏭 PKL (Smartphone HP)</option>
          </select>

          {/* 6. Filter Kelas / Rombel */}
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

          {/* 7. Filter Status Kehadiran */}
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
                  <th className="table-th">Sesi</th>
                  <th className="table-th">Ujian & Mapel</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-center">Rincian Jawaban & Poin</th>
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
                    <td className="table-td">
                      {sessionBadge(g.sessionName, g.isSusulan, g.room)}
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
                    {/* Kolom Rincian Jawaban & Poin */}
                    <td className="table-td text-center">
                      {g.session?.id ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-800">
                            {g.answeredCount ?? 0} / {g.totalQuestions || 40} Terjawab
                            {g.totalScoreAwarded !== undefined && (
                              <span className="text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded ml-1 font-black border border-blue-200">
                                {g.totalScoreAwarded} poin
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap justify-center">
                            {/* Jika ada partial credit */}
                            {Boolean(g.partialCorrectCount && g.partialCorrectCount > 0) ? (
                              <>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  title="Benar Penuh (1.0 poin per butir)"
                                >
                                  ✓ {g.fullCorrectCount ?? 0} Penuh
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300"
                                  title="Sebagian Benar (Poin parsial pada PG Kompleks / Menjodohkan)"
                                >
                                  ~ {g.partialCorrectCount} Sebagian
                                </span>
                              </>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                ✓ {g.correctCount ?? 0} Benar
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                              ✗ {g.incorrectCount ?? 0} Salah
                            </span>
                            {Boolean(g.unansweredCount && g.unansweredCount > 0) && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300"
                                title="Kosong belum dijawab (0 poin)"
                              >
                                ⚪ {g.unansweredCount} Kosong
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic font-medium">
                          Belum mengerjakan
                        </span>
                      )}
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
                          title="Lihat Lembar Analisis Jawaban Lengkap Siswa"
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
