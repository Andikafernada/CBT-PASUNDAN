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
  ArrowLeft,
  Image as ImageIcon,
  Grid,
  List,
  Check,
  X,
  ChevronRight,
  HelpCircle,
  Eye,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import Link from "next/link";

interface SubjectItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  _count?: {
    questions: number;
  };
}

interface QuestionItem {
  id: string;
  subjectId: string;
  topicId?: string;
  type: string;
  content: string;
  imageUrl?: string | null;
  rubric?: string | null;
  difficulty: string;
  points: number;
  options?: Array<{
    id?: string;
    content: string;
    isCorrect: boolean;
    orderIndex?: number;
  }>;
  matchingPairs?: Array<{
    id?: string;
    premise: string;
    response: string;
    orderIndex?: number;
  }>;
  subject?: {
    name: string;
    code: string;
  };
}

export default function AdminQuestionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedJenjang, setSelectedJenjang] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // New Question Modal
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qForm, setQForm] = useState<any>({
    subjectId: "",
    type: "MULTIPLE_CHOICE",
    content: "",
    imageUrl: "",
    difficulty: "MEDIUM",
    points: 1.0,
    rubric: "",
    options: [
      { content: "", isCorrect: true },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ],
    matchingPairs: [
      { premise: "", response: "" },
      { premise: "", response: "" },
    ],
  });

  // Edit Question Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Load User & Subjects on Mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(console.error);

    loadSubjects();
  }, []);

  // Load Questions when selectedSubjectId or selectedType changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadQuestions(selectedSubjectId, selectedType);
    } else {
      setQuestions([]);
    }
  }, [selectedSubjectId, selectedType]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
      }
    } catch (e) {
      console.error("Gagal memuat daftar mapel:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (subjectId: string, type: string) => {
    try {
      setLoadingQuestions(true);
      const url = `/api/admin/questions?subjectId=${subjectId}${type ? `&type=${type}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error("Gagal memuat soal:", e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Helper to categorize subject by Jenjang
  const getSubjectJenjang = (s: SubjectItem) => {
    const text = `${s.name} ${s.code} ${s.description || ""}`.toUpperCase();
    if (text.includes("KELAS 12") || text.includes("KELAS XII") || s.code.startsWith("XII-")) return "XII";
    if (text.includes("KELAS 11") || text.includes("KELAS XI") || s.code.startsWith("XI-")) return "XI";
    if (text.includes("KELAS 10") || text.includes("KELAS X") || s.code.startsWith("X-")) return "X";
    return "LAINNYA";
  };

  // Filtered Subjects for Grid
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const jenjang = getSubjectJenjang(s);
      const matchJenjang = selectedJenjang === "ALL" || jenjang === selectedJenjang;
      const matchSearch =
        !subjectSearch ||
        s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(subjectSearch.toLowerCase()));
      return matchJenjang && matchSearch;
    });
  }, [subjects, selectedJenjang, subjectSearch]);

  // Counts by Jenjang
  const jenjangCounts = useMemo(() => {
    const counts = { ALL: subjects.length, X: 0, XI: 0, XII: 0, LAINNYA: 0 };
    subjects.forEach((s) => {
      const j = getSubjectJenjang(s);
      if (counts[j as keyof typeof counts] !== undefined) {
        counts[j as keyof typeof counts]++;
      }
    });
    return counts;
  }, [subjects]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Filtered Questions in active subject view
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!search) return true;
      const term = search.toLowerCase();
      const matchContent = q.content.toLowerCase().includes(term);
      const matchOptions = q.options?.some((opt) => opt.content.toLowerCase().includes(term));
      const matchPairs = q.matchingPairs?.some(
        (p) => p.premise.toLowerCase().includes(term) || p.response.toLowerCase().includes(term)
      );
      return matchContent || matchOptions || matchPairs;
    });
  }, [questions, search]);

  // Handlers for Question actions
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
      loadSubjects();
      if (selectedSubjectId) {
        loadQuestions(selectedSubjectId, selectedType);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengupdate soal");

      alert("Soal berhasil diperbarui secara langsung!");
      setShowEditModal(false);
      if (selectedSubjectId) {
        loadQuestions(selectedSubjectId, selectedType);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
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
        loadSubjects();
      } else {
        const d = await res.json();
        alert(d.error || "Gagal menghapus soal");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBySubject = async () => {
    if (!selectedSubjectId) return;

    const subjName = activeSubject ? `${activeSubject.name} (${activeSubject.code})` : "Mata Pelajaran Ini";

    const confirmPrompt = prompt(
      `⚠️ PERINGATAN PENGHAPUSAN MASSAL!\n\nAnda akan menghapus SEMUA (${questions.length}) butir soal pada:\n"${subjName}"\n\nKetik "HAPUS" dengan huruf kapital di bawah ini untuk konfirmasi:`
    );

    if (confirmPrompt !== "HAPUS") {
      if (confirmPrompt !== null) {
        alert("Penghapusan dibatalkan karena teks konfirmasi tidak sesuai.");
      }
      return;
    }

    try {
      setLoadingQuestions(true);
      const res = await fetch(`/api/admin/questions?subjectId=${selectedSubjectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus soal mapel");

      alert(`✅ ${data.message || "Seluruh butir soal pada mata pelajaran ini berhasil dihapus!"}`);
      loadSubjects();
      setSelectedSubjectId("");
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const isTeacher = currentUser?.role === "TEACHER";

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return { label: "Pilihan Ganda", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
      case "COMPLEX_MULTIPLE_CHOICE":
        return { label: "PG Kompleks", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "TRUE_FALSE":
        return { label: "Benar / Salah", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
      case "MATCHING":
        return { label: "Menjodohkan", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      case "ESSAY":
        return { label: "Esai / Uraian", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" };
      default:
        return { label: type, color: "bg-slate-500/15 text-slate-400 border-slate-500/30" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-xl md:text-2xl font-bold tracking-tight">
              {isTeacher ? "Review Soal Saya" : "Bank Soal & Review"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {subjects.length} Bank Soal Aktif
            </span>
          </div>
          <p className="page-subtitle text-xs md:text-sm text-slate-400 mt-1">
            Kelola kotak kategori soal per Jenjang (Kelas X, XI, XII), periksa isi butir soal, dan perbaiki langsung di web.
          </p>
        </div>

        <div className="header-actions flex flex-wrap items-center gap-2.5">
          {!isTeacher && (
            <Link href="/admin/subjects" className="btn-secondary text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Kelola Mapel</span>
            </Link>
          )}

          <Link
            href="/admin/questions/import"
            className="btn-secondary text-indigo-300 border-indigo-500/30 text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Word / Excel</span>
          </Link>

          <button
            onClick={() => {
              const defaultSubj = selectedSubjectId || subjects[0]?.id || "";
              setQForm({
                subjectId: defaultSubj,
                type: "MULTIPLE_CHOICE",
                content: "",
                imageUrl: "",
                difficulty: "MEDIUM",
                points: 1.0,
                rubric: "",
                options: [
                  { content: "", isCorrect: true },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                  { content: "", isCorrect: false },
                ],
                matchingPairs: [
                  { premise: "", response: "" },
                  { premise: "", response: "" },
                ],
              });
              setShowModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal Manual</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: GRID KOTAK KATEGORI MAPEL PER JENJANG */}
      {!selectedSubjectId ? (
        <div className="space-y-5">
          {/* Tab Jenjang Navigasi Kotak */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedJenjang("ALL")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  selectedJenjang === "ALL"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semua Jenjang</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {jenjangCounts.ALL}
                </span>
              </button>

              <button
                onClick={() => setSelectedJenjang("X")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  selectedJenjang === "X"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span>Kelas X</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {jenjangCounts.X}
                </span>
              </button>

              <button
                onClick={() => setSelectedJenjang("XI")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  selectedJenjang === "XI"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kelas XI</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {jenjangCounts.XI}
                </span>
              </button>

              <button
                onClick={() => setSelectedJenjang("XII")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  selectedJenjang === "XII"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                <span>Kelas XII</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                  {jenjangCounts.XII}
                </span>
              </button>
            </div>

            {/* Search Box for Subject Cards */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Cari nama kotak soal / mapel..."
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
              {subjectSearch && (
                <button
                  onClick={() => setSubjectSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Kotak-Kotak Card Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
              <div>Memuat data bank soal & jenjang...</div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-800/40 border border-slate-700/60 text-slate-400">
              <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-slate-300">
                Tidak ada kotak bank soal yang cocok dengan pencarian / tab ini.
              </p>
              <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau pilih tab &apos;Semua Jenjang&apos;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSubjects.map((s) => {
                const j = getSubjectJenjang(s);
                const qCount = s._count?.questions || 0;

                let jenjangColor = "bg-blue-500/15 text-blue-300 border-blue-500/30";
                if (j === "XI") jenjangColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                if (j === "XII") jenjangColor = "bg-purple-500/15 text-purple-300 border-purple-500/30";

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSubjectId(s.id)}
                    className="group relative cursor-pointer p-4 rounded-2xl bg-slate-800/70 hover:bg-slate-800/90 border border-slate-700 hover:border-blue-500/60 transition duration-200 shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${jenjangColor}`}>
                          Kelas {j}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                          {qCount} Butir Soal
                        </span>
                      </div>

                      {/* Subject Title */}
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition line-clamp-2 leading-snug">
                        {s.name}
                      </h3>

                      {/* Description / Code */}
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">
                        Kode: <span className="font-mono text-slate-300">{s.code}</span>
                      </p>
                    </div>

                    {/* Footer / Action */}
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-blue-400 group-hover:text-blue-300 font-medium">
                      <span>Buka & Periksa Soal</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: DETAIL REVIEW & EDIT BUTIR SOAL DARI MAPEL YANG DIPILIH */
        <div className="space-y-5">
          {/* Breadcrumb / Top Bar */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedSubjectId("");
                  setSearch("");
                  setSelectedType("");
                }}
                className="px-3 py-1.5 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Kotak Mapel</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white leading-tight">
                    {activeSubject?.name || "Mata Pelajaran"}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {filteredQuestions.length} Butir Soal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Kode: <span className="font-mono text-slate-300">{activeSubject?.code}</span> | Klik tombol &apos;Edit Soal&apos; pada butir manapun untuk perbaikan langsung.
                </p>
              </div>
            </div>

            {/* Quick Filter & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dropdown Jump to Subject */}
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s._count?.questions || 0} Soal)
                  </option>
                ))}
              </select>

              {/* Filter Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Tipe Soal</option>
                <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
                <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
                <option value="TRUE_FALSE">Benar / Salah</option>
                <option value="MATCHING">Menjodohkan</option>
                <option value="ESSAY">Esai / Uraian</option>
              </select>

              {/* Danger Action: Delete all questions in this subject */}
              {questions.length > 0 && (
                <button
                  onClick={handleDeleteBySubject}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  title="Hapus seluruh butir soal di mapel ini"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hapus Semua Soal</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar inside questions */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari teks soal, pilihan jawaban, atau pasangan di mata pelajaran ini..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Question Cards List */}
          {loadingQuestions ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2" />
              <div>Memuat butir soal...</div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-800/40 border border-slate-700 text-slate-400">
              <FileQuestion className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-slate-300">Belum ada butir soal pada filter ini.</p>
              <p className="text-xs text-slate-500 mt-1">Gunakan tombol &apos;Tambah Soal Manual&apos; di atas untuk mengisi soal.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const typeInfo = getQuestionTypeLabel(q.type);
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition shadow-lg space-y-4"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                          {q.difficulty}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">Bobot: {q.points}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditForm({
                              id: q.id,
                              subjectId: q.subjectId,
                              content: q.content,
                              imageUrl: q.imageUrl || "",
                              difficulty: q.difficulty,
                              points: q.points,
                              rubric: q.rubric || "",
                              type: q.type,
                              options:
                                q.options?.map((o) => ({
                                  content: o.content,
                                  isCorrect: o.isCorrect,
                                })) || [],
                              matchingPairs:
                                q.matchingPairs?.map((m) => ({
                                  premise: m.premise,
                                  response: m.response,
                                })) || [],
                            });
                            setShowEditModal(true);
                          }}
                          className="px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg transition flex items-center gap-1 font-semibold"
                          title="Perbaiki & Edit Soal Ini Langsung"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Soal</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-sm font-medium text-slate-100 leading-relaxed pl-1 whitespace-pre-line">
                      <MathContent content={q.content} />
                    </div>

                    {/* Embedded Image if any */}
                    {q.imageUrl && (
                      <div className="my-3 p-2 rounded-xl bg-slate-900 border border-slate-700 inline-block">
                        <img
                          src={q.imageUrl}
                          alt="Ilustrasi Soal"
                          className="max-h-72 object-contain rounded-lg shadow-md"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-mono">
                          <ImageIcon className="w-3 h-3 text-blue-400" />
                          <span>{q.imageUrl}</span>
                        </div>
                      </div>
                    )}

                    {/* OPTIONS PREVIEW (MC / COMPLEX MC / TRUE_FALSE) */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition ${
                                opt.isCorrect
                                  ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300 font-semibold"
                                  : "bg-slate-900/60 border-slate-700/60 text-slate-300"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  opt.isCorrect ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-300"
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

                    {/* MATCHING PAIRS PREVIEW */}
                    {q.matchingPairs && q.matchingPairs.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700 space-y-2">
                        <div className="text-xs font-bold text-purple-400 mb-2">Pasangan Jawaban (Menjodohkan):</div>
                        <div className="grid grid-cols-1 gap-2">
                          {q.matchingPairs.map((pair, pIdx) => (
                            <div
                              key={pair.id || pIdx}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                            >
                              <div className="flex-1 font-medium text-slate-100">{pair.premise}</div>
                              <span className="text-purple-400 font-bold px-2">↔️</span>
                              <div className="flex-1 font-semibold text-emerald-300 text-right">{pair.response}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ESSAY RUBRIC PREVIEW */}
                    {q.rubric && (
                      <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-700/50 text-xs space-y-1">
                        <span className="font-bold text-blue-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Kunci Jawaban / Rubrik Acuan Penilaian AI:
                        </span>
                        <p className="text-slate-300 leading-relaxed pl-5">{q.rubric}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL EDIT SOAL LANGSUNG (LIVE EDITOR) */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full p-6 rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit & Perbaiki Butir Soal Langsung</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Perubahan akan langsung disimpan ke database dan dievaluasi siswa saat ujian.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestion} className="space-y-4 text-xs">
              {/* Meta row: Subject, Type, Difficulty, Points */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                  <select
                    value={editForm.subjectId}
                    onChange={(e) => setEditForm({ ...editForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipe Soal</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
                    <option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks (Multi Kunci)</option>
                    <option value="TRUE_FALSE">Benar / Salah</option>
                    <option value="MATCHING">Menjodohkan</option>
                    <option value="ESSAY">Esai / Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kesukaran</label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
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
                    value={editForm.points}
                    onChange={(e) => setEditForm({ ...editForm, points: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Question Content */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Konten Teks Pertanyaan (Mendukung LaTeX math rumus: $f(x)$)
                </label>
                <textarea
                  required
                  rows={4}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white leading-relaxed font-sans"
                />
              </div>

              {/* Image URL with live preview */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>URL Gambar Soal (Opsional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.imageUrl || ""}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="/uploads/questions/... atau URL gambar lengkap"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                  {editForm.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, imageUrl: "" })}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-900/50 text-rose-400 rounded-xl border border-slate-700"
                    >
                      Hapus Gambar
                    </button>
                  )}
                </div>

                {editForm.imageUrl && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 inline-block">
                    <img
                      src={editForm.imageUrl}
                      alt="Preview Gambar"
                      className="max-h-48 object-contain rounded"
                    />
                  </div>
                )}
              </div>

              {/* OPTIONS EDITOR (For MC / Complex MC / TF) */}
              {(editForm.type === "MULTIPLE_CHOICE" ||
                editForm.type === "COMPLEX_MULTIPLE_CHOICE" ||
                editForm.type === "TRUE_FALSE") && (
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">
                      Pilihan Jawaban & Kunci Benar (Klik huruf untuk menentukan kunci jawaban)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = [...(editForm.options || [])];
                        newOpts.push({ content: "", isCorrect: false });
                        setEditForm({ ...editForm, options: newOpts });
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      + Tambah Pilihan
                    </button>
                  </div>

                  {editForm.options?.map((opt: any, idx: number) => {
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
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition shrink-0 ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
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
                            const newOpts = [...editForm.options];
                            newOpts[idx].content = e.target.value;
                            setEditForm({ ...editForm, options: newOpts });
                          }}
                          placeholder={`Teks pilihan ${letter}...`}
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                        />
                        {editForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = editForm.options.filter((_: any, i: number) => i !== idx);
                              setEditForm({ ...editForm, options: newOpts });
                            }}
                            className="p-2 text-slate-500 hover:text-rose-400 rounded-lg"
                            title="Hapus Pilihan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MATCHING PAIRS EDITOR */}
              {editForm.type === "MATCHING" && (
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-purple-400">
                      Pasangan Menjodohkan (Premis di Kiri &lt;=&gt; Jawaban di Kanan)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPairs = [...(editForm.matchingPairs || [])];
                        newPairs.push({ premise: "", response: "" });
                        setEditForm({ ...editForm, matchingPairs: newPairs });
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      + Tambah Pasangan
                    </button>
                  </div>

                  {editForm.matchingPairs?.map((pair: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={pair.premise}
                        onChange={(e) => {
                          const newPairs = [...editForm.matchingPairs];
                          newPairs[idx].premise = e.target.value;
                          setEditForm({ ...editForm, matchingPairs: newPairs });
                        }}
                        placeholder={`Pernyataan kiri ${idx + 1}...`}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                      />
                      <span className="text-purple-400 font-bold">↔️</span>
                      <input
                        type="text"
                        required
                        value={pair.response}
                        onChange={(e) => {
                          const newPairs = [...editForm.matchingPairs];
                          newPairs[idx].response = e.target.value;
                          setEditForm({ ...editForm, matchingPairs: newPairs });
                        }}
                        placeholder={`Jawaban kanan ${idx + 1}...`}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-right font-medium text-emerald-300"
                      />
                      {editForm.matchingPairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPairs = editForm.matchingPairs.filter((_: any, i: number) => i !== idx);
                            setEditForm({ ...editForm, matchingPairs: newPairs });
                          }}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ESSAY RUBRIC EDITOR */}
              {editForm.type === "ESSAY" && (
                <div className="border-t border-slate-700 pt-3">
                  <label className="block font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Kunci Acuan Jawaban / Rubrik Penilaian AI</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.rubric || ""}
                    onChange={(e) => setEditForm({ ...editForm, rubric: e.target.value })}
                    placeholder="Masukkan kata kunci acuan jawaban benar / poin-poin penting..."
                    className="w-full px-3 py-2 bg-blue-950/30 border border-blue-700/60 rounded-xl text-white"
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perbaikan Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SOAL MANUAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full p-6 rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Tambah Butir Soal Baru</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                  <select
                    required
                    value={qForm.subjectId}
                    onChange={(e) => setQForm({ ...qForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipe Soal</label>
                  <select
                    value={qForm.type}
                    onChange={(e) => setQForm({ ...qForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda Tunggal</option>
                    <option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks (Multi Kunci)</option>
                    <option value="TRUE_FALSE">Benar / Salah</option>
                    <option value="MATCHING">Menjodohkan</option>
                    <option value="ESSAY">Esai / Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kesukaran</label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
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
                  placeholder="Tulis pertanyaan di sini... Contoh rumus: $f(x) = 2x^2 + 5$"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white leading-relaxed font-sans"
                />
              </div>

              {/* OPTIONS FOR NEW QUESTION */}
              {(qForm.type === "MULTIPLE_CHOICE" ||
                qForm.type === "COMPLEX_MULTIPLE_CHOICE" ||
                qForm.type === "TRUE_FALSE") && (
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <label className="block font-semibold text-slate-300">Pilihan Jawaban</label>
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
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                          }`}
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
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ESSAY RUBRIC */}
              {qForm.type === "ESSAY" && (
                <div className="border-t border-slate-700 pt-3">
                  <label className="block font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Kunci Acuan Jawaban / Rubrik Penilaian AI</span>
                  </label>
                  <textarea
                    rows={3}
                    value={qForm.rubric || ""}
                    onChange={(e) => setQForm({ ...qForm, rubric: e.target.value })}
                    placeholder="Masukkan kata kunci acuan jawaban benar..."
                    className="w-full px-3 py-2 bg-blue-950/30 border border-blue-700/60 rounded-xl text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
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
    </div>
  );
}
