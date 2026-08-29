"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Activity,
  Key,
  Clock,
  FileQuestion,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  Search,
  BarChart3,
  Edit2,
  Trash2,
  Copy,
  Smartphone,
} from "lucide-react";

export default function AdminExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    code: "",
    description: "",
    subjectId: "",
    durationMinutes: 60,
    startTime: "",
    endTime: "",
    token: "ZYACBT",
    isTokenDynamic: false,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResult: false,
    showAnswerKey: false,
    minTimeMinutes: 0,
    maxViolations: 3,
    isPublished: true,
    requireKioskBrowser: false,
    groupIds: [] as string[],
    selectedQuestionIds: [] as string[],
  });

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsRes, subjRes, groupRes, qRes] = await Promise.all([
        fetch("/api/admin/exams"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/students"),
        fetch("/api/admin/questions"),
      ]);

      if (examsRes.ok) setExams((await examsRes.json()).exams || []);
      if (subjRes.ok) setSubjects((await subjRes.json()).subjects || []);
      if (groupRes.ok) setGroups((await groupRes.json()).groups || []);
      if (qRes.ok) setQuestions((await qRes.json()).questions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      let questionIdsToUse = form.selectedQuestionIds;
      if (questionIdsToUse.length === 0) {
        questionIdsToUse = questions
          .filter((q) => q.subjectId === form.subjectId || q.topic?.subjectId === form.subjectId)
          .map((q) => q.id);
      }

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          questionIds: questionIdsToUse,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat ujian");

      alert("Ujian berhasil dibuat!");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui ujian");

      alert("Pengaturan ujian berhasil diperbarui!");
      setShowEditModal(false);
      setEditForm(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus ujian "${title}" beserta seluruh riwayat pengerjaannya?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus ujian");
      alert("Ujian berhasil dihapus");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredExams = exams.filter((ex) =>
    ex.title.toLowerCase().includes(search.toLowerCase()) ||
    ex.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Manajemen Pelaksanaan Ujian</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola jadwal, durasi, token dinamis, keamanan anti-cheat, dan proctoring ujian.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              title: "",
              code: "",
              description: "",
              subjectId: subjects[0]?.id || "",
              durationMinutes: 60,
              startTime: "",
              endTime: "",
              token: "ZYACBT",
              isTokenDynamic: false,
              shuffleQuestions: true,
              shuffleOptions: true,
              showResult: false,
              showAnswerKey: false,
              minTimeMinutes: 0,
              maxViolations: 3,
              isPublished: true,
              requireKioskBrowser: false,
              groupIds: [],
              selectedQuestionIds: [],
            });
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Ujian Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul ujian atau kode..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Total: <strong className="text-white">{filteredExams.length}</strong> Jadwal Ujian
        </span>
      </div>

      {/* Exam Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar ujian...</div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <CalendarDays className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Belum ada ujian yang dibuat.</p>
          <p className="text-xs text-slate-500 mt-1">Klik tombol &apos;Buat Ujian Baru&apos; untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                    {exam.subject?.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>{exam.token || "TANPA TOKEN"}</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{exam.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditForm({
                          id: exam.id,
                          title: exam.title,
                          code: exam.code,
                          description: exam.description || "",
                          subjectId: exam.subjectId,
                          durationMinutes: exam.durationMinutes,
                          startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : "",
                          endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : "",
                          token: exam.token || "ZYACBT",
                          isTokenDynamic: exam.isTokenDynamic,
                          shuffleQuestions: exam.shuffleQuestions,
                          shuffleOptions: exam.shuffleOptions,
                          showResult: exam.showResult,
                          showAnswerKey: exam.showAnswerKey,
                          minTimeMinutes: exam.minTimeMinutes,
                          maxViolations: exam.maxViolations,
                          isPublished: exam.isPublished,
                          requireKioskBrowser: exam.requireKioskBrowser,
                          groupIds: exam.examGroups?.map((eg: any) => eg.groupId) || [],
                        });
                        setShowEditModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-400 rounded transition"
                      title="Edit Pengaturan Ujian"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                      title="Hapus Ujian"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 mb-1">Kode: {exam.code}</div>
                <p className="text-xs text-slate-400 line-clamp-2">{exam.description || "Tanpa deskripsi"}</p>

                {(exam.startTime || exam.endTime) && (
                  <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] space-y-0.5">
                    {exam.startTime && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Mulai (WIB):</span>
                        <span className="text-slate-200 font-mono">
                          {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(exam.startTime))} WIB
                        </span>
                      </div>
                    )}
                    {exam.endTime && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Selesai (WIB):</span>
                        <span className="text-slate-200 font-mono">
                          {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(exam.endTime))} WIB
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Durasi</div>
                    <div className="font-bold text-white mt-0.5">{exam.durationMinutes}m</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Total Soal</div>
                    <div className="font-bold text-blue-400 mt-0.5">{exam._count?.examQuestions || 0}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Peserta</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{exam._count?.examSessions || 0}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => router.push(`/admin/exams/${exam.id}/proctor`)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Proctoring</span>
                </button>

                <button
                  onClick={() => router.push(`/admin/exams/${exam.id}/analysis`)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  title="Analisis Butir Soal (Psikometri & Daya Beda)"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Analisis</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Exam Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Buat Konfigurasi Ujian Baru</h2>
            <p className="text-xs text-slate-400 mb-6">Lengkapi detail tes, durasi, token, dan anti-cheat.</p>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Judul Ujian</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="misal: Penilaian Akhir Semester (PAS) Matematika"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="PAS-MTK-2026"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mata Pelajaran</label>
                <select
                  required
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={360}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Token Ujian Masuk</label>
                  <input
                    type="text"
                    value={form.token}
                    onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })}
                    placeholder="ZYACBT"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Schedule (Start & End Time) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Jadwal Waktu Pelaksanaan (Opsional / Otomatis Buka-Tutup):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Waktu Mulai Dibuka</label>
                    <input
                      type="datetime-local"
                      value={form.startTime || ""}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Batas Waktu Ditutup</label>
                    <input
                      type="datetime-local"
                      value={form.endTime || ""}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Target Groups / Classes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Target Peserta Ujian (Rombel / Kelas):
                  </div>
                  <span className="text-[10px] text-slate-500">Kosongkan jika terbuka untuk semua kelas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-1">
                  {groups.map((g) => {
                    const isChecked = form.groupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, groupIds: [...form.groupIds, g.id] });
                            } else {
                              setForm({ ...form, groupIds: form.groupIds.filter((id) => id !== g.id) });
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Pengaturan Keamanan & Tampilan Hasil:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isTokenDynamic}
                      onChange={(e) => setForm({ ...form, isTokenDynamic: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Token Dinamis (Rotasi Tiap 15m)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requireKioskBrowser}
                      onChange={(e) => setForm({ ...form, requireKioskBrowser: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Wajib Exambro / Safe Exam Browser</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.shuffleQuestions}
                      onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Acak Urutan Soal Siswa</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.shuffleOptions}
                      onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Acak Opsi Pilihan (A, B, C, D)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/60">
                    <input
                      type="checkbox"
                      checked={form.showResult}
                      onChange={(e) => setForm({ ...form, showResult: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>
                      <strong>Tampilkan Nilai Langsung ke Siswa</strong> (Jika tidak dicentang, siswa akan melihat pesan apresiasi santun dan nilai disimpan rahasia)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                >
                  {creating ? "Menyimpan..." : "Simpan & Terbitkan Ujian"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Edit Pengaturan Ujian</h2>
            <p className="text-xs text-slate-400 mb-6">Ubah detail judul, token, durasi, dan anti-cheat.</p>

            <form onSubmit={handleUpdateExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Judul Ujian</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Durasi (Menit)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Token Ujian Masuk</label>
                  <input
                    type="text"
                    value={editForm.token}
                    onChange={(e) => setEditForm({ ...editForm, token: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Schedule (Start & End Time) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Jadwal Waktu Pelaksanaan (Opsional / Otomatis Buka-Tutup):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Waktu Mulai Dibuka</label>
                    <input
                      type="datetime-local"
                      value={editForm.startTime || ""}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Batas Waktu Ditutup</label>
                    <input
                      type="datetime-local"
                      value={editForm.endTime || ""}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Target Groups / Classes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Target Peserta Ujian (Rombel / Kelas):
                  </div>
                  <span className="text-[10px] text-slate-500">Kosongkan jika terbuka untuk semua kelas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-1">
                  {groups.map((g) => {
                    const isChecked = editForm.groupIds?.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-blue-500/15 border-blue-500/40 text-blue-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({ ...editForm, groupIds: [...(editForm.groupIds || []), g.id] });
                            } else {
                              setEditForm({ ...editForm, groupIds: (editForm.groupIds || []).filter((id: string) => id !== g.id) });
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Pengaturan Keamanan & Tampilan Hasil:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isTokenDynamic}
                      onChange={(e) => setEditForm({ ...editForm, isTokenDynamic: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Token Dinamis (Rotasi Tiap 15m)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.requireKioskBrowser}
                      onChange={(e) => setEditForm({ ...editForm, requireKioskBrowser: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Wajib Exambro / Safe Exam Browser</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.shuffleQuestions}
                      onChange={(e) => setEditForm({ ...editForm, shuffleQuestions: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Acak Urutan Soal Siswa</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.shuffleOptions}
                      onChange={(e) => setEditForm({ ...editForm, shuffleOptions: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Acak Opsi Pilihan (A, B, C, D)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-1 sm:col-span-2 pt-1 border-t border-slate-800/60">
                    <input
                      type="checkbox"
                      checked={editForm.showResult}
                      onChange={(e) => setEditForm({ ...editForm, showResult: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>
                      <strong>Tampilkan Nilai Langsung ke Siswa</strong> (Jika tidak dicentang, siswa akan melihat pesan apresiasi santun dan nilai disimpan rahasia)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
