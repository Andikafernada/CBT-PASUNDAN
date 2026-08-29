"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MathContent } from "@/components/MathContent";
import {
  FileQuestion,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  FolderPlus,
  BookOpen,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New Question Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qForm, setQForm] = useState<any>({
    subjectId: "",
    type: "MULTIPLE_CHOICE",
    content: "",
    difficulty: "MEDIUM",
    points: 1.0,
    options: [
      { content: "", isCorrect: true },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ],
  });

  // Edit Question Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedSubjectId, selectedType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qRes, subjRes] = await Promise.all([
        fetch(`/api/admin/questions?subjectId=${selectedSubjectId}&type=${selectedType}`),
        fetch("/api/admin/subjects"),
      ]);

      if (qRes.ok) setQuestions((await qRes.json()).questions || []);
      if (subjRes.ok) setSubjects((await subjRes.json()).subjects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan soal");

      alert("Butir soal berhasil ditambahkan!");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengupdate soal");

      alert("Soal berhasil diperbarui!");
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus butir soal ini?")) return;

    try {
      const res = await fetch(`/api/admin/questions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuestions(questions.filter((q) => q.id !== id));
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menghapus soal");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBySubject = async () => {
    if (!selectedSubjectId) {
      alert("Silakan pilih salah satu Mata Pelajaran pada filter terlebih dahulu untuk menghapus semua soalnya.");
      return;
    }

    const currentSubj = subjects.find((s) => s.id === selectedSubjectId);
    const subjName = currentSubj ? `${currentSubj.name} (${currentSubj.code})` : "Mata Pelajaran Ini";

    const confirmPrompt = prompt(
      `⚠️ PERINGATAN PENGHAPUSAN MASSAL!\n\nAnda akan menghapus SEMUA (${filteredQuestions.length}) butir soal pada:\n"${subjName}"\n\nKetik "HAPUS" dengan huruf kapital di bawah ini untuk konfirmasi:`
    );

    if (confirmPrompt !== "HAPUS") {
      if (confirmPrompt !== null) {
        alert("Penghapusan dibatalkan karena teks konfirmasi tidak sesuai.");
      }
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/questions?subjectId=${selectedSubjectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus soal mapel");

      alert(`✅ ${data.message || "Seluruh butir soal pada mata pelajaran ini berhasil dihapus!"}`);
      loadData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = currentUser?.role === "TEACHER";

  const filteredQuestions = questions.filter((q) => {
    const matchSearch =
      q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.options?.some((opt: any) => opt.content.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isTeacher ? "Review Soal Saya" : "Bank Soal & Review"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isTeacher
              ? "Review dan kelola butir soal yang telah Anda buat atau import sendiri."
              : "Kelola kumpulan butir soal seluruh mata pelajaran, review konten, dan susun paket ujian."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isTeacher && (
            <Link
              href="/admin/subjects"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>Kelola Mapel & Kelas</span>
            </Link>
          )}

          <Link
            href="/admin/questions/import"
            className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Word / Excel</span>
          </Link>

          <button
            onClick={() => {
              const firstSubj = subjects[0]?.id || "";
              setQForm({
                subjectId: firstSubj,
                type: "MULTIPLE_CHOICE",
                content: "",
                difficulty: "MEDIUM",
                points: 1.0,
                options: [
                  { content: "", isCorrect: true },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                ],
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal Manual</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari konten pertanyaan..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Semua Tipe Soal</option>
            <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
            <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
            <option value="TRUE_FALSE">Benar / Salah</option>
            <option value="MATCHING">Menjodohkan</option>
            <option value="ESSAY">Esai / Uraian</option>
          </select>

          {selectedSubjectId && filteredQuestions.length > 0 && (
            <button
              onClick={handleDeleteBySubject}
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Hapus seluruh butir soal pada mata pelajaran yang dipilih"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Soal Mapel Ini ({filteredQuestions.length})</span>
            </button>
          )}

          <span className="text-xs text-slate-500 shrink-0 font-medium">
            Total: <strong className="text-white">{filteredQuestions.length}</strong> Butir Soal
          </span>
        </div>
      </div>

      {/* Question Cards List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar soal...</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <FileQuestion className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {isTeacher
              ? "Anda belum memiliki soal yang dibuat atau diimpor."
              : "Belum ada soal pada filter ini."}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Gunakan tombol &apos;Import Word / Excel&apos; atau &apos;Tambah Soal Manual&apos; di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {q.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {q.subject?.name || q.topic?.subject?.name || "Mata Pelajaran"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {q.difficulty}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Bobot: {q.points}</span>

                  <button
                    onClick={() => {
                      setEditForm({
                        id: q.id,
                        subjectId: q.subjectId || q.topic?.subjectId,
                        content: q.content,
                        difficulty: q.difficulty,
                        points: q.points,
                        options: q.options?.map((o: any) => ({ content: o.content, isCorrect: o.isCorrect })) || [],
                      });
                      setShowEditModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                    title="Edit Soal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="text-sm font-medium text-slate-200 leading-relaxed pl-1">
                <MathContent content={q.content} />
              </div>

              {/* Options Preview */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {q.options.map((opt: any, optIdx: number) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <div
                        key={opt.id || optIdx}
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${
                          opt.isCorrect
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-semibold"
                            : "bg-slate-950/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            opt.isCorrect
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {letter}
                        </span>
                        <div className="flex-1">
                          <MathContent content={opt.content} />
                        </div>
                        {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Soal Manual */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-white mb-4">Tambah Butir Soal Baru</h2>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                  <select
                    required
                    value={qForm.subjectId}
                    onChange={(e) => setQForm({ ...qForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tingkat Kesukaran</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="EASY">Mudah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HARD">Sukar / Sulit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Bobot Skor</label>
                  <input
                    type="number"
                    step="0.1"
                    value={qForm.points}
                    onChange={(e) => setQForm({ ...qForm, points: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Pertanyaan / Soal</label>
                <textarea
                  rows={4}
                  required
                  value={qForm.content}
                  onChange={(e) => setQForm({ ...qForm, content: e.target.value })}
                  placeholder="Tulis pertanyaan di sini... Contoh rumus: $\int_0^1 x^2 dx$ atau teks Arab: كِتَابٌ"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Options Form for MC / TF */}
              {(qForm.type === "MULTIPLE_CHOICE" || qForm.type === "COMPLEX_MULTIPLE_CHOICE" || qForm.type === "TRUE_FALSE") && (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Pilihan Jawaban</label>
                  {qForm.options.map((opt: any, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (qForm.type === "MULTIPLE_CHOICE" || qForm.type === "TRUE_FALSE") {
                              const newOpts = qForm.options.map((o: any, i: number) => ({
                                ...o,
                                isCorrect: i === idx,
                              }));
                              setQForm({ ...qForm, options: newOpts });
                            } else {
                              const newOpts = [...qForm.options];
                              newOpts[idx].isCorrect = !newOpts[idx].isCorrect;
                              setQForm({ ...qForm, options: newOpts });
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition shrink-0 ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                          title={opt.isCorrect ? "Kunci Jawaban Benar" : "Jadikan Kunci Jawaban"}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          required
                          value={opt.content}
                          onChange={(e) => {
                            const newOpts = [...qForm.options];
                            newOpts[idx].content = e.target.value;
                            setQForm({ ...qForm, options: newOpts });
                          }}
                          placeholder={`Teks pilihan ${letter}...`}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                >
                  {creating ? "Menyimpan..." : "Simpan Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Soal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Butir Soal</h2>

            <form onSubmit={handleUpdateQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Konten Pertanyaan
                </label>
                <textarea
                  required
                  rows={4}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Options */}
              {editForm.options && editForm.options.length > 0 && (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Pilihan Jawaban & Kunci</label>
                  {editForm.options.map((opt: any, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = editForm.options.map((o: any, i: number) => ({
                              ...o,
                              isCorrect: i === idx,
                            }));
                            setEditForm({ ...editForm, options: newOpts });
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition shrink-0 ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          required
                          value={opt.content}
                          onChange={(e) => {
                            const newOpts = [...editForm.options];
                            newOpts[idx].content = e.target.value;
                            setEditForm({ ...editForm, options: newOpts });
                          }}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                >
                  Perbarui Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
