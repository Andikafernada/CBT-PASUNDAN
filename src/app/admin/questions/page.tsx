"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  AlertTriangle,
  X,
  CheckSquare,
  Square,
  ShieldAlert,
  Save,
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

  // Checkbox Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk Delete Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState<"SUBJECT" | "TYPE" | "ALL">("SUBJECT");
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkType, setBulkType] = useState("MULTIPLE_CHOICE");
  const [confirmWipeText, setConfirmWipeText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // New Question Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qForm, setQForm] = useState<any>({
    subjectId: "",
    type: "MULTIPLE_CHOICE",
    content: "",
    difficulty: "MEDIUM",
    points: 1.0,
    rubric: "",
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

      if (qRes.ok) {
        const d = await qRes.json();
        setQuestions(d.questions || []);
      }
      if (subjRes.ok) {
        const s = await subjRes.json();
        setSubjects(s.subjects || []);
        if (s.subjects?.length > 0 && !bulkSubjectId) {
          setBulkSubjectId(s.subjects[0].id);
        }
      }
      // Reset selected checkboxes on reload
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = currentUser?.role === "TEACHER";

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        q.content.toLowerCase().includes(search.toLowerCase()) ||
        q.options?.some((opt: any) => opt.content.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [questions, search]);

  // Checkbox Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  // 1. Delete Selected via Checkbox
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} butir soal yang dipilih?`)) return;

    try {
      setLoading(true);
      const res = await fetch("/api/admin/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus butir soal terpilih");

      alert(`✅ Berhasil menghapus ${data.deletedCount || selectedIds.length} butir soal!`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  // 2. Delete Single
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus butir soal ini?")) return;

    try {
      const res = await fetch(`/api/admin/questions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setSelectedIds((prev) => prev.filter((x) => x !== id));
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menghapus soal");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Bulk Delete by Subject
  const handleExecuteDeleteBySubject = async () => {
    if (!bulkSubjectId) {
      alert("Pilih mata pelajaran terlebih dahulu.");
      return;
    }
    const targetSubj = subjects.find((s) => s.id === bulkSubjectId);
    const count = questions.filter((q) => q.subjectId === bulkSubjectId || q.topic?.subjectId === bulkSubjectId).length;

    if (!confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus seluruh butir soal pada mata pelajaran:\n"${targetSubj?.name || 'Mapel'}" (${count} butir soal).\n\nLanjutkan?`)) {
      return;
    }

    try {
      setBulkLoading(true);
      const res = await fetch(`/api/admin/questions?subjectId=${bulkSubjectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus soal mata pelajaran");

      alert(`✅ ${data.message || "Seluruh soal pada mata pelajaran ini berhasil dihapus!"}`);
      setShowBulkModal(false);
      loadData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // 4. Bulk Delete by Question Type
  const handleExecuteDeleteByType = async () => {
    if (!bulkType) {
      alert("Pilih tipe soal terlebih dahulu.");
      return;
    }
    const count = questions.filter((q) => q.type === bulkType).length;

    if (!confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus seluruh butir soal bertipe:\n"${bulkType}" (${count} butir soal).\n\nLanjutkan?`)) {
      return;
    }

    try {
      setBulkLoading(true);
      const res = await fetch(`/api/admin/questions?type=${bulkType}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus soal berdasarkan tipe");

      alert(`✅ ${data.message || "Seluruh soal dengan tipe ini berhasil dihapus!"}`);
      setShowBulkModal(false);
      loadData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // 5. Bulk Wipe ALL Question Bank
  const handleExecuteWipeAll = async () => {
    if (confirmWipeText.trim().toUpperCase() !== "HAPUS SEMUA") {
      alert("Silakan ketik teks verifikasi 'HAPUS SEMUA' persis sama untuk melanjutkan.");
      return;
    }

    try {
      setBulkLoading(true);
      const res = await fetch("/api/admin/questions?deleteAll=true", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengosongkan bank soal");

      alert(`✅ ${data.message || "Seluruh bank soal telah berhasil dikosongkan!"}`);
      setConfirmWipeText("");
      setShowBulkModal(false);
      loadData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setBulkLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title text-black flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-black" />
            {isTeacher ? "Review Soal Saya" : "Bank Soal & Review"}
          </h1>
          <p className="page-subtitle text-black">
            {isTeacher
              ? "Review dan kelola butir soal yang telah Anda buat atau import sendiri."
              : "Kelola kumpulan butir soal seluruh mata pelajaran, review konten, dan susun paket ujian."}
          </p>
        </div>

        <div className="header-actions">
          {!isTeacher && (
            <Link
              href="/admin/subjects"
              className="btn-default"
            >
              <Layers className="w-4 h-4 text-black" />
              <span className="text-black font-bold">Kelola Mapel & Topik</span>
            </Link>
          )}

          <Link
            href="/admin/questions/import"
            className="btn-default"
          >
            <FileSpreadsheet className="w-4 h-4 text-black" />
            <span className="text-black font-bold">Import Word / Excel</span>
          </Link>

          {/* Bulk Delete Modal Trigger Button */}
          <button
            onClick={() => {
              setConfirmWipeText("");
              setShowBulkModal(true);
            }}
            className="btn-danger"
            title="Buka menu hapus massal berdasarkan kategori atau kosongkan seluruh bank soal"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span className="text-white font-black">Hapus Massal (Bulk)</span>
          </button>

          <button
            onClick={() => {
              const firstSubj = subjects[0]?.id || "";
              setQForm({
                subjectId: firstSubj,
                type: "MULTIPLE_CHOICE",
                content: "",
                difficulty: "MEDIUM",
                points: 1.0,
                rubric: "",
                options: [
                  { content: "", isCorrect: true },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                ],
              });
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 text-black" />
            <span className="text-black font-black">Tambah Soal Manual</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass p-4 rounded-2xl shadow-soft border border-sky-300 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari konten pertanyaan..."
            className="form-input pl-10"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="form-input font-bold"
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
            className="form-input font-bold"
          >
            <option value="">Semua Tipe Soal</option>
            <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
            <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
            <option value="TRUE_FALSE">Benar / Salah</option>
            <option value="MATCHING">Menjodohkan</option>
            <option value="ESSAY">Esai / Uraian</option>
          </select>

          <span className="text-xs text-black shrink-0 font-bold">
            Total: <strong className="text-black font-black">{filteredQuestions.length}</strong> Butir Soal
          </span>
        </div>
      </div>

      {/* Checkbox Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 p-4 rounded-2xl bg-sky-200 border-2 border-sky-400 shadow-glow flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sky-600 animate-ping" />
            <span className="text-xs font-black text-black">
              {selectedIds.length} dari {filteredQuestions.length} butir soal dipilih
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="btn-default py-1.5 px-3 text-xs font-bold"
            >
              Batal Pilih
            </button>
            <button
              onClick={handleDeleteSelected}
              className="btn-danger py-1.5 px-4 text-xs font-black shadow-md flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Hapus {selectedIds.length} Soal Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Select All Toolbar */}
      {filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-black text-black hover:underline cursor-pointer"
          >
            {selectedIds.length === filteredQuestions.length ? (
              <CheckSquare className="w-4 h-4 text-black" />
            ) : (
              <Square className="w-4 h-4 text-black" />
            )}
            <span>
              {selectedIds.length === filteredQuestions.length
                ? "Batal Pilih Semua"
                : `Pilih Semua (${filteredQuestions.length} Soal)`}
            </span>
          </button>

          {selectedSubjectId && (
            <button
              onClick={() => {
                setBulkSubjectId(selectedSubjectId);
                setBulkTab("SUBJECT");
                setShowBulkModal(true);
              }}
              className="text-xs text-rose-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus Semua Soal Mapel Ini</span>
            </button>
          )}
        </div>
      )}

      {/* Question Cards List */}
      {loading ? (
        <div className="py-12 text-center text-black font-bold text-xs">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Memuat daftar soal...</span>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="glass p-12 text-center rounded-3xl shadow-soft">
          <FileQuestion className="w-12 h-12 text-black mx-auto mb-3 opacity-60" />
          <p className="text-sm font-black text-black">
            {isTeacher
              ? "Anda belum memiliki soal yang dibuat atau diimpor."
              : "Belum ada soal pada filter ini."}
          </p>
          <p className="text-xs text-black font-medium mt-1">
            Gunakan tombol &apos;Import Word / Excel&apos; atau &apos;Tambah Soal Manual&apos; di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isChecked = selectedIds.includes(q.id);

            return (
              <div
                key={q.id}
                className={`glass p-5 rounded-2xl transition shadow-soft space-y-4 border ${
                  isChecked
                    ? "border-2 border-sky-500 bg-sky-100/95 ring-2 ring-sky-300"
                    : "border-sky-300 hover:border-sky-400"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 border-b border-sky-200 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(q.id)}
                      className="w-4 h-4 rounded border-sky-400 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />

                    <span className="w-7 h-7 rounded-lg bg-sky-200 border border-sky-300 text-black flex items-center justify-center font-black text-xs">
                      {idx + 1}
                    </span>

                    {q.type === "MATCHING" ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-indigo-700" /> Menjodohkan
                      </span>
                    ) : q.type === "COMPLEX_MULTIPLE_CHOICE" ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-purple-700" /> PG Kompleks
                      </span>
                    ) : q.type === "TRUE_FALSE" ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        Benar / Salah
                      </span>
                    ) : q.type === "ESSAY" ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        Esai
                      </span>
                    ) : (
                      <span className="badge-info font-black">
                        Pilihan Ganda
                      </span>
                    )}

                    <span className="text-xs text-black font-bold">
                      {q.subject?.name || q.topic?.subject?.name || "Mata Pelajaran"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="badge-neutral font-black">
                      {q.difficulty}
                    </span>
                    <span className="text-xs font-black text-black">
                      Bobot: {q.points}
                    </span>

                    <button
                      onClick={() => {
                        setEditForm({
                          id: q.id,
                          subjectId: q.subjectId || q.topic?.subjectId,
                          content: q.content,
                          difficulty: q.difficulty,
                          points: q.points,
                          rubric: q.rubric || "",
                          type: q.type,
                          options: q.options?.map((o: any) => ({ content: o.content, isCorrect: o.isCorrect })) || [],
                          matchingPairs: q.matchingPairs?.map((p: any) => ({ premise: p.premise, response: p.response })) || [],
                        });
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-black hover:bg-sky-200 rounded-lg transition cursor-pointer"
                      title="Edit Soal"
                    >
                      <Edit2 className="w-4 h-4 text-black" />
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                      title="Hapus Soal Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="text-black font-semibold leading-relaxed text-sm">
                  <MathContent content={q.content} />
                </div>

                {/* Rubric for AI auto-grader if present */}
                {q.rubric && (
                  <div className="p-3 rounded-xl bg-sky-100/90 border border-sky-300 text-xs">
                    <span className="font-black text-black flex items-center gap-1 mb-1">
                      🤖 Rubrik Kunci AI:
                    </span>
                    <p className="text-black font-medium whitespace-pre-wrap">{q.rubric}</p>
                  </div>
                )}

                {/* Options list for PG / MC / TF */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-sky-100">
                    {q.options.map((opt: any, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={opt.id || optIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                            opt.isCorrect
                              ? "bg-sky-200 border-2 border-sky-400 font-black text-black"
                              : "bg-white border-sky-200 font-medium text-black"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${
                              opt.isCorrect ? "bg-sky-500 text-black font-black" : "bg-sky-100 text-black"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 truncate">{opt.content}</span>
                          {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Matching Pairs list for Menjodohkan */}
                {q.type === "MATCHING" && q.matchingPairs && q.matchingPairs.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-sky-100">
                    <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pasangan Menjodohkan ({q.matchingPairs.length} Pasangan):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.matchingPairs.map((pair: any, pIdx: number) => (
                        <div
                          key={pair.id || pIdx}
                          className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span className="w-5 h-5 rounded bg-indigo-200 text-indigo-900 flex items-center justify-center text-[10px] font-black shrink-0">
                              {pIdx + 1}
                            </span>
                            <span>{pair.premise}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-950 font-bold shadow-2xs">
                            <span className="text-indigo-500 font-black">➔</span>
                            <span className="break-words">{pair.response}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          BULK DELETE MODAL: Kategori Mapel, Kategori Tipe, atau Bulk All
          ============================================================ */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-container max-w-lg shadow-2xl border border-sky-300">
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2 text-black">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Menu Hapus Massal Bank Soal</span>
              </h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 text-black hover:bg-sky-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Tabs Selection */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-sky-200/80 border border-sky-300 rounded-xl text-xs font-black mb-4">
              <button
                type="button"
                onClick={() => setBulkTab("SUBJECT")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkTab === "SUBJECT"
                    ? "gradient-brand text-black shadow-glow border border-sky-300"
                    : "text-black hover:bg-sky-100"
                }`}
              >
                Per Mapel
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("TYPE")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkTab === "TYPE"
                    ? "gradient-brand text-black shadow-glow border border-sky-300"
                    : "text-black hover:bg-sky-100"
                }`}
              >
                Per Tipe Soal
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("ALL")}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  bulkTab === "ALL"
                    ? "bg-rose-600 text-white font-black"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                Kosongkan Semua
              </button>
            </div>

            {/* Tab 1: By Subject */}
            {bulkTab === "SUBJECT" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-sky-100 border border-sky-300 text-xs text-black font-semibold leading-relaxed">
                  Pilih mata pelajaran yang ingin dihapus seluruh butir soalnya. Soal pada mata pelajaran lain tidak akan terpengaruh.
                </div>

                <div>
                  <label className="form-label">Pilih Mata Pelajaran</label>
                  <select
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="form-input font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-white border border-sky-200 text-xs text-black flex justify-between items-center font-bold">
                  <span>Jumlah butir soal di mapel ini:</span>
                  <span className="badge-info font-black text-xs">
                    {questions.filter((q) => q.subjectId === bulkSubjectId || q.topic?.subjectId === bulkSubjectId).length} Butir Soal
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn-default flex-1 justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={bulkLoading}
                    onClick={handleExecuteDeleteBySubject}
                    className="btn-danger flex-1 justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>{bulkLoading ? "Menghapus..." : "Hapus Soal Mapel Ini"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: By Question Type */}
            {bulkTab === "TYPE" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-sky-100 border border-sky-300 text-xs text-black font-semibold leading-relaxed">
                  Pilih kategori tipe soal yang ingin dihapus (misal hapus semua Esai atau semua Pilihan Ganda Tunggal).
                </div>

                <div>
                  <label className="form-label">Pilih Kategori Tipe Soal</label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value)}
                    className="form-input font-bold"
                  >
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
                    <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
                    <option value="TRUE_FALSE">Benar / Salah</option>
                    <option value="MATCHING">Menjodohkan</option>
                    <option value="ESSAY">Esai / Uraian</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-white border border-sky-200 text-xs text-black flex justify-between items-center font-bold">
                  <span>Jumlah butir soal tipe {bulkType}:</span>
                  <span className="badge-info font-black text-xs">
                    {questions.filter((q) => q.type === bulkType).length} Butir Soal
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn-default flex-1 justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={bulkLoading}
                    onClick={handleExecuteDeleteByType}
                    className="btn-danger flex-1 justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>{bulkLoading ? "Menghapus..." : "Hapus Soal Tipe Ini"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Bulk All (Wipe Entire Bank) */}
            {bulkTab === "ALL" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-semibold space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                    <ShieldAlert className="w-5 h-5" />
                    <span>PERINGATAN BAHAYA: KOSONGKAN SELURUH BANK SOAL</span>
                  </div>
                  <p className="leading-relaxed">
                    Tindakan ini akan menghapus <strong>SELURUH ({questions.length}) butir soal</strong> yang ada di sistem secara permanen. Tindakan ini TIDAK DAPAT dibatalkan!
                  </p>
                </div>

                <div>
                  <label className="form-label text-rose-700">
                    Ketik verifikasi &quot;HAPUS SEMUA&quot; untuk melanjutkan:
                  </label>
                  <input
                    type="text"
                    value={confirmWipeText}
                    onChange={(e) => setConfirmWipeText(e.target.value)}
                    placeholder="Ketik HAPUS SEMUA"
                    className="form-input text-center font-black uppercase tracking-wider"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn-default flex-1 justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={bulkLoading || confirmWipeText.trim().toUpperCase() !== "HAPUS SEMUA"}
                    onClick={handleExecuteWipeAll}
                    className="btn-danger flex-1 justify-center disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>{bulkLoading ? "Mengosongkan..." : "KOSONGKAN SEMUA SOAL"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          NEW QUESTION MODAL
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container max-w-2xl shadow-2xl border border-sky-300">
            <div className="modal-header">
              <h2 className="modal-title">Tambah Butir Soal Baru</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-black hover:bg-sky-100 rounded-lg">
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Mata Pelajaran *</label>
                  <select
                    required
                    value={qForm.subjectId}
                    onChange={(e) => setQForm({ ...qForm, subjectId: e.target.value })}
                    className="form-input font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Tipe Soal *</label>
                  <select
                    value={qForm.type}
                    onChange={(e) => setQForm({ ...qForm, type: e.target.value })}
                    className="form-input font-bold"
                  >
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
                    <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
                    <option value="TRUE_FALSE">Benar / Salah</option>
                    <option value="ESSAY">Esai / Uraian</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Tingkat Kesulitan</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="form-input font-bold"
                  >
                    <option value="EASY">Mudah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HARD">Sulit</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Bobot / Poin</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qForm.points}
                    onChange={(e) => setQForm({ ...qForm, points: parseFloat(e.target.value) })}
                    className="form-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Konten / Teks Pertanyaan *</label>
                <textarea
                  rows={4}
                  required
                  value={qForm.content}
                  onChange={(e) => setQForm({ ...qForm, content: e.target.value })}
                  placeholder="Tulis pertanyaan di sini... Contoh rumus: $\\int_0^1 x^2 dx$ atau teks Arab: كِتَابٌ"
                  className="form-input resize-y"
                />
              </div>

              {qForm.type === "ESSAY" && (
                <div>
                  <label className="form-label text-black flex items-center gap-1.5">
                    🤖 Kunci Jawaban / Rubrik Penilaian AI (Auto-Grader)
                  </label>
                  <textarea
                    rows={3}
                    value={qForm.rubric || ""}
                    onChange={(e) => setQForm({ ...qForm, rubric: e.target.value })}
                    placeholder="Masukkan kata kunci acuan jawaban benar / poin-poin utama yang wajib ada dalam jawaban siswa..."
                    className="form-input resize-y"
                  />
                  <p className="text-[11px] text-black font-semibold mt-1">
                    AI akan mengoreksi jawaban esai siswa secara otomatis berdasarkan rubrik acuan ini saat ujian disubmit.
                  </p>
                </div>
              )}

              {/* Options Form for MC / TF */}
              {(qForm.type === "MULTIPLE_CHOICE" || qForm.type === "COMPLEX_MULTIPLE_CHOICE" || qForm.type === "TRUE_FALSE") && (
                <div className="space-y-2">
                  <label className="form-label">Pilihan Jawaban</label>
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
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition shrink-0 cursor-pointer ${
                            opt.isCorrect
                              ? "bg-sky-400 text-black border-2 border-sky-500 font-black shadow-xs"
                              : "bg-white text-black border border-sky-300 hover:bg-sky-100 font-bold"
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
                          className="form-input flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-sky-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-default"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{creating ? "Menyimpan..." : "Simpan Soal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT QUESTION MODAL
          ============================================================ */}
      {showEditModal && editForm && (
        <div className="modal-overlay">
          <div className="modal-container max-w-2xl shadow-2xl border border-sky-300">
            <div className="modal-header">
              <h2 className="modal-title">Edit Butir Soal</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 text-black hover:bg-sky-100 rounded-lg">
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Mata Pelajaran</label>
                  <select
                    value={editForm.subjectId || ""}
                    onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}
                    className="form-input font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipe Soal (Tetap)</label>
                  <input
                    disabled
                    value={editForm.type}
                    className="form-input font-bold opacity-75 bg-sky-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Tingkat Kesulitan</label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="form-input font-bold"
                  >
                    <option value="EASY">Mudah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HARD">Sulit</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Bobot / Poin</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.points}
                    onChange={(e) => setEditForm({ ...editForm, points: parseFloat(e.target.value) })}
                    className="form-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Konten / Teks Pertanyaan *</label>
                <textarea
                  rows={4}
                  required
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="form-input resize-y"
                />
              </div>

              {editForm.type === "ESSAY" && (
                <div>
                  <label className="form-label text-black flex items-center gap-1.5">
                    🤖 Kunci Jawaban / Rubrik Penilaian AI (Auto-Grader)
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.rubric || ""}
                    onChange={(e) => setEditForm({ ...editForm, rubric: e.target.value })}
                    className="form-input resize-y"
                  />
                </div>
              )}

              {/* Options Form for MC / TF */}
              {editForm.options && editForm.options.length > 0 && (
                <div className="space-y-2">
                  <label className="form-label">Pilihan Jawaban</label>
                  {editForm.options.map((opt: any, idx: number) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (editForm.type === "MULTIPLE_CHOICE" || editForm.type === "TRUE_FALSE") {
                              const newOpts = editForm.options.map((o: any, i: number) => ({
                                ...o,
                                isCorrect: i === idx,
                              }));
                              setEditForm({ ...editForm, options: newOpts });
                            } else {
                              const newOpts = [...editForm.options];
                              newOpts[idx].isCorrect = !newOpts[idx].isCorrect;
                              setEditForm({ ...editForm, options: newOpts });
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition shrink-0 cursor-pointer ${
                            opt.isCorrect
                              ? "bg-sky-400 text-black border-2 border-sky-500 font-black shadow-xs"
                              : "bg-white text-black border border-sky-300 hover:bg-sky-100 font-bold"
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
                          className="form-input flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-sky-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-default"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  <Save className="w-4 h-4 text-black" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
