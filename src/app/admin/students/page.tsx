"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Users,
  Plus,
  Search,
  UserPlus,
  FolderPlus,
  Printer,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Download,
  School,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Key,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Filter,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Laptop,
} from "lucide-react";

export default function AdminStudentsPage() {
  const [activeTab, setActiveTab] = useState<"STUDENTS" | "GROUPS">("STUDENTS");
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState("");
  const [showBulkPasswordModal, setShowBulkPasswordModal] = useState(false);
  const [bulkNewPassword, setBulkNewPassword] = useState("123");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Single Item Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  // Forms
  const [studentForm, setStudentForm] = useState({
    name: "",
    username: "",
    password: "123",
    nis: "",
    groupId: "",
  });

  const [editStudentForm, setEditStudentForm] = useState<any>(null);

  const [groupForm, setGroupForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const [editGroupForm, setEditGroupForm] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Paginated Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGroup = selectedGroupId === "ALL" || s.groupId === selectedGroupId;
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase()) ||
        (s.nis || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.group?.name || "").toLowerCase().includes(search.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [students, selectedGroupId, search]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  // Bulk Selection Helpers
  const isAllPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudentIds.includes(s.id));

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      // Unselect page
      const pageIds = new Set(paginatedStudents.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      // Select entire page
      const pageIds = paginatedStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds(allFilteredIds);
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // --- BULK OPERATIONS ---
  const handleBulkResetPassword = async () => {
    if (selectedStudentIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_RESET_PASSWORD",
          ids: selectedStudentIds,
          newPassword: bulkNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset password massal");

      alert(`✅ Berhasil mereset password untuk ${data.count} siswa ke: "${bulkNewPassword}"`);
      setShowBulkPasswordModal(false);
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAssignGroup = async () => {
    if (selectedStudentIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_ASSIGN_GROUP",
          ids: selectedStudentIds,
          groupId: bulkTargetGroupId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memindahkan kelas siswa");

      alert(`✅ Berhasil memindahkan ${data.count} siswa ke kelas baru!`);
      setShowBulkGroupModal(false);
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkResetDevice = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Reset kunci perangkat untuk ${selectedStudentIds.length} siswa terpilih agar dapat login di komputer baru?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_RESET_DEVICE",
          ids: selectedStudentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset sesi perangkat");

      alert(`✅ Berhasil membuka kunci perangkat untuk ${data.count} siswa!`);
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedStudentIds.length} siswa terpilih? Seluruh data sesi dan nilai ujian mereka akan terhapus.`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_DELETE",
          ids: selectedStudentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus siswa massal");

      alert(`✅ Berhasil menghapus ${data.count} siswa.`);
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportSelectedExcel = () => {
    const targetStudents =
      selectedStudentIds.length > 0
        ? students.filter((s) => selectedStudentIds.includes(s.id))
        : filteredStudents;

    if (targetStudents.length === 0) {
      alert("Tidak ada data siswa untuk diexport");
      return;
    }

    const rows = targetStudents.map((s, idx) => ({
      No: idx + 1,
      NIS: s.nis || "-",
      "Nama Siswa": s.name,
      Username: s.username,
      "Password Default": "123",
      "Kelas / Rombel": s.group?.name || "Belum Ada Kelas",
      "Kode Kelas": s.group?.code || "-",
      "Status Kunci Perangkat": s.deviceFingerprint ? "Terkunci (Login Aktif)" : "Bebas",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Peserta CBT");
    XLSX.writeFile(wb, `DATA_PESERTA_CBT_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // --- SINGLE CRUD HANDLERS ---
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CREATE_STUDENT", ...studentForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat peserta");

      setShowStudentModal(false);
      setStudentForm({ name: "", username: "", password: "123", nis: "", groupId: "" });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_STUDENT", ...editStudentForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui data peserta");

      setShowEditStudentModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Hapus siswa '${name}'?`)) return;
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_STUDENT", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus siswa");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDevice = async (id: string, name: string) => {
    if (!confirm(`Reset kunci perangkat untuk siswa '${name}' agar dapat login di perangkat lain?`)) return;
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_STUDENT_DEVICE", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset perangkat");
      alert("✅ Kunci perangkat berhasil direset.");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CREATE_GROUP", ...groupForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat rombel");

      setShowGroupModal(false);
      setGroupForm({ code: "", name: "", description: "" });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_GROUP", ...editGroupForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui rombel");

      setShowEditGroupModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Hapus kelas '${name}'? Siswa dalam kelas ini akan dipindahkan ke kategori 'Belum Ada Kelas'.`)) return;
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_GROUP", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus rombel");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Metrics
  const lockedDeviceCount = students.filter((s) => s.deviceFingerprint).length;
  const unassignedGroupCount = students.filter((s) => !s.groupId).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen Peserta & Rombel</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              OPERATOR SUITE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola data akun siswa, pembagian kelas/jurusan, aksi massal (bulk), dan kontrol perangkat login ujian.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/users/import"
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import Excel</span>
          </Link>

          <Link
            href="/admin/print/cards"
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>Cetak Kartu Ujian</span>
          </Link>

          {activeTab === "STUDENTS" ? (
            <button
              onClick={() => setShowStudentModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          ) : (
            <button
              onClick={() => setShowGroupModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Siswa Terdaftar</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{students.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Akun siap mengikuti ujian</div>
          <Users className="w-8 h-8 text-blue-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Rombel / Kelas</div>
          <div className="text-2xl font-black text-purple-400 mt-1">{groups.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">TKJ, TKR, TPM, TSM, TAV</div>
          <School className="w-8 h-8 text-purple-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Terkunci di Perangkat</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{lockedDeviceCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Sesi Single-Device Aktif</div>
          <Laptop className="w-8 h-8 text-amber-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Belum Masuk Kelas</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{unassignedGroupCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Perlu di-assign ke Rombel</div>
          <AlertTriangle className="w-8 h-8 text-rose-500/20 absolute right-3 bottom-3" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("STUDENTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === "STUDENTS"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Peserta Siswa ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("GROUPS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === "GROUPS"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white dark:bg-slate-900"
          }`}
        >
          <School className="w-4 h-4" />
          <span>Daftar Rombel / Kelas ({groups.length})</span>
        </button>
      </div>

      {/* TAB 1: STUDENTS MANAGEMENT & BULK ACTIONS */}
      {activeTab === "STUDENTS" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama siswa, NIS, username, atau kelas..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Rombel / Kelas ({students.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g._count?.users || 0} Siswa)
                </option>
              ))}
            </select>

            <button
              onClick={handleExportSelectedExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
              title="Export data siswa ke Excel"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>

          {/* FLOATING BULK TOOLBAR (When 1 or more students selected) */}
          {selectedStudentIds.length > 0 && (
            <div className="bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-purple-950/90 border border-blue-500/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                  {selectedStudentIds.length}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedStudentIds.length} Siswa Terpilih
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-300">
                    Pilih aksi massal yang ingin diterapkan sekaligus:
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Select All Filtered Button */}
                {selectedStudentIds.length < filteredStudents.length && (
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold transition"
                  >
                    Pilih Semua ({filteredStudents.length})
                  </button>
                )}

                {/* Bulk Reset Password */}
                <button
                  onClick={() => setShowBulkPasswordModal(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Password (123)</span>
                </button>

                {/* Bulk Assign Class */}
                <button
                  onClick={() => setShowBulkGroupModal(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <School className="w-3.5 h-3.5" />
                  <span>Pindah Kelas</span>
                </button>

                {/* Bulk Reset Device Fingerprint */}
                <button
                  onClick={handleBulkResetDevice}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Device</span>
                </button>

                {/* Bulk Delete */}
                <button
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-900 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Massal</span>
                </button>

                {/* Clear Selection */}
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs transition"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-950/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAllPage}
                        className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                        title={isAllPageSelected ? "Batal pilih halaman ini" : "Pilih semua di halaman ini"}
                      >
                        {isAllPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-3">NIS</th>
                    <th className="py-3 px-4">Username CBT</th>
                    <th className="py-3 px-4">Rombel / Kelas</th>
                    <th className="py-3 px-4 text-center">Status Perangkat</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Memuat data siswa...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Tidak ada siswa yang sesuai dengan filter / pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((s, idx) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const isDeviceLocked = !!s.deviceFingerprint;
                      const globalIndex = (currentPage - 1) * pageSize + idx + 1;

                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? "bg-blue-950/25" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleSelectStudent(s.id)}
                              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">
                            {globalIndex}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div>{s.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              ID: {s.id.substring(0, 10)}...
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {s.nis || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-blue-400 font-semibold">
                              {s.username}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {s.group ? (
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                {s.group.name}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Belum Ada Kelas
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isDeviceLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Lock className="w-3 h-3" />
                                <span>Terkunci</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Unlock className="w-3 h-3" />
                                <span>Siap Login</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDeviceLocked && (
                                <button
                                  onClick={() => handleResetDevice(s.id, s.name)}
                                  className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-600 hover:text-slate-900 dark:text-white transition"
                                  title="Reset kunci perangkat"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditStudentForm({
                                    id: s.id,
                                    name: s.name,
                                    nis: s.nis || "",
                                    groupId: s.groupId || "",
                                    password: "",
                                  });
                                  setShowEditStudentModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-slate-900 dark:text-white transition"
                                title="Edit siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-600 hover:text-slate-900 dark:text-white transition"
                                title="Hapus siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Menampilkan {filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} s/d{" "}
                {Math.min(currentPage * pageSize, filteredStudents.length)} dari{" "}
                <span className="font-bold text-slate-900 dark:text-white">{filteredStudents.length}</span> Siswa
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-900 dark:text-white">
                  Hal {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUPS / ROMBEL MANAGEMENT */}
      {activeTab === "GROUPS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-200 dark:border-slate-700 transition relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wide">
                    {g.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditGroupForm({
                          id: g.id,
                          code: g.code,
                          name: g.name,
                          description: g.description || "",
                        });
                        setShowEditGroupModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-slate-900 dark:text-white transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-600 hover:text-slate-900 dark:text-white transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">{g.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{g.description || "Tidak ada keterangan."}</p>
              </div>

              <div className="border-t border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>{g._count?.users || 0} Peserta Siswa</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setActiveTab("STUDENTS");
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <span>Lihat Siswa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: BULK PASSWORD RESET */}
      {showBulkPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Reset Password Massal ({selectedStudentIds.length} Siswa)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Masukkan password baru yang akan diterapkan serentak ke seluruh siswa yang dipilih.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password Baru:</label>
              <input
                type="text"
                value={bulkNewPassword}
                onChange={(e) => setBulkNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkPasswordModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleBulkResetPassword}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition"
              >
                {actionLoading ? "Memproses..." : "Terapkan Password Baru"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK ASSIGN GROUP / CLASS */}
      {showBulkGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-purple-400" />
              <span>Pindah Kelas Massal ({selectedStudentIds.length} Siswa)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih Rombel / Kelas baru untuk {selectedStudentIds.length} siswa yang Anda pilih.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Kelas Baru:</label>
              <select
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Hapus Dari Kelas (Tanpa Kelas) --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkGroupModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleBulkAssignGroup}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition"
              >
                {actionLoading ? "Memproses..." : "Pindahkan Kelas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE STUDENT */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStudent}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              <span>Tambah Siswa Baru</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={studentForm.name}
                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="Contoh: Ahmad Fauzan"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username CBT *</label>
                <input
                  type="text"
                  required
                  value={studentForm.username}
                  onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                  placeholder="ahmad123"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS / NISN</label>
                <input
                  type="text"
                  value={studentForm.nis}
                  onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                  placeholder="20261001"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password Awal *</label>
              <input
                type="text"
                required
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombel / Kelas</label>
              <select
                value={studentForm.groupId}
                onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Pilih Kelas (Opsional) --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
              >
                Simpan Siswa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {showEditStudentModal && editStudentForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStudent}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-400" />
              <span>Edit Data Siswa</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={editStudentForm.name}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS / NISN</label>
              <input
                type="text"
                value={editStudentForm.nis}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, nis: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ganti Password (Kosongkan jika tidak diubah)</label>
              <input
                type="text"
                value={editStudentForm.password}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, password: e.target.value })}
                placeholder="Biarkan kosong jika tetap"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombel / Kelas</label>
              <select
                value={editStudentForm.groupId}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, groupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Tanpa Kelas --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditStudentModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE GROUP */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-400" />
              <span>Tambah Rombel / Kelas Baru</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kode Kelas (Singkat & Unik) *</label>
              <input
                type="text"
                required
                value={groupForm.code}
                onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                placeholder="Contoh: XI-TKJ-1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Kelas *</label>
              <input
                type="text"
                required
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Contoh: XI Teknik Komputer dan Jaringan 1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Jurusan</label>
              <input
                type="text"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Contoh: Jurusan TKJ - Lab Komputer 1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition"
              >
                Simpan Kelas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT GROUP */}
      {showEditGroupModal && editGroupForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateGroup}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-purple-400" />
              <span>Edit Rombel / Kelas</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kode Kelas *</label>
              <input
                type="text"
                required
                value={editGroupForm.code}
                onChange={(e) => setEditGroupForm({ ...editGroupForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Kelas *</label>
              <input
                type="text"
                required
                value={editGroupForm.name}
                onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Jurusan</label>
              <input
                type="text"
                value={editGroupForm.description}
                onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditGroupModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
