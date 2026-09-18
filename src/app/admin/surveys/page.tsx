"use client";

import React, { useEffect, useState } from "react";
import {
  ClipboardCheck, Download, Search, Filter, RefreshCw,
  TrendingUp, Users, Star, MessageSquare, ChevronDown, CheckCircle2,
  BookOpen, Layers, Award
} from "lucide-react";

const QUESTION_LABELS: Record<string, string> = {
  q1: "Guru menguasai materi yang diajarkan",
  q2: "Guru memberikan contoh-contoh yang sesuai",
  q3: "Guru menjelaskan materi ajar dengan baik",
  q4: "Guru memberikan tanggapan baik atas pertanyaan",
  q5: "Guru mengembalikan tugas yang telah dikoreksi",
  q6: "Guru memulai & mengakhiri tepat waktu",
  q7: "Guru menguasai kelas dengan baik",
};

const LIKERT_BADGE: Record<string, { bg: string; text: string }> = {
  SS: { bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-800" },
  S: { bg: "bg-teal-100 border-teal-300", text: "text-teal-800" },
  N: { bg: "bg-sky-100 border-sky-300", text: "text-sky-800" },
  TS: { bg: "bg-amber-100 border-amber-300", text: "text-amber-800" },
  STS: { bg: "bg-rose-100 border-rose-300", text: "text-rose-800" },
};

export default function AdminSurveysPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"TABLE" | "BREAKDOWN">("TABLE");

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSubject !== "ALL") params.set("subjectId", selectedSubject);
      if (selectedGroup !== "ALL") params.set("groupId", selectedGroup);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/surveys?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error loading surveys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSubject, selectedGroup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportCSV = () => {
    if (!data?.surveys || data.surveys.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "Nama Siswa",
      "NIS",
      "Kelas / Rombel",
      "Mata Pelajaran",
      "Ujian",
      "P1 (Kuasai Materi)",
      "P2 (Beri Contoh)",
      "P3 (Jelaskan Baik)",
      "P4 (Tanggapan Baik)",
      "P5 (Kembalikan Tugas)",
      "P6 (Tepat Waktu)",
      "P7 (Kuasai Kelas)",
      "P8 (Saran Siswa)",
      "Waktu Pengisian",
    ];

    const rows = data.surveys.map((s: any, idx: number) => [
      idx + 1,
      `"${(s.user?.name || "").replace(/"/g, '""')}"`,
      `"${s.user?.nis || s.user?.username || ""}"`,
      `"${s.user?.group?.name || s.user?.group?.code || "-"}"`,
      `"${(s.subject?.name || "").replace(/"/g, '""')}"`,
      `"${(s.exam?.title || "").replace(/"/g, '""')}"`,
      s.q1,
      s.q2,
      s.q3,
      s.q4,
      s.q5,
      s.q6,
      s.q7,
      `"${(s.q8Suggestion || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${new Date(s.submittedAt).toLocaleString("id-ID")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Kuesioner_Guru_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const surveys = data?.surveys || [];
  const stats = data?.questionsStats || {};
  const totalRespondents = data?.totalRespondents || 0;
  const overallAvg = data?.overallAvg || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 shadow-sm flex-shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Rekap Kuesioner Pembelajaran Guru
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Evaluasi Pembelajaran Siswa Tengah Semester Ganjil 2026/2027 • SMK Pasundan 2 Bandung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-default text-xs font-bold py-2.5 px-3.5"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || totalRespondents === 0}
            className="btn-primary text-xs font-black py-2.5 px-4 gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Responden</span>
            <span className="text-2xl font-black text-slate-900">{totalRespondents.toLocaleString()}</span>
            <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">Jawaban Siswa Masuk</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Skor Rata-Rata Guru</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{overallAvg}</span>
              <span className="text-xs font-bold text-slate-400">/ 5.00</span>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                overallAvg >= 4.0 ? "bg-emerald-100 text-emerald-800" : overallAvg >= 3.0 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
              }`}>
                {overallAvg >= 4.5 ? "Sangat Baik" : overallAvg >= 3.5 ? "Baik" : overallAvg >= 2.5 ? "Cukup" : "Perlu Evaluasi"}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">Skala Likert 1–5</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Indeks Kepuasan</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600">
                {totalRespondents > 0
                  ? (
                      (Object.values(stats).reduce(
                        (acc: number, item: any) => acc + (item.satisfactionRate || 0),
                        0
                      ) / 7).toFixed(1)
                    )
                  : "0"}%
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">Menjawab Setuju / Sangat Setuju</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Filter Mata Pelajaran */}
          <div className="w-full sm:w-72">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="form-select w-full text-xs font-bold rounded-xl border-slate-300 py-2"
            >
              <option value="ALL">Semua Mata Pelajaran ({data?.subjects?.length || 0})</option>
              {data?.subjects?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Rombel / Kelas */}
          <div className="w-full sm:w-60">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Rombel / Kelas</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="form-select w-full text-xs font-bold rounded-xl border-slate-300 py-2"
            >
              <option value="ALL">Semua Rombel ({data?.groups?.length || 0})</option>
              {data?.groups?.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Siswa */}
          <div className="w-full sm:flex-1">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Cari Siswa / NIS</label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik Nama atau NIS siswa lalu tekan Enter..."
                className="form-input pl-9 w-full text-xs font-medium rounded-xl border-slate-300 py-2"
              />
            </form>
          </div>

          {/* Tab View Switcher */}
          <div className="w-full sm:w-auto self-end pt-5 sm:pt-0">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("TABLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "TABLE"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tabel Rincian
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("BREAKDOWN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "BREAKDOWN"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Grafik Per Butir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABEL RINCIAN SISWA (NON-ANONIM) */}
      {activeTab === "TABLE" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">
              Data Jawaban Kuesioner Siswa ({surveys.length} Data)
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Menampilkan data lengkap identitas siswa dan penilaian
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Memuat data kuesioner...</span>
            </div>
          ) : surveys.length === 0 ? (
            <div className="py-16 text-center text-xs font-bold text-slate-500">
              Belum ada data kuesioner yang sesuai dengan filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Siswa & NIS</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-4">Mata Pelajaran</th>
                    <th className="py-3 px-2 text-center" title="P1: Kuasai Materi">P1</th>
                    <th className="py-3 px-2 text-center" title="P2: Beri Contoh">P2</th>
                    <th className="py-3 px-2 text-center" title="P3: Jelaskan Baik">P3</th>
                    <th className="py-3 px-2 text-center" title="P4: Tanggapan Baik">P4</th>
                    <th className="py-3 px-2 text-center" title="P5: Koreksi Tugas">P5</th>
                    <th className="py-3 px-2 text-center" title="P6: Tepat Waktu">P6</th>
                    <th className="py-3 px-2 text-center" title="P7: Kuasai Kelas">P7</th>
                    <th className="py-3 px-4 max-w-xs">Saran Pembelajaran</th>
                    <th className="py-3 px-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.map((s: any, idx: number) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{s.user?.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">NIS: {s.user?.nis || s.user?.username}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {s.user?.group?.name || s.user?.group?.code || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-sky-900">{s.subject?.name}</div>
                        <div className="text-[10px] text-slate-400">{s.exam?.title}</div>
                      </td>
                      {["q1", "q2", "q3", "q4", "q5", "q6", "q7"].map((qKey) => {
                        const val = s[qKey];
                        const badge = LIKERT_BADGE[val] || { bg: "bg-slate-100", text: "text-slate-700" };
                        return (
                          <td key={qKey} className="py-3 px-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${badge.bg} ${badge.text}`}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 max-w-xs">
                        {s.q8Suggestion ? (
                          <p className="text-[11px] text-slate-700 font-medium italic line-clamp-2" title={s.q8Suggestion}>
                            "{s.q8Suggestion}"
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(s.submittedAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: BREAKDOWN PER BUTIR PERTANYAAN */}
      {activeTab === "BREAKDOWN" && (
        <div className="space-y-4">
          {Object.entries(QUESTION_LABELS).map(([qKey, label], idx) => {
            const qStat = stats[qKey] || { counts: { SS: 0, S: 0, N: 0, TS: 0, STS: 0 }, avgScore: 0, satisfactionRate: 0 };
            const counts = qStat.counts;
            const total = totalRespondents || 1;

            return (
              <div key={qKey} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{label}</h4>
                      <p className="text-xs text-slate-500 font-semibold">Butir Soal {idx + 1} Kuesioner Pembelajaran</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block">Rata-rata Skor</span>
                      <span className="text-base font-black text-slate-900">{qStat.avgScore} / 5.0</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block">Kepuasan (SS+S)</span>
                      <span className="text-base font-black text-emerald-600">{qStat.satisfactionRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar per butir */}
                <div className="space-y-2 pt-1">
                  {[
                    { key: "SS", label: "Sangat Setuju", color: "bg-emerald-500", count: counts.SS },
                    { key: "S", label: "Setuju", color: "bg-teal-500", count: counts.S },
                    { key: "N", label: "Netral", color: "bg-sky-400", count: counts.N },
                    { key: "TS", label: "Tidak Setuju", color: "bg-amber-400", count: counts.TS },
                    { key: "STS", label: "Sangat Tidak Setuju", color: "bg-rose-500", count: counts.STS },
                  ].map((item) => {
                    const pct = totalRespondents > 0 ? ((item.count / totalRespondents) * 100).toFixed(1) : "0";
                    return (
                      <div key={item.key} className="flex items-center gap-3 text-xs">
                        <span className="w-36 font-bold text-slate-600 flex-shrink-0">
                          {item.key} ({item.label})
                        </span>
                        <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-black text-slate-700 text-[11px]">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
