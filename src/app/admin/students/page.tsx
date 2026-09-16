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
  ShieldCheck,
  Shield,
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
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<"ALL" | "REGULER" | "PKL" | "SUSULAN">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState("");
  const [showBulkPasswordModal, setShowBulkPasswordModal] = useState(false);
  const [bulkNewPassword, setBulkNewPassword] = useState("");

  // Modal hasil generate/reset password (password asli hanya tampil SEKALI)
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialTitle, setCredentialTitle] = useState("");
  const [credentialList, setCredentialList] = useState<any[]>([]);

  // Delete All Students Modal State
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<"ALL" | "GROUP">("ALL");
  const [deleteAllGroupId, setDeleteAllGroupId] = useState("");
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("");
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // AI Student Generator Modal State (OpenCode)
  const [showAiModal, setShowAiModal] = useState(false);
  const [showStsModal, setShowStsModal] = useState(false);
  const [stsFile, setStsFile] = useState<File | null>(null);
  const [stsLoading, setStsLoading] = useState(false);
  const [stsResult, setStsResult] = useState<any>(null);
  const [aiStudentCount, setAiStudentCount] = useState(20);
  const [aiTargetGroupId, setAiTargetGroupId] = useState("");
  const [aiPrefix, setAiPrefix] = useState("siswa");
  const [aiPasswordType, setAiPasswordType] = useState<"READABLE_WORD" | "NUMERIC_PIN" | "RANDOM_ALPHANUMERIC" | "UNIFORM">("READABLE_WORD");
  const [aiCustomPassword, setAiCustomPassword] = useState("123456");
  const [aiUseOnline, setAiUseOnline] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);

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
    password: "",
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

  // Track Counts
  const regulerCount = useMemo(() => {
    return students.filter((s) => !s.bypassExambro && !s.group?.isPkl && !s.group?.bypassExambro && !/pkl|dudi|magang/i.test(s.group?.name || "")).length;
  }, [students]);

  const pklCount = useMemo(() => {
    return students.filter((s) => Boolean(s.group?.isPkl || s.group?.bypassExambro || /pkl|dudi|magang/i.test(s.group?.name || "") || /pkl|dudi|magang/i.test(s.group?.code || ""))).length;
  }, [students]);

  const susulanCount = useMemo(() => {
    return students.filter((s) => Boolean(s.bypassExambro && !s.group?.isPkl && !/pkl|dudi|magang/i.test(s.group?.name || ""))).length;
  }, [students]);

  // Filtered and Paginated Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const isPkl = Boolean(s.group?.isPkl || s.group?.bypassExambro || /pkl|dudi|magang/i.test(s.group?.name || "") || /pkl|dudi|magang/i.test(s.group?.code || ""));
      const isSusulan = Boolean(s.bypassExambro && !isPkl);
      const isReguler = !s.bypassExambro && !isPkl && !s.group?.bypassExambro;

      if (selectedTrackFilter === "REGULER" && !isReguler) return false;
      if (selectedTrackFilter === "PKL" && !isPkl) return false;
      if (selectedTrackFilter === "SUSULAN" && !isSusulan) return false;

      const matchGroup = selectedGroupId === "ALL" || s.groupId === selectedGroupId;
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase()) ||
        (s.nis || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.group?.name || "").toLowerCase().includes(search.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [students, selectedGroupId, search, selectedTrackFilter]);

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

      if (data.passwords && data.passwords.length > 0) {
        // Password digenerate acak per siswa -> tampilkan sekali
        setCredentialTitle(`Password Berhasil Digenerate (${data.passwords.length} Siswa)`);
        setCredentialList(
          data.passwords.map((p: any) => ({
            name: p.name,
            username: p.username,
            password: p.plainPassword || p.password,
          }))
        );
        setShowCredentialModal(true);
      } else {
        alert(`✅ Berhasil mereset password untuk ${data.count} siswa ke: "${bulkNewPassword}"`);
      }
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

  const handleBulkToggleBypass = async (bypass: boolean) => {
    if (selectedStudentIds.length === 0) return;
    const actionText = bypass
      ? "membebaskan siswa dari kewajiban Exambrowser (Bypass PKL / Susulan)"
      : "mengunci kembali siswa agar wajib memakai Exambrowser";
    if (!confirm(`Konfirmasi ${actionText} untuk ${selectedStudentIds.length} siswa terpilih?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_TOGGLE_BYPASS_EXAMBRO",
          ids: selectedStudentIds,
          bypassExambro: bypass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status bypass");

      alert(`✅ Berhasil memperbarui status bypass untuk ${data.count} siswa!`);
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleGroupBypass = async (id: string, currentBypass: boolean, name: string) => {
    const nextBypass = !currentBypass;
    const msg = nextBypass
      ? `Bebaskan SELURUH SISWA di kelas '${name}' dari Exambrowser (Jalur PKL / Luar Lab)? Semua siswa di kelas ini akan diizinkan ujian via Google Chrome/Edge/HP.`
      : `Kunci kembali SELURUH SISWA di kelas '${name}' agar WAJIB memakai Exambrowser Resmi (Jalur Reguler PC Lab)?`;
    if (!confirm(msg)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_GROUP_BYPASS_EXAMBRO",
          id,
          bypassExambro: nextBypass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status bypass kelas");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSingleBypass = async (id: string, currentBypass: boolean, name: string) => {
    const nextBypass = !currentBypass;
    const msg = nextBypass
      ? `Bebaskan siswa '${name}' dari Exambrowser (Bypass Susulan/PKL)? Siswa akan dapat mengerjakan ujian via browser standar (Chrome/Edge/HP).`
      : `Kunci kembali siswa '${name}' agar WAJIB menggunakan Exambrowser Resmi di Lab?`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_BYPASS_EXAMBRO",
          id,
          bypassExambro: nextBypass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status bypass");
      loadData();
    } catch (err: any) {
      alert(err.message);
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

  const handleDeleteAllStudents = async () => {
    if (deleteAllConfirmText !== "HAPUS SEMUA SISWA") return;
    setDeleteAllLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_ALL_STUDENTS",
          groupId: deleteAllScope === "GROUP" ? deleteAllGroupId : "ALL",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus semua data siswa");

      alert(`✅ ${data.message || `Berhasil menghapus ${data.count} siswa.`}`);
      setShowDeleteAllModal(false);
      setDeleteAllConfirmText("");
      handleClearSelection();
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteAllLoading(false);
    }
  };

  // Handler for direct STS template import on Students page
  const handleProcessStsTemplate = async () => {
    if (!stsFile) {
      alert("Pilih file template Excel terlebih dahulu.");
      return;
    }
    try {
      setStsLoading(true);
      const formData = new FormData();
      formData.append("file", stsFile);
      formData.append("defaultRole", "STUDENT");

      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses file template STS");

      setStsResult(data);

      // Trigger automatic download of filled Excel safely
      if (data.fileBase64) {
        try {
          const byteCharacters = atob(data.fileBase64);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.downloadFileName || "DAFTAR_PESERTA_DENGAN_AKUN_CBT.xlsx";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (downloadErr) {
          console.warn("Auto download triggered a warning:", downloadErr);
        }
      }

      alert(`✅ Berhasil memproses ${data.totalRows || (data.createdCount + data.updatedCount)} siswa dari ${data.sheetsProcessed?.length || 1} sheet!\n\nFile Excel terisi lengkap dengan Username & Password telah otomatis diunduh.`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStsLoading(false);
    }
  };

  const handleGenerateAiStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiGenerating(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_AI_STUDENTS",
          count: aiStudentCount,
          groupId: aiTargetGroupId || null,
          prefix: aiPrefix,
          passwordType: aiPasswordType,
          customPassword: aiCustomPassword,
          useAI: aiUseOnline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun siswa AI");

      setShowAiModal(false);
      const creds = data.credentials || data.students || [];
      if (creds.length > 0) {
        setCredentialTitle(`Akun Siswa Otomatis Berhasil Dibuat (${creds.length} Siswa)`);
        setCredentialList(creds);
        setShowCredentialModal(true);
      } else {
        alert(`✅ ${data.message || `Berhasil membuat ${data.count} siswa.`}`);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAiGenerating(false);
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
      "Kelas / Rombel": s.group?.name || "Belum Ada Kelas",
      "Kode Kelas": s.group?.code || "-",
      "Status Kunci Perangkat": s.deviceFingerprint ? "Terkunci (Login Aktif)" : "Bebas",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Peserta CBT");
    XLSX.writeFile(wb, `DATA_PESERTA_CBT_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export kartu akses (berisi password asli) dari hasil generate/reset terakhir.
  // Password hanya tersedia SEKALI pada response - bukan dari data siswa biasa.
  const handleExportCredentialExcel = () => {
    if (credentialList.length === 0) {
      alert("Tidak ada data password untuk diexport.");
      return;
    }
    const rows = credentialList.map((c, idx) => ({
      No: idx + 1,
      "Nama Lengkap": c.name || "",
      Username: c.username || "",
      Password: c.password || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 32 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kartu Akses CBT");
    XLSX.writeFile(wb, `Kartu_Akses_CBT_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      const newPassword = data.plainPassword;
      setCredentialTitle(`Password Siswa Baru: ${data.student?.name || ""}`);
      setCredentialList([{ name: data.student?.name || "", username: data.student?.username || "", password: newPassword }]);
      setShowCredentialModal(true);
      setStudentForm({ name: "", username: "", password: "", nis: "", groupId: "" });
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
      if (data.plainPassword) {
        setCredentialTitle(`Password Diperbarui: ${data.student?.name || ""}`);
        setCredentialList([{ name: data.student?.name || "", username: data.student?.username || "", password: data.plainPassword }]);
        setShowCredentialModal(true);
      }
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
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Manajemen Peserta & Rombel</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              OPERATOR SUITE
            </span>
          </div>
          <p className="page-subtitle">
            Kelola data akun siswa, pembagian kelas/jurusan, aksi massal (bulk), dan kontrol perangkat login ujian.
          </p>
        </div>

        <div className="header-actions">
          <a
            href="/templates/TEMPLATE_DAFTAR_PESERTA_STS.xlsx"
            download="TEMPLATE_DAFTAR_PESERTA_STS.xlsx"
            className="btn-secondary text-sky-900 border-sky-300 hover:bg-sky-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download Template Format STS (Multi-Sheet X, XI, XII)"
          >
            <Download className="w-4 h-4 text-sky-700" />
            <span className="font-black text-sky-950">Download Template STS</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setStsFile(null);
              setStsResult(null);
              setShowStsModal(true);
            }}
            className="btn-secondary text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Import File Excel STS / Daftar Peserta & Auto-Generate Kredensial"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="font-black text-emerald-900">Import Template STS (Excel)</span>
          </button>

          <Link
            href="/admin/print/cards"
            className="btn-secondary text-purple-300 border-purple-500/30"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            <span>Cetak Kartu Ujian</span>
          </Link>

          {activeTab === "STUDENTS" && (
            <button
              onClick={() => {
                setDeleteAllScope("ALL");
                setDeleteAllGroupId(selectedGroupId === "ALL" ? "" : selectedGroupId);
                setDeleteAllConfirmText("");
                setShowDeleteAllModal(true);
              }}
              className="btn-secondary text-rose-600 border-rose-300 hover:bg-rose-50"
              title="Hapus Semua Data Siswa"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="font-bold text-rose-600">Hapus Semua Siswa</span>
            </button>
          )}

          {activeTab === "STUDENTS" && (
            <button
              onClick={() => {
                setAiStudentCount(20);
                setAiTargetGroupId(selectedGroupId === "ALL" ? "" : selectedGroupId);
                setAiPrefix("siswa");
                setShowAiModal(true);
              }}
              className="btn-secondary text-blue-700 border-blue-300 hover:bg-blue-50 flex items-center gap-1.5 shadow-sm"
              title="Buat Akun Siswa Otomatis menggunakan AI OpenCode"
            >
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="font-bold text-blue-700">Generate Siswa (AI)</span>
            </button>
          )}

          {activeTab === "STUDENTS" ? (
            <button
              onClick={() => setShowStudentModal(true)}
              className="btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          ) : (
            <button
              onClick={() => setShowGroupModal(true)}
              className="btn-primary"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-sky-100 border border-slate-200 dark:border-sky-200 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Siswa Terdaftar</div>
          <div className="text-2xl font-black text-slate-900 dark:text-black mt-1">{students.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Akun siap mengikuti ujian</div>
          <Users className="w-8 h-8 text-blue-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-sky-100 border border-slate-200 dark:border-sky-200 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Rombel / Kelas</div>
          <div className="text-2xl font-black text-purple-400 mt-1">{groups.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">TKJ, TKR, TPM, TSM, TAV</div>
          <School className="w-8 h-8 text-purple-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-sky-100 border border-slate-200 dark:border-sky-200 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Terkunci di Perangkat</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{lockedDeviceCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Sesi Single-Device Aktif</div>
          <Laptop className="w-8 h-8 text-amber-500/20 absolute right-3 bottom-3" />
        </div>

        <div className="p-4 rounded-2xl bg-sky-100 border border-slate-200 dark:border-sky-200 shadow-xl relative overflow-hidden">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Belum Masuk Kelas</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{unassignedGroupCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Perlu di-assign ke Rombel</div>
          <AlertTriangle className="w-8 h-8 text-rose-500/20 absolute right-3 bottom-3" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-sky-200 pb-2">
        <button
          onClick={() => setActiveTab("STUDENTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === "STUDENTS"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-black hover:bg-white dark:bg-sky-50"
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
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-black hover:bg-white dark:bg-sky-50"
          }`}
        >
          <School className="w-4 h-4" />
          <span>Daftar Rombel / Kelas ({groups.length})</span>
        </button>
      </div>

      {/* TAB 1: STUDENTS MANAGEMENT & BULK ACTIONS */}
      {activeTab === "STUDENTS" && (
        <div className="space-y-4">
          {/* 🛡️ Track Filter Segment Bar: Reguler vs PKL vs Susulan */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 shrink-0">Jalur Ujian:</span>
            <button
              onClick={() => { setSelectedTrackFilter("ALL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTrackFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              🏢 Semua ({students.length})
            </button>
            <button
              onClick={() => { setSelectedTrackFilter("REGULER"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTrackFilter === "REGULER"
                  ? "bg-cyan-700 text-white shadow-xs"
                  : "bg-white hover:bg-slate-100 text-cyan-800 border border-cyan-200"
              }`}
            >
              🏫 Reguler Lab ({regulerCount})
            </button>
            <button
              onClick={() => { setSelectedTrackFilter("PKL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTrackFilter === "PKL"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white hover:bg-slate-100 text-amber-800 border border-amber-200"
              }`}
            >
              📱 PKL / Magang ({pklCount})
            </button>
            <button
              onClick={() => { setSelectedTrackFilter("SUSULAN"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTrackFilter === "SUSULAN"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-white hover:bg-slate-100 text-purple-800 border border-purple-200"
              }`}
            >
              📋 Susulan HP ({susulanCount})
            </button>
          </div>

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
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black font-semibold focus:outline-none focus:border-blue-500"
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
            <div className="bg-sky-100 border border-sky-300 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-700 font-black text-sm">
                  {selectedStudentIds.length}
                </span>
                <div>
                  <div className="text-xs font-bold text-black">
                    {selectedStudentIds.length} Siswa Terpilih
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Pilih aksi massal yang ingin diterapkan sekaligus:
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Select All Filtered Button */}
                {selectedStudentIds.length < filteredStudents.length && (
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-blue-700 border border-blue-300 rounded-lg text-[11px] font-semibold transition shadow-xs"
                  >
                    Pilih Semua ({filteredStudents.length})
                  </button>
                )}

                {/* Bulk Reset Password */}
                <button
                  onClick={() => setShowBulkPasswordModal(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>

                {/* Bulk Assign Class */}
                <button
                  onClick={() => setShowBulkGroupModal(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <School className="w-3.5 h-3.5" />
                  <span>Pindah Kelas</span>
                </button>

                {/* Bulk Bypass Exambro */}
                <button
                  onClick={() => handleBulkToggleBypass(true)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                  title="Bebaskan siswa terpilih dari kewajiban Exambrowser (untuk siswa Susulan / PKL)"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Bypass Exambro</span>
                </button>

                {/* Bulk Lock Exambro */}
                <button
                  onClick={() => handleBulkToggleBypass(false)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                  title="Kunci kembali siswa terpilih agar wajib memakai Exambrowser"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kunci Exambro</span>
                </button>

                {/* Bulk Reset Device Fingerprint */}
                <button
                  onClick={handleBulkResetDevice}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Device</span>
                </button>

                {/* Bulk Delete */}
                <button
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih</span>
                </button>

                {/* Clear Selection */}
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 bg-sky-200 hover:bg-sky-300 text-black font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="glass overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-sky-50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-sky-200">
                    <th className="py-3 px-4 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAllPage}
                        className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-black"
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
                          className={`hover:bg-sky-100 transition ${
                            isSelected ? "bg-blue-950/25" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleSelectStudent(s.id)}
                              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-black"
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
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-black">
                            <div>{s.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              ID: {s.id.substring(0, 10)}...
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {s.nis || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono px-2 py-0.5 rounded bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 text-blue-400 font-semibold">
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
                            <div className="flex flex-col items-center gap-1">
                              {/* Status Bypass Exambro */}
                              {Boolean(s.bypassExambro || s.group?.isPkl || s.group?.bypassExambro) ? (
                                <button
                                  onClick={() => handleToggleSingleBypass(s.id, true, s.name)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer"
                                  title="Siswa dibebaskan dari Exambrowser (Klik untuk mengunci kembali)"
                                >
                                  <Shield className="w-3 h-3" />
                                  <span>Bypass (Bebas)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleSingleBypass(s.id, false, s.name)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer"
                                  title="Wajib pakai Exambro Lab (Klik untuk membebaskan jika PKL/Susulan)"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Wajib Exambro</span>
                                </button>
                              )}

                              {/* Status Device Lock */}
                              {isDeviceLocked ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Device Terkunci</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-500/15 text-slate-400">
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>Device Bebas</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDeviceLocked && (
                                <button
                                  onClick={() => handleResetDevice(s.id, s.name)}
                                  className="p-1.5 rounded-lg bg-sky-100 text-amber-400 hover:bg-amber-600 hover:text-slate-900 dark:text-black transition"
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
                                className="p-1.5 rounded-lg bg-sky-100 text-blue-400 hover:bg-blue-600 hover:text-slate-900 dark:text-black transition"
                                title="Edit siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="p-1.5 rounded-lg bg-sky-100 text-rose-400 hover:bg-rose-600 hover:text-slate-900 dark:text-black transition"
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
            <div className="p-4 border-t border-slate-200 dark:border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Menampilkan {filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} s/d{" "}
                {Math.min(currentPage * pageSize, filteredStudents.length)} dari{" "}
                <span className="font-bold text-slate-900 dark:text-black">{filteredStudents.length}</span> Siswa
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-2 rounded-xl bg-sky-100 border border-slate-200 dark:border-sky-200 text-slate-900 dark:text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-lg font-bold text-slate-900 dark:text-black">
                  Hal {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-2 rounded-xl bg-sky-100 border border-slate-200 dark:border-sky-200 text-slate-900 dark:text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition"
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
              className="glass p-5 flex flex-col justify-between hover:shadow-glow transition relative overflow-hidden"
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
                      className="p-1.5 rounded-lg bg-sky-100 text-blue-400 hover:bg-blue-600 hover:text-slate-900 dark:text-black transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      className="p-1.5 rounded-lg bg-sky-100 text-rose-400 hover:bg-rose-600 hover:text-slate-900 dark:text-black transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-black">{g.name}</h3>
                <div className="mt-2 mb-1">
                  <button
                    onClick={() => handleToggleGroupBypass(g.id, Boolean(g.bypassExambro || g.isPkl), g.name)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      Boolean(g.bypassExambro || g.isPkl)
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                        : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25"
                    }`}
                    title="Klik untuk mengubah jalur kelas"
                  >
                    {Boolean(g.bypassExambro || g.isPkl) ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Jalur PKL (Bebas Browser/HP)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Jalur Reguler (Wajib Exambro)</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{g.description || "Tidak ada keterangan."}</p>
              </div>

              <div className="border-t border-sky-300/80 pt-3 mt-4 flex items-center justify-between text-xs">
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
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Reset Password Massal ({selectedStudentIds.length} Siswa)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kosongkan untuk menghasilkan password acak unik per siswa (direkomendasikan), atau isi password
              yang sama untuk semua siswa terpilih.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password Baru (Opsional - kosongkan untuk acak):
              </label>
              <input
                type="text"
                value={bulkNewPassword}
                onChange={(e) => setBulkNewPassword(e.target.value)}
                placeholder="Biarkan kosong untuk generate acak"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkPasswordModal(false)}
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleBulkResetPassword}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-black font-bold rounded-xl text-xs transition"
              >
                {actionLoading ? "Memproses..." : "Terapkan Password Baru"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK ASSIGN GROUP / CLASS */}
      {showBulkGroupModal && (
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-semibold focus:outline-none focus:border-purple-500"
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
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleBulkAssignGroup}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-black font-bold rounded-xl text-xs transition"
              >
                {actionLoading ? "Memproses..." : "Pindahkan Kelas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE STUDENT */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateStudent}
            className="glass max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-blue-500"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS / NISN</label>
                <input
                  type="text"
                  value={studentForm.nis}
                  onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                  placeholder="20261001"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono focus:outline-none focus:border-blue-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombel / Kelas</label>
              <select
                value={studentForm.groupId}
                onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-blue-500"
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
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
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
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStudent}
            className="glass max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS / NISN</label>
              <input
                type="text"
                value={editStudentForm.nis}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, nis: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ganti Password (Kosongkan jika tidak diubah)</label>
              <input
                type="text"
                value={editStudentForm.password}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, password: e.target.value })}
                placeholder="Biarkan kosong jika tetap"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombel / Kelas</label>
              <select
                value={editStudentForm.groupId}
                onChange={(e) => setEditStudentForm({ ...editStudentForm, groupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-blue-500"
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
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
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
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="glass max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Jurusan</label>
              <input
                type="text"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Contoh: Jurusan TKJ - Lab Komputer 1"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-black font-bold rounded-xl text-xs transition"
              >
                Simpan Kelas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT GROUP */}
      {showEditGroupModal && editGroupForm && (
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateGroup}
            className="glass max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Kelas *</label>
              <input
                type="text"
                required
                value={editGroupForm.name}
                onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Jurusan</label>
              <input
                type="text"
                value={editGroupForm.description}
                onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-slate-900 dark:text-black text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditGroupModal(false)}
                className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-black font-bold rounded-xl text-xs transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Hasil Generate/Reset Password (tampil SEKALI) */}
      {showCredentialModal && credentialList.length > 0 && (
        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <span>{credentialTitle}</span>
              </h3>
              <button
                onClick={() => setShowCredentialModal(false)}
                className="p-2 bg-sky-100 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
              >
                Tutup
              </button>
            </div>
            <p className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              Password hanya ditampilkan SEKALI pada proses ini. Segera simpan / cetak. Password tidak dapat diambil ulang (gunakan Reset Password untuk mengganti).
            </p>
            <div className="overflow-x-auto max-h-96 border border-slate-200 dark:border-sky-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-sky-50 text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-sky-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {credentialList.map((c, idx) => (
                    <tr key={idx} className="hover:bg-sky-100 transition">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-black">{c.name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{c.username}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleExportCredentialExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HAPUS SEMUA DATA SISWA (BULK ALL / PER KELAS) */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-sky-950/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-black">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">Hapus Semua Data Siswa</h3>
                  <p className="text-xs text-slate-600">Pembersihan data akun dan riwayat peserta ujian</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deleteAllLoading}
                className="text-slate-400 hover:text-black p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black">Pilih Lingkup Penghapusan:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteAllScope("ALL")}
                  className={`p-3 rounded-xl border text-left transition ${
                    deleteAllScope === "ALL"
                      ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    <span>Seluruh Siswa</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Hapus total <strong>{students.length}</strong> siswa di sistem
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteAllScope("GROUP")}
                  className={`p-3 rounded-xl border text-left transition ${
                    deleteAllScope === "GROUP"
                      ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-purple-600" />
                    <span>Per Kelas / Rombel</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Pilih rombel tertentu yang akan dihapus
                  </div>
                </button>
              </div>
            </div>

            {/* If GROUP scope is selected, show dropdown */}
            {deleteAllScope === "GROUP" && (
              <div>
                <label className="block text-xs font-bold text-black mb-1">Pilih Rombel / Kelas Target:</label>
                <select
                  value={deleteAllGroupId}
                  onChange={(e) => setDeleteAllGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Pilih Rombel --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g._count?.users || 0} Siswa)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Destructive Warning Box */}
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-black text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Peringatan Tindakan Permanen!</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Tindakan ini akan <strong>menghapus permanen</strong> akun siswa yang dipilih beserta data terkait:
              </p>
              <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-0.5 pl-1">
                <li>Riwayat sesi ujian & waktu pengerjaan</li>
                <li>Seluruh lembar jawaban siswa (*Exam Answers*)</li>
                <li>Nilai ujian & catatan evaluasi</li>
                <li>Kunci perangkat login (*device fingerprint*)</li>
              </ul>
              <div className="text-[11px] font-bold text-rose-800 pt-1 border-t border-rose-200/60 mt-1">
                Jumlah siswa yang akan dihapus:{" "}
                <span className="text-sm font-black">
                  {deleteAllScope === "ALL"
                    ? students.length
                    : (groups.find((g) => g.id === deleteAllGroupId)?._count?.users || 0)}{" "}
                  Siswa
                </span>
              </div>
            </div>

            {/* Verification Keyword */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black">
                Ketik konfirmasi: <span className="font-mono text-rose-600 font-black">HAPUS SEMUA SISWA</span>
              </label>
              <input
                type="text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="Ketik 'HAPUS SEMUA SISWA' di sini..."
                className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold focus:outline-none focus:border-rose-500 placeholder:text-slate-400 font-mono uppercase"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={deleteAllLoading}
                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-black font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAllStudents}
                disabled={
                  deleteAllConfirmText !== "HAPUS SEMUA SISWA" ||
                  deleteAllLoading ||
                  (deleteAllScope === "GROUP" && !deleteAllGroupId)
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/20"
              >
                {deleteAllLoading ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sedang Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Siswa Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE AKUN SISWA OTOMATIS (AI OPENCODE) */}
      {showAiModal && (
        <div className="fixed inset-0 bg-sky-950/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleGenerateAiStudents}
            className="bg-white border border-sky-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-black"
          >
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-black">Generate Siswa Otomatis</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                      AI OPENCODE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">Buat akun, username & password siswa secara otomatis dengan AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={aiGenerating}
                className="text-slate-400 hover:text-black p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Jumlah Siswa */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-black">Jumlah Siswa yang Dibuat *</label>
                <span className="text-xs font-black text-blue-700 font-mono">{aiStudentCount} Siswa</span>
              </div>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={aiStudentCount}
                onChange={(e) => setAiStudentCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Pilihan Cepat:</span>
                {[10, 25, 50, 100, 200, 500].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAiStudentCount(num)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition border ${
                      aiStudentCount === num
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-sky-50 text-slate-700 border-sky-200 hover:bg-sky-100"
                    }`}
                  >
                    {num} Siswa
                  </button>
                ))}
              </div>
            </div>

            {/* Target Rombel / Kelas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black">Pilih Rombel / Kelas (Opsional):</label>
              <select
                value={aiTargetGroupId}
                onChange={(e) => setAiTargetGroupId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Belum Ditentukan (Tanpa Kelas) --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count?.users || 0} Siswa Terdaftar)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">Siswa yang dibuat akan otomatis terdaftar pada kelas yang dipilih.</p>
            </div>

            {/* Format Username Prefix */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black">Format Prefix Username:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={aiPrefix}
                  onChange={(e) => setAiPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  placeholder="siswa"
                  className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Contoh hasil: <span className="font-mono font-bold text-black">{aiPrefix || "siswa"}001</span>, <span className="font-mono font-bold text-black">{aiPrefix || "siswa"}002</span>, dst.
              </p>
            </div>

            {/* Format Password */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black">Format Pembuatan Kata Sandi (Password):</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAiPasswordType("READABLE_WORD")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    aiPasswordType === "READABLE_WORD"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="font-bold text-black">🔤 Kata Unik + Angka</div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">e.g. garuda26, bintang88</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiPasswordType("NUMERIC_PIN")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    aiPasswordType === "NUMERIC_PIN"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="font-bold text-black">🔢 PIN Angka 6 Digit</div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">e.g. 849201, 719284</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiPasswordType("RANDOM_ALPHANUMERIC")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    aiPasswordType === "RANDOM_ALPHANUMERIC"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="font-bold text-black">🔐 Alfanumerik Acak</div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">e.g. X7kM9pQ2 (Kuat)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAiPasswordType("UNIFORM")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    aiPasswordType === "UNIFORM"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                      : "border-sky-200 bg-sky-50/50 hover:bg-sky-50"
                  }`}
                >
                  <div className="font-bold text-black">📋 Satu Password Sama</div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">e.g. 123456 (Seragam)</div>
                </button>
              </div>

              {aiPasswordType === "UNIFORM" && (
                <div className="pt-1">
                  <input
                    type="text"
                    required
                    value={aiCustomPassword}
                    onChange={(e) => setAiCustomPassword(e.target.value)}
                    placeholder="Masukkan password yang sama untuk semua siswa..."
                    className="w-full px-3.5 py-2 bg-white border border-sky-200 rounded-xl text-xs text-black font-semibold font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* AI Toggle Info */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 border border-sky-200">
              <input
                type="checkbox"
                id="aiUseOnlineCheckbox"
                checked={aiUseOnline}
                onChange={(e) => setAiUseOnline(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-sky-300"
              />
              <label htmlFor="aiUseOnlineCheckbox" className="text-xs text-black cursor-pointer leading-tight">
                <span className="font-bold text-blue-950">Gunakan AI OpenCode untuk profil nama & variasi alami</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  AI akan menyusun nama siswa khas Indonesia yang beragam dan natural. Dilengkapi mesin fallback semantik berkecepatan tinggi.
                </p>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={aiGenerating}
                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-black font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={aiGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
              >
                {aiGenerating ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Men-generate Siswa...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate {aiStudentCount} Siswa Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Import Template STS Langsung */}
      {showStsModal && (
        <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="glass p-6 sm:p-8 max-w-xl w-full border border-sky-300 shadow-soft animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-sky-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-black text-black">Import Template Daftar Peserta STS</h2>
                  <p className="text-xs text-black font-semibold">Generate otomatis Username (NIS) & Password unik 6 karakter</p>
                </div>
              </div>
              <button
                onClick={() => setShowStsModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-sky-200 text-black flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-black space-y-1.5 font-medium">
                <p className="font-bold text-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Mendukung Format Multi-Sheet Otomatis</span>
                </p>
                <p>
                  Dapat langsung mengunggah file seperti <strong>DAFTAR PESERTA STS GASAL.xlsx</strong> yang memiliki beberapa sheet (misal: Sheet X, XI, XII).
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-semibold">
                  <li><strong>USERNAMA</strong> kosong otomatis diisi <strong>NIS</strong> peserta.</li>
                  <li><strong>PASWORD</strong> kosong otomatis dibuatkan <strong>6 Karakter Alfanumerik Unik</strong> (anti-hapal).</li>
                  <li>File Excel yang sudah terisi lengkap otomatis terunduh kembali setelah proses selesai.</li>
                </ul>
              </div>

              {/* Template Download Recommendation inside Modal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                    <Download className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950">Belum Punya File Template?</div>
                    <div className="text-[11px] text-emerald-800 font-medium">Download format resmi STS (Sheet X, XI, XII) siap isi</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href="/templates/TEMPLATE_DAFTAR_PESERTA_STS.xlsx"
                    download="TEMPLATE_DAFTAR_PESERTA_STS.xlsx"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template STS</span>
                  </a>
                  <a
                    href="/templates/TEMPLATE_UPLOAD_PESERTA_STANDAR.xlsx"
                    download="TEMPLATE_UPLOAD_PESERTA_STANDAR.xlsx"
                    className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-black border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                  >
                    <span>1-Sheet</span>
                  </a>
                </div>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl p-6 text-center transition bg-white/70 relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    setStsFile(e.target.files?.[0] || null);
                    setStsResult(null);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <p className="text-xs font-black text-black">
                    {stsFile ? stsFile.name : "Klik atau seret file template Excel (.xlsx) ke sini"}
                  </p>
                  <p className="text-[11px] text-black font-medium">
                    {stsFile ? `${(stsFile.size / 1024).toFixed(1)} KB terpilih` : "Contoh: DAFTAR PESERTA STS GASAL.xlsx"}
                  </p>
                </div>
              </div>

              {/* Result display if processed */}
              {stsResult && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-black space-y-2">
                  <div className="font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Sukses! {stsResult.totalRows || (stsResult.createdCount + stsResult.updatedCount)} siswa berhasil diproses.</span>
                  </div>
                  {stsResult.sheetsProcessed && (
                    <div className="flex flex-wrap gap-1.5">
                      {stsResult.sheetsProcessed.map((s: any) => (
                        <span key={s.name} className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px] border border-emerald-300">
                          Sheet {s.name}: {s.count} Siswa
                        </span>
                      ))}
                    </div>
                  )}
                  {stsResult.fileBase64 && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const byteCharacters = atob(stsResult.fileBase64);
                          const byteArray = new Uint8Array(byteCharacters.length);
                          for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
                          const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = stsResult.downloadFileName || "DAFTAR_PESERTA_DENGAN_AKUN_CBT.xlsx";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch (e: any) {
                          alert(`Gagal mengunduh: ${e.message}`);
                        }
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition mt-2 shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Ulang File Excel Terisi (.xlsx)</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-sky-200">
                <button
                  type="button"
                  onClick={() => setShowStsModal(false)}
                  className="btn-default py-2 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleProcessStsTemplate}
                  disabled={!stsFile || stsLoading}
                  className="btn-primary py-2 px-5 flex items-center gap-1.5 cursor-pointer"
                >
                  {stsLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span className="text-black font-black">Memproses Semua Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span className="text-black font-black">Proses & Generate Kredensial</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credential Result Modal */}
    </div>
  );
}
