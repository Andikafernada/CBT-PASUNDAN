"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Layers,
  FileQuestion,
  Search,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Subject Modals
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ id: "", name: "", code: "", description: "" });

  // Topic Modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: "", subjectId: "", name: "", code: "", description: "" });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      if (res.ok) setSubjects(data.subjects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!subjectForm.id;
      const res = await fetch("/api/admin/subjects", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SUBJECT", ...subjectForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan mata pelajaran");
      alert("Mata pelajaran berhasil disimpan!");
      setShowSubjectModal(false);
      setSubjectForm({ id: "", name: "", code: "", description: "" });
      fetchSubjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus mata pelajaran "${name}" beserta seluruh topik dan bank soal terkait?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/subjects?type=SUBJECT&id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      alert("Mata pelajaran berhasil dihapus");
      fetchSubjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!topicForm.id;
      const res = await fetch("/api/admin/subjects", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TOPIC", ...topicForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan topik");
      alert("Topik/Bab berhasil disimpan!");
      setShowTopicModal(false);
      setTopicForm({ id: "", subjectId: "", name: "", code: "", description: "" });
      fetchSubjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTopic = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus topik "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/subjects?type=TOPIC&id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      alert("Topik berhasil dihapus");
      fetchSubjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Mata Pelajaran & Topik Soal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola kurikulum mata pelajaran dan struktur topik/bab soal untuk bank soal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setTopicForm({ id: "", subjectId: subjects[0]?.id || "", name: "", code: "", description: "" });
              setShowTopicModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Topik/Bab</span>
          </button>

          <button
            onClick={() => {
              setSubjectForm({ id: "", name: "", code: "", description: "" });
              setShowSubjectModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mapel Baru</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mata pelajaran atau kode..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={fetchSubjects}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"
          title="Segarkan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Subject List Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Memuat mata pelajaran...</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">Belum ada data mata pelajaran.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSubjects.map((subject) => {
            const totalQuestions = subject.topics?.reduce(
              (acc: number, t: any) => acc + (t._count?.questions || 0),
              0
            );

            return (
              <div
                key={subject.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-200 dark:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{subject.name}</h2>
                          {subject.code && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {subject.code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {subject.topics?.length || 0} Topik • {totalQuestions || 0} Butir Soal
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSubjectForm({
                            id: subject.id,
                            name: subject.name,
                            code: subject.code || "",
                            description: subject.description || "",
                          });
                          setShowSubjectModal(true);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition"
                        title="Edit Mata Pelajaran"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-slate-900 dark:text-white rounded-lg transition"
                        title="Hapus Mata Pelajaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {subject.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{subject.description}</p>
                  )}

                  {/* Topics List under this subject */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Daftar Topik / Bab:</span>
                      <button
                        onClick={() => {
                          setTopicForm({ id: "", subjectId: subject.id, name: "", code: "", description: "" });
                          setShowTopicModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Topik</span>
                      </button>
                    </div>

                    {subject.topics && subject.topics.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5">
                        {subject.topics.map((topic: any) => (
                          <div
                            key={topic.id}
                            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-200 dark:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-semibold text-slate-200">{topic.name}</span>
                              {topic.code && (
                                <span className="text-[10px] text-slate-500 font-mono">({topic.code})</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                {topic._count?.questions || 0} Soal
                              </span>

                              <button
                                onClick={() => {
                                  setTopicForm({
                                    id: topic.id,
                                    subjectId: subject.id,
                                    name: topic.name,
                                    code: topic.code || "",
                                    description: topic.description || "",
                                  });
                                  setShowTopicModal(true);
                                }}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-400"
                                title="Edit Topik"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDeleteTopic(topic.id, topic.name)}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-400"
                                title="Hapus Topik"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-2">
                        Belum ada topik/bab. Klik &apos;Tambah Topik&apos; di atas.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Subject */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {subjectForm.id ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Lengkapi nama dan kode singkatan mata pelajaran.</p>

            <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="misal: Matematika Peminatan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Singkatan</label>
                <input
                  type="text"
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="misal: MTK-MIN"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Deskripsi / Keterangan</label>
                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Keterangan kurikulum..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Topic */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {topicForm.id ? "Edit Topik / Bab" : "Tambah Topik / Bab Baru"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Pilih mata pelajaran induk dan beri nama topik.</p>

            <form onSubmit={handleSaveTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mata Pelajaran Induk</label>
                <select
                  required
                  value={topicForm.subjectId}
                  onChange={(e) => setTopicForm({ ...topicForm, subjectId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Topik / Bab</label>
                <input
                  type="text"
                  required
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  placeholder="misal: Bab 1 - Limit Trigonometri"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kode Topik (Opsional)</label>
                <input
                  type="text"
                  value={topicForm.code}
                  onChange={(e) => setTopicForm({ ...topicForm, code: e.target.value.toUpperCase() })}
                  placeholder="misal: BAB-01"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30"
                >
                  Simpan Topik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
