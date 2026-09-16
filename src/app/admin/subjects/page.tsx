"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Layers,
  FileQuestion,
  Search,
  RefreshCw,
  X,
  Save,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    id: "",
    name: "",
    code: "",
    description: "",
  });

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicForm, setTopicForm] = useState({
    id: "",
    subjectId: "",
    name: "",
    code: "",
    description: "",
  });

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
    if (!confirm(`Yakin ingin menghapus "${name}" beserta seluruh topik dan soal terkait?`)) return;
    try {
      const res = await fetch(`/api/admin/subjects?type=SUBJECT&id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
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
      alert("Topik berhasil disimpan!");
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
      if (!res.ok) throw new Error(data.error || "Gagal menghapus topik");
      fetchSubjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
    );
  }, [subjects, search]);

  const openAddSubject = () => {
    setSubjectForm({ id: "", name: "", code: "", description: "" });
    setShowSubjectModal(true);
  };

  const openEditSubject = (s: any) => {
    setSubjectForm({ id: s.id, name: s.name, code: s.code || "", description: s.description || "" });
    setShowSubjectModal(true);
  };

  const openAddTopic = (subjectId: string) => {
    setTopicForm({ id: "", subjectId, name: "", code: "", description: "" });
    setShowTopicModal(true);
  };

  const openEditTopic = (t: any) => {
    setTopicForm({ id: t.id, subjectId: t.subjectId, name: t.name, code: t.code || "", description: t.description || "" });
    setShowTopicModal(true);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-black flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-black" />
            Mata Pelajaran & Topik
          </h1>
          <p className="page-subtitle text-black">
            Kelola mata pelajaran dan bab/topik kurikulum untuk pengelompokan bank soal.
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={fetchSubjects}
            className="btn-icon"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-black" />
          </button>
          <button
            onClick={openAddSubject}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 text-black" />
            <span className="text-black font-extrabold">Tambah Mata Pelajaran</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari mata pelajaran atau kode..."
          className="form-input pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-black font-bold">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="glass p-12 text-center rounded-3xl shadow-soft">
          <BookOpen className="w-12 h-12 text-black mx-auto mb-3 opacity-60" />
          <p className="text-sm font-black text-black">Belum ada mata pelajaran</p>
          <p className="text-xs text-black font-semibold mt-1">Klik tombol &apos;Tambah Mata Pelajaran&apos; untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubjects.map((subject) => (
            <div key={subject.id} className="glass overflow-hidden rounded-2xl shadow-soft border border-sky-300">
              {/* Subject Header */}
              <div className="flex items-center gap-3 p-4 bg-sky-100/70">
                <button
                  onClick={() => toggleExpand(subject.id)}
                  className="text-black hover:bg-sky-200 p-1 rounded-lg transition cursor-pointer"
                >
                  {expanded[subject.id] ? (
                    <ChevronDown className="w-5 h-5 text-black" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-black" />
                  )}
                </button>
                <div className="w-9 h-9 rounded-xl bg-sky-200 border border-sky-300 flex items-center justify-center text-black shrink-0 shadow-xs">
                  <BookOpen className="w-4 h-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-black truncate">
                      {subject.name}
                    </span>
                    {subject.code && (
                      <span className="badge-info font-black">
                        {subject.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-black font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-black" />
                      {subject.topics?.length || 0} Topik
                    </span>
                    <span className="text-[11px] text-black font-bold flex items-center gap-1">
                      <FileQuestion className="w-3 h-3 text-black" />
                      {subject.topics?.reduce(
                        (acc: number, t: any) => acc + (t._count?.questions || 0),
                        0
                      ) || 0}{" "}
                      Soal
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openAddTopic(subject.id)}
                    title="Tambah Topik"
                    className="btn-default py-1.5 px-2.5 text-[11px] font-black"
                  >
                    <Plus className="w-3.5 h-3.5 text-black" />
                    <span>Topik</span>
                  </button>
                  <button
                    onClick={() => openEditSubject(subject)}
                    className="p-2 rounded-xl bg-white border border-sky-200 text-black hover:bg-sky-50 transition cursor-pointer"
                    title="Edit Mata Pelajaran"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-black" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id, subject.name)}
                    className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    title="Hapus Mata Pelajaran"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Topics (expandable) */}
              {expanded[subject.id] && (
                <div className="border-t border-sky-200 divide-y divide-sky-100 bg-white/60">
                  {(!subject.topics || subject.topics.length === 0) ? (
                    <div className="px-6 py-4 text-xs text-black font-semibold italic">
                      Belum ada topik. Klik &apos;+ Topik&apos; untuk menambahkan bab/topik materi.
                    </div>
                  ) : (
                    subject.topics.map((topic: any) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-sky-50 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-black shrink-0">
                          <Layers className="w-3.5 h-3.5 text-black" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-black truncate">
                              {topic.name}
                            </span>
                            {topic.code && (
                              <span className="badge-neutral font-bold">
                                {topic.code}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-black font-semibold">
                            {topic._count?.questions || 0} butir soal terkelola
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditTopic(topic)}
                            className="p-1.5 rounded-lg bg-white border border-sky-200 text-black hover:bg-sky-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-black" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(topic.id, topic.name)}
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-container shadow-2xl border border-sky-300">
            <div className="modal-header">
              <h2 className="modal-title">
                {subjectForm.id ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
              </h2>
              <button onClick={() => setShowSubjectModal(false)} className="p-1.5 text-black hover:bg-sky-100 rounded-lg transition cursor-pointer">
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="form-label">Nama Mata Pelajaran *</label>
                <input
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="cth: Administrasi Server & Jaringan"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Kode Singkat *</label>
                <input
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="cth: TKJ-101"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Deskripsi</label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Deskripsi singkat mata pelajaran..."
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn-default flex-1 justify-center">
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  <Save className="w-3.5 h-3.5 text-black" />
                  <span>Simpan Mata Pelajaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="modal-overlay">
          <div className="modal-container shadow-2xl border border-sky-300">
            <div className="modal-header">
              <h2 className="modal-title">
                {topicForm.id ? "Edit Topik/Bab" : "Tambah Topik/Bab Baru"}
              </h2>
              <button onClick={() => setShowTopicModal(false)} className="p-1.5 text-black hover:bg-sky-100 rounded-lg transition cursor-pointer">
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
            <form onSubmit={handleSaveTopic} className="space-y-3">
              <div>
                <label className="form-label">Nama Topik/Bab *</label>
                <input
                  required
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                  placeholder="cth: DNS Server & Zone Configuration"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Kode Topik</label>
                <input
                  value={topicForm.code}
                  onChange={(e) => setTopicForm({ ...topicForm, code: e.target.value })}
                  placeholder="cth: DNS-01"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Deskripsi</label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  placeholder="Deskripsi singkat topik..."
                  rows={2}
                  className="form-input resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTopicModal(false)} className="btn-default flex-1 justify-center">
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  <Save className="w-3.5 h-3.5 text-black" />
                  <span>Simpan Topik</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
