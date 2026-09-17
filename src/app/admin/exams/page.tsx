"use client";

// 🕒 Robust Local Timezone Helpers (Avoid UTC shifts from .toISOString())
function toLocalDatetimeString(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateString(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}








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



  Zap,



  Filter,



  RotateCcw,



  Calendar,



  X,



  BookOpen,



  Layers,



  CheckSquare,



  Square,



  Eye,



  EyeOff,



  Loader2,



} from "lucide-react";







export default function AdminExamsPage() {



  const router = useRouter();



  const [exams, setExams] = useState<any[]>([]);



  const [subjects, setSubjects] = useState<any[]>([]);



  const [groups, setGroups] = useState<any[]>([]);



  const [prewarmingId, setPrewarmingId] = useState<string | null>(null);







  const handlePrewarm = async (examId: string) => {



    try {



      setPrewarmingId(examId);



      const res = await fetch(`/api/admin/exams/${examId}/prewarm`, { method: "POST" });



      const data = await res.json();



      if (res.ok) {



        alert(`⚡ Cache Redis Berhasil Dipanaskan!\n\n${data.questionCount} butir soal telah dimuat ke RAM Redis dalam ${data.durationMs}ms.\nSiswa dapat langsung memulai ujian tanpa lonjakan beban database.`);



      } else {



        alert(`Gagal pre-warm cache: ${data.error || "Terjadi kesalahan"}`);



      }



    } catch (e: any) {



      alert(`Error: ${e.message}`);



    } finally {



      setPrewarmingId(null);



    }



  };



  const [questions, setQuestions] = useState<any[]>([]);



  const [loading, setLoading] = useState(true);



  const [search, setSearch] = useState("");



  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");



  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");



  const [selectedDate, setSelectedDate] = useState<string>("ALL");



  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");



  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");







  // Bulk Selection & Action States



  const [selectedIds, setSelectedIds] = useState<string[]>([]);



  const [bulkLoading, setBulkLoading] = useState(false);



  const [showTokenModal, setShowTokenModal] = useState(false);



  const [bulkTokenInput, setBulkTokenInput] = useState("");







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



    token: "HEBAT",



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



    category: "REGULER",



    disableAntiCheat: false,

    groupsData: {} as Record<string, any>,

  });



  // Edit Modal

  const [showEditModal, setShowEditModal] = useState(false);

  const [editForm, setEditForm] = useState<any>(null);



  // Clone Modal States

  const [showCloneModal, setShowCloneModal] = useState(false);

  const [selectedExamForClone, setSelectedExamForClone] = useState<any>(null);

  const [cloning, setCloning] = useState(false);

  const [cloneForm, setCloneForm] = useState({

    title: "",

    code: "",

    cloneType: "REMEDIAL",

    copyQuestions: true,

    copyGroups: true,

    token: "REMEDIAL",

    durationMinutes: 60,

    startTime: "",

    endTime: "",

  });







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







      const groupsDataArray = form.groupIds.map((gid: string) => {
        const d = form.groupsData?.[gid] || {};
        return {
          groupId: gid,
          sessionName: d.sessionName || null,
          room: d.room || null,
          startTime: d.startTime || null,
          endTime: d.endTime || null,
        };
      });

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, groupsData: groupsDataArray, questionIds: questionIdsToUse }),
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



      const groupsDataArray = (editForm.groupIds || []).map((gid: string) => {
        const d = editForm.groupsData?.[gid] || {};
        return {
          groupId: gid,
          sessionName: d.sessionName || null,
          room: d.room || null,
          startTime: d.startTime || null,
          endTime: d.endTime || null,
        };
      });

      const res = await fetch("/api/admin/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, groupsData: groupsDataArray }),
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







    const getExamDateBase = (isEdit: boolean) => {
    const rawStart = isEdit ? editForm?.startTime : form?.startTime;
    if (rawStart) {
      return rawStart.slice(0, 10);
    }
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  const updateGroupSession = (groupId: string, field: string, value: string, isEdit: boolean) => {
    const targetState = isEdit ? editForm : form;
    const setState = isEdit ? setEditForm : setForm;
    const currentGroupsData = { ...(targetState.groupsData || {}) };
    const currentItem = { ...(currentGroupsData[groupId] || {}) };

    currentItem[field] = value;

    // Auto-fill time if selecting Sesi preset
    const dateBase = getExamDateBase(isEdit);
    if (field === "sessionName") {
      if (value === "Sesi 1") {
        currentItem.startTime = `${dateBase}T07:30`;
        currentItem.endTime = `${dateBase}T09:30`;
      } else if (value === "Sesi 2") {
        currentItem.startTime = `${dateBase}T10:00`;
        currentItem.endTime = `${dateBase}T12:00`;
      } else if (value === "Sesi 3") {
        currentItem.startTime = `${dateBase}T13:00`;
        currentItem.endTime = `${dateBase}T15:00`;
      } else if (value === "") {
        currentItem.startTime = "";
        currentItem.endTime = "";
      }
    }

    currentGroupsData[groupId] = currentItem;
    setState({ ...targetState, groupsData: currentGroupsData });
  };

  const applySessionPreset = (preset: "ALL_SESI_1" | "SPLIT_1_2" | "RESET", isEdit: boolean) => {
    const targetState = isEdit ? editForm : form;
    const setState = isEdit ? setEditForm : setForm;
    const dateBase = getExamDateBase(isEdit);
    const targetIds = isEdit ? (editForm.groupIds || []) : form.groupIds;
    const newGroupsData: Record<string, any> = {};

    targetIds.forEach((gid: string, idx: number) => {
      const existing = targetState.groupsData?.[gid] || {};
      if (preset === "ALL_SESI_1") {
        newGroupsData[gid] = {
          ...existing,
          sessionName: "Sesi 1",
          startTime: `${dateBase}T07:30`,
          endTime: `${dateBase}T09:30`,
        };
      } else if (preset === "SPLIT_1_2") {
        const isSesi1 = idx % 2 === 0;
        newGroupsData[gid] = {
          ...existing,
          sessionName: isSesi1 ? "Sesi 1" : "Sesi 2",
          startTime: isSesi1 ? `${dateBase}T07:30` : `${dateBase}T10:00`,
          endTime: isSesi1 ? `${dateBase}T09:30` : `${dateBase}T12:00`,
        };
      } else if (preset === "RESET") {
        newGroupsData[gid] = {
          ...existing,
          sessionName: "",
          startTime: "",
          endTime: "",
        };
      }
    });

    setState({ ...targetState, groupsData: newGroupsData });
  };

const handleOpenCloneModal = (exam: any) => {

    setSelectedExamForClone(exam);

    const now = new Date();

    const defaultStartTime = new Date(now.getTime() + 10 * 60000).toISOString().slice(0, 16);

    const defaultEndTime = new Date(now.getTime() + (exam.durationMinutes + 30) * 60000).toISOString().slice(0, 16);



    setCloneForm({

      title: `[REMEDIAL] ${exam.title}`,

      code: `${exam.code}-REM`,

      cloneType: "REMEDIAL",

      copyQuestions: true,

      copyGroups: true,

      token: "REMEDIAL",

      durationMinutes: exam.durationMinutes,

      startTime: defaultStartTime,

      endTime: defaultEndTime,

    });

    setShowCloneModal(true);

  };



  const handleCloneTypeChange = (type: string) => {

    if (!selectedExamForClone) return;

    const prefix = type === "REMEDIAL" ? "[REMEDIAL]" : type === "SUSULAN" ? "[SUSULAN]" : "[SALINAN]";

    const suffix = type === "REMEDIAL" ? "REM" : type === "SUSULAN" ? "SUS" : "COPY";

    const defaultToken = type === "REMEDIAL" ? "REMEDIAL" : type === "SUSULAN" ? "SUSULAN" : (selectedExamForClone.token || "ZYACBT");



    setCloneForm((prev) => ({

      ...prev,

      cloneType: type,

      title: `${prefix} ${selectedExamForClone.title}`,

      code: `${selectedExamForClone.code}-${suffix}`,

      token: defaultToken,

    }));

  };



  const handleCloneExam = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!selectedExamForClone) return;

    setCloning(true);

    try {

      const res = await fetch(`/api/admin/exams/${selectedExamForClone.id}/clone`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(cloneForm),

      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mengkloning ujian");

      alert(data.message || "Ujian berhasil dikloning!");

      setShowCloneModal(false);

      loadData();

    } catch (err: any) {

      alert("Gagal: " + err.message);

    } finally {

      setCloning(false);

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







  // Grade Helper



  const getExamGrade = (exam: any): "X" | "XI" | "XII" | "OTHER" => {



    const code = (exam.code || "").toUpperCase();



    const title = (exam.title || "").toUpperCase();







    if (code.includes("-X-") || code.endsWith("-X") || code.includes("STS26-X-")) return "X";



    if (code.includes("-XI-") || code.endsWith("-XI") || code.includes("STS26-XI-")) return "XI";



    if (code.includes("-XII-") || code.endsWith("-XII") || code.includes("STS26-XII-") || code.includes("PKL-XII")) return "XII";







    if (title.includes("KELAS X ") || title.endsWith("KELAS X") || title.includes("KELAS 10")) return "X";



    if (title.includes("KELAS XI ") || title.endsWith("KELAS XI") || title.includes("KELAS 11")) return "XI";



    if (title.includes("KELAS XII") || title.includes("KELAS 12")) return "XII";







    if (Array.isArray(exam.examGroups)) {



      for (const eg of exam.examGroups) {



        const gName = (eg.group?.name || "").toUpperCase();



        if (gName.startsWith("X ") || gName.includes("-X-") || gName.includes(" 10 ")) return "X";



        if (gName.startsWith("XI ") || gName.includes("-XI-") || gName.includes(" 11 ")) return "XI";



        if (gName.startsWith("XII ") || gName.includes("-XII-") || gName.includes(" 12 ")) return "XII";



      }



    }



    return "OTHER";



  };







  // Category Helper



  const getExamCategory = (exam: any): "PKL" | "REGULER" => {



    if (exam.category === "PKL" || (exam.code || "").toUpperCase().includes("PKL") || (exam.title || "").toUpperCase().includes("PKL")) {



      return "PKL";



    }



    return "REGULER";



  };







  // Date Key & Label Helpers



  const getExamDateKey = (isoString?: string): string => {



    if (!isoString) return "";



    try {



      const d = new Date(isoString);



      return new Intl.DateTimeFormat("en-CA", {



        timeZone: "Asia/Jakarta",



        year: "numeric",



        month: "2-digit",



        day: "2-digit",



      }).format(d);



    } catch {



      return "";



    }



  };







  const formatExamDateLabel = (dateKey: string): string => {



    if (!dateKey) return "";



    try {



      const [year, month, day] = dateKey.split("-").map(Number);



      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));



      return new Intl.DateTimeFormat("id-ID", {



        timeZone: "Asia/Jakarta",



        weekday: "short",



        day: "numeric",



        month: "short",



        year: "numeric",



      }).format(date);



    } catch {



      return dateKey;



    }



  };







  // Status Helper



  const getExamStatus = (exam: any): "ACTIVE" | "SCHEDULED" | "ENDED" => {



    const now = Date.now();



    const start = exam.startTime ? new Date(exam.startTime).getTime() : 0;



    const end = exam.endTime ? new Date(exam.endTime).getTime() : Infinity;







    if (now >= start && now <= end) return "ACTIVE";



    if (now < start) return "SCHEDULED";



    return "ENDED";



  };







  // Unique Dates in Exams



  const availableDates = React.useMemo(() => {



    const set = new Set<string>();



    exams.forEach((ex) => {



      const dateKey = getExamDateKey(ex.startTime);



      if (dateKey) set.add(dateKey);



    });



    return Array.from(set).sort();



  }, [exams]);







  // Grade & Category Counts



  const gradeCounts = React.useMemo(() => {



    let x = 0, xi = 0, xii = 0, pkl = 0, reguler = 0;



    exams.forEach((ex) => {



      const g = getExamGrade(ex);



      if (g === "X") x++;



      else if (g === "XI") xi++;



      else if (g === "XII") xii++;







      const c = getExamCategory(ex);



      if (c === "PKL") pkl++;



      else reguler++;



    });



    return { all: exams.length, x, xi, xii, pkl, reguler };



  }, [exams]);







  // Main Filter Logic



  const filteredExams = exams.filter((exam) => {



    if (search.trim()) {



      const q = search.toLowerCase();



      const titleMatch = exam.title?.toLowerCase().includes(q);



      const codeMatch = exam.code?.toLowerCase().includes(q);



      const subjMatch = exam.subject?.name?.toLowerCase().includes(q);



      if (!titleMatch && !codeMatch && !subjMatch) return false;



    }







    if (selectedGrade !== "ALL") {



      const g = getExamGrade(exam);



      if (g !== selectedGrade) return false;



    }







    if (selectedCategory !== "ALL") {



      const c = getExamCategory(exam);



      if (c !== selectedCategory) return false;



    }







    if (selectedDate !== "ALL") {



      const d = getExamDateKey(exam.startTime);



      if (d !== selectedDate) return false;



    }







    if (selectedStatus !== "ALL") {



      const s = getExamStatus(exam);



      if (s !== selectedStatus) return false;



    }







    if (selectedSubject !== "ALL") {



      if (exam.subjectId !== selectedSubject) return false;



    }







    return true;



  });







  const resetFilters = () => {



    setSearch("");



    setSelectedGrade("ALL");



    setSelectedCategory("ALL");



    setSelectedDate("ALL");



    setSelectedStatus("ALL");



    setSelectedSubject("ALL");



  };







  const hasActiveFilter =



    search !== "" ||



    selectedGrade !== "ALL" ||



    selectedCategory !== "ALL" ||



    selectedDate !== "ALL" ||



    selectedStatus !== "ALL" ||



    selectedSubject !== "ALL";







  // Bulk Selection Handlers



  const handleToggleSelect = (id: string) => {



    setSelectedIds((prev) =>



      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]



    );



  };







  const handleToggleSelectAll = () => {



    if (selectedIds.length === filteredExams.length) {



      setSelectedIds([]);



    } else {



      setSelectedIds(filteredExams.map((ex) => ex.id));



    }



  };







  const handleSelectAllInDatabase = () => {



    setSelectedIds(exams.map((ex) => ex.id));



  };







  // Bulk Delete



  const handleBulkDelete = async () => {



    if (selectedIds.length === 0) return;



    const isAll = selectedIds.length === exams.length;



    const confirmMsg = isAll



      ? `⚠️ PERINGATAN: Anda akan menghapus SELURUH (${selectedIds.length}) jadwal ujian dari database!







Lanjutkan?`



      : `Yakin ingin menghapus ${selectedIds.length} jadwal ujian yang dipilih?`;







    if (!confirm(confirmMsg)) return;







    try {



      setBulkLoading(true);



      const res = await fetch("/api/admin/exams", {



        method: "DELETE",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ ids: selectedIds }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal menghapus ujian");



      alert(`✅ ${data.message || "Ujian berhasil dihapus"}`);



      setSelectedIds([]);



      loadData();



    } catch (err: any) {



      alert(`Error: ${err.message}`);



    } finally {



      setBulkLoading(false);



    }



  };







  // Bulk Publish / Unpublish



  const handleBulkPublish = async (isPublished: boolean) => {



    if (selectedIds.length === 0) return;



    const actionText = isPublished ? "mempublikasikan" : "menyembunyikan (draft)";



    if (!confirm(`Yakin ingin ${actionText} ${selectedIds.length} jadwal ujian terpilih?`)) return;







    try {



      setBulkLoading(true);



      const res = await fetch("/api/admin/exams", {



        method: "PATCH",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          ids: selectedIds,



          action: isPublished ? "publish" : "unpublish",



        }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status publikasi");



      alert(`✅ ${data.message}`);



      loadData();



    } catch (err: any) {



      alert(`Error: ${err.message}`);



    } finally {



      setBulkLoading(false);



    }



  };







  // Bulk Pre-warm Redis



  const handleBulkPrewarm = async () => {



    if (selectedIds.length === 0) return;



    try {



      setBulkLoading(true);



      const res = await fetch("/api/admin/exams", {



        method: "PATCH",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          ids: selectedIds,



          action: "prewarm",



        }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal melakukan pre-warm");



      alert(`⚡ ${data.message}`);



    } catch (err: any) {



      alert(`Error: ${err.message}`);



    } finally {



      setBulkLoading(false);



    }



  };







  // Bulk Set Token



  const handleBulkSetToken = async (e: React.FormEvent) => {



    e.preventDefault();



    const token = bulkTokenInput.trim().toUpperCase();



    if (!token) return alert("Token tidak boleh kosong!");







    try {



      setBulkLoading(true);



      const res = await fetch("/api/admin/exams", {



        method: "PATCH",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          ids: selectedIds,



          action: "setToken",



          data: { token },



        }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal mengubah token");



      alert(`🔑 ${data.message}`);



      setShowTokenModal(false);



      setBulkTokenInput("");



      loadData();



    } catch (err: any) {



      alert(`Error: ${err.message}`);



    } finally {



      setBulkLoading(false);



    }



  };







  // Bulk Anti-Cheat Toggle



  const handleBulkAntiCheat = async (disableAntiCheat: boolean) => {



    if (selectedIds.length === 0) return;



    const label = disableAntiCheat ? "Mode Bebas Pelanggaran" : "Mode Anti-Cheat Ketat";



    if (!confirm(`Terapkan "${label}" pada ${selectedIds.length} jadwal ujian terpilih?`)) return;







    try {



      setBulkLoading(true);



      const res = await fetch("/api/admin/exams", {



        method: "PATCH",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          ids: selectedIds,



          action: "setAntiCheat",



          data: { disableAntiCheat },



        }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal mengubah mode anti-cheat");



      alert(`🛡️ ${data.message}`);



      loadData();



    } catch (err: any) {



      alert(`Error: ${err.message}`);



    } finally {



      setBulkLoading(false);



    }



  };







  return (



    <div className="space-y-6">



      {/* Top Header */}



      <div className="page-header">



        <div>



          <h1 className="page-title">Manajemen Pelaksanaan Ujian</h1>



          <p className="page-subtitle">



            Kelola jadwal, durasi, token dinamis, keamanan anti-cheat, dan proctoring ujian.



          </p>



        </div>







        <div className="header-actions">



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



                token: "HEBAT",



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



                category: "REGULER",



                disableAntiCheat: false,
                groupsData: {},



              });



              setShowModal(true);



            }}



            className="btn-primary"



          >



            <Plus className="w-4 h-4" />



            <span>Buat Ujian Baru</span>



          </button>



        </div>



      </div>







      {/* Filter & Search Bar */}



      <div className="glass p-4 sm:p-5 space-y-3.5 border border-sky-200 dark:border-sky-300 shadow-sm rounded-2xl">



        {/* Row 1: Tingkat Pills & Tipe Ujian Selector */}



        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sky-100 dark:border-sky-200">



          {/* Grade Pills */}



          <div className="flex items-center gap-1.5 flex-wrap">



            <span className="text-xs font-black text-slate-800 dark:text-black mr-1 flex items-center gap-1.5">



              <Layers className="w-4 h-4 text-blue-600" />



              Tingkat:



            </span>



            <button



              type="button"



              onClick={() => setSelectedGrade("ALL")}



              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${



                selectedGrade === "ALL"



                  ? "bg-blue-600 text-white shadow-sm"



                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-sky-100"



              }`}



            >



              Semua Tingkat ({gradeCounts.all})



            </button>



            <button



              type="button"



              onClick={() => setSelectedGrade("X")}



              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${



                selectedGrade === "X"



                  ? "bg-emerald-600 text-white shadow-sm"



                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-sky-100"



              }`}



            >



              Kelas X ({gradeCounts.x})



            </button>



            <button



              type="button"



              onClick={() => setSelectedGrade("XI")}



              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${



                selectedGrade === "XI"



                  ? "bg-cyan-600 text-white shadow-sm"



                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-sky-100"



              }`}



            >



              Kelas XI ({gradeCounts.xi})



            </button>



            <button



              type="button"



              onClick={() => setSelectedGrade("XII")}



              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${



                selectedGrade === "XII"



                  ? "bg-indigo-600 text-white shadow-sm"



                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-sky-100"



              }`}



            >



              Kelas XII ({gradeCounts.xii})



            </button>



          </div>







          {/* Category Selector Tabs */}



          <div className="flex items-center gap-1 bg-slate-100 dark:bg-sky-100 p-1 rounded-xl border border-slate-200 dark:border-sky-200">



            <button



              type="button"



              onClick={() => setSelectedCategory("ALL")}



              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${



                selectedCategory === "ALL"



                  ? "bg-white text-blue-700 shadow-xs dark:bg-white dark:text-blue-900"



                  : "text-slate-600 dark:text-slate-800 hover:text-black"



              }`}



            >



              Semua Kategori



            </button>



            <button



              type="button"



              onClick={() => setSelectedCategory("REGULER")}



              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${



                selectedCategory === "REGULER"



                  ? "bg-white text-blue-700 shadow-xs dark:bg-white dark:text-blue-900"



                  : "text-slate-600 dark:text-slate-800 hover:text-black"



              }`}



            >



              Reguler ({gradeCounts.reguler})



            </button>



            <button



              type="button"



              onClick={() => setSelectedCategory("PKL")}



              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${



                selectedCategory === "PKL"



                  ? "bg-purple-600 text-white shadow-xs"



                  : "text-slate-600 dark:text-slate-800 hover:text-black"



              }`}



            >



              Khusus PKL ({gradeCounts.pkl})



            </button>



          </div>



        </div>







        {/* Row 2: Search Box & Dropdown Filters */}



        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">



          {/* Live Search Input */}



          <div className="relative">



            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />



            <input



              type="text"



              value={search}



              onChange={(e) => setSearch(e.target.value)}



              placeholder="Cari judul, kode, atau mapel..."



              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-400 focus:outline-none focus:border-blue-500"



            />



            {search && (



              <button



                type="button"



                onClick={() => setSearch("")}



                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"



              >



                <X className="w-3.5 h-3.5" />



              </button>



            )}



          </div>







          {/* Tanggal Ujian Dropdown */}



          <div className="relative">



            <Calendar className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />



            <select



              value={selectedDate}



              onChange={(e) => setSelectedDate(e.target.value)}



              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 appearance-none font-medium cursor-pointer"



            >



              <option value="ALL">🗓️ Semua Tanggal Ujian</option>



              {availableDates.map((dateKey) => {



                const countOnDate = exams.filter((ex) => getExamDateKey(ex.startTime) === dateKey).length;



                return (



                  <option key={dateKey} value={dateKey}>



                    {formatExamDateLabel(dateKey)} ({countOnDate} paket)



                  </option>



                );



              })}



            </select>



            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>



          </div>







          {/* Status Pelaksanaan Dropdown */}



          <div className="relative">



            <Activity className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />



            <select



              value={selectedStatus}



              onChange={(e) => setSelectedStatus(e.target.value)}



              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 appearance-none font-medium cursor-pointer"



            >



              <option value="ALL">⚡ Semua Status</option>



              <option value="ACTIVE">🟢 Berlangsung Sekarang</option>



              <option value="SCHEDULED">⏳ Mendatang / Terjadwal</option>



              <option value="ENDED">⚪ Sudah Selesai</option>



            </select>



            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>



          </div>







          {/* Mata Pelajaran Dropdown */}



          <div className="relative">



            <BookOpen className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />



            <select



              value={selectedSubject}



              onChange={(e) => setSelectedSubject(e.target.value)}



              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 appearance-none font-medium cursor-pointer"



            >



              <option value="ALL">📚 Semua Mata Pelajaran</option>



              {subjects.map((subj) => (



                <option key={subj.id} value={subj.id}>



                  {subj.name} ({subj.code})



                </option>



              ))}



            </select>



            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>



          </div>



        </div>







        {/* Row 3: Result Stats & Active Filter Badges */}



        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">



          <div className="flex items-center gap-1.5 flex-wrap">



            <span className="text-slate-600 dark:text-slate-800 font-medium">



              Menampilkan <strong className="text-blue-600 font-black">{filteredExams.length}</strong> dari{" "}



              <strong className="text-slate-900 dark:text-black">{exams.length}</strong> paket ujian



            </span>







            {/* Active Chips */}



            {selectedGrade !== "ALL" && (



              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200">



                Tingkat: Kelas {selectedGrade}



                <button onClick={() => setSelectedGrade("ALL")} className="hover:text-rose-600">



                  <X className="w-3 h-3" />



                </button>



              </span>



            )}



            {selectedCategory !== "ALL" && (



              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[11px] font-bold border border-purple-200">



                Tipe: {selectedCategory}



                <button onClick={() => setSelectedCategory("ALL")} className="hover:text-rose-600">



                  <X className="w-3 h-3" />



                </button>



              </span>



            )}



            {selectedDate !== "ALL" && (



              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 text-[11px] font-bold border border-amber-200">



                Tanggal: {formatExamDateLabel(selectedDate)}



                <button onClick={() => setSelectedDate("ALL")} className="hover:text-rose-600">



                  <X className="w-3 h-3" />



                </button>



              </span>



            )}



            {selectedStatus !== "ALL" && (



              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 text-[11px] font-bold border border-emerald-200">



                Status: {selectedStatus === "ACTIVE" ? "Aktif" : selectedStatus === "SCHEDULED" ? "Terjadwal" : "Selesai"}



                <button onClick={() => setSelectedStatus("ALL")} className="hover:text-rose-600">



                  <X className="w-3 h-3" />



                </button>



              </span>



            )}



            {selectedSubject !== "ALL" && (



              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-950 text-[11px] font-bold border border-sky-200">



                Mapel: {subjects.find((s) => s.id === selectedSubject)?.name || "Pilihan"}



                <button onClick={() => setSelectedSubject("ALL")} className="hover:text-rose-600">



                  <X className="w-3 h-3" />



                </button>



              </span>



            )}



          </div>







          {hasActiveFilter && (



            <button



              type="button"



              onClick={resetFilters}



              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition cursor-pointer shadow-2xs"



            >



              <RotateCcw className="w-3 h-3" />



              <span>Reset Filter</span>



            </button>



          )}



        </div>



      </div>







      {/* Select All & Bulk Action Bar */}



      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">



        <div className="flex items-center gap-3 flex-wrap">



          <button



            type="button"



            onClick={handleToggleSelectAll}



            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-sky-50 border border-slate-300 dark:border-sky-200 text-xs font-black text-slate-800 dark:text-black hover:bg-slate-100 dark:hover:bg-sky-100 transition shadow-2xs cursor-pointer"



          >



            {selectedIds.length > 0 && selectedIds.length === filteredExams.length ? (



              <CheckSquare className="w-4 h-4 text-blue-600" />



            ) : selectedIds.length > 0 ? (



              <CheckSquare className="w-4 h-4 text-blue-400 opacity-60" />



            ) : (



              <Square className="w-4 h-4 text-slate-400" />



            )}



            <span>



              {selectedIds.length === filteredExams.length && filteredExams.length > 0



                ? "Batal Pilih Semua"



                : `Pilih Semua Terfilter (${filteredExams.length} Ujian)`}



            </span>



          </button>







          {filteredExams.length < exams.length && (



            <button



              type="button"



              onClick={handleSelectAllInDatabase}



              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-900 font-bold hover:underline cursor-pointer"



            >



              Pilih Seluruh {exams.length} Ujian di Database



            </button>



          )}







          {selectedIds.length > 0 && (



            <button



              type="button"



              onClick={() => setSelectedIds([])}



              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-700 underline cursor-pointer"



            >



              Kosongkan Pilihan



            </button>



          )}



        </div>







        <div className="flex items-center gap-2">



          {selectedIds.length > 0 ? (



            <span className="text-xs font-black text-blue-700 dark:text-blue-900 bg-blue-50 dark:bg-sky-100 px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">



              ✓ {selectedIds.length} ujian dipilih



            </span>



          ) : (



            <span className="text-xs text-slate-500 dark:text-slate-600 font-medium">



              Centang kotak pada kartu ujian untuk tindakan massal (bulk)



            </span>



          )}



        </div>



      </div>







      {/* Floating / Sticky Bulk Action Bar (Aktif ketika ada ujian dipilih) */}



      {selectedIds.length > 0 && (



        <div className="sticky top-4 z-40 p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-sky-900 to-indigo-950 text-white shadow-2xl border border-sky-400/40 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-4">



          <div className="flex items-center gap-2.5">



            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />



            <span className="text-xs sm:text-sm font-black tracking-wide">



              {selectedIds.length} Jadwal Ujian Dipilih



            </span>



          </div>







          <div className="flex items-center gap-2 flex-wrap">



            {/* Bulk Prewarm */}



            <button



              type="button"



              onClick={handleBulkPrewarm}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



              title="Panaskan cache Redis untuk seluruh ujian yang dipilih sekaligus"



            >



              <Zap className={`w-3.5 h-3.5 ${bulkLoading ? "animate-spin" : ""}`} />



              <span>⚡ Pre-warm ({selectedIds.length})</span>



            </button>







            {/* Bulk Publish */}



            <button



              type="button"



              onClick={() => handleBulkPublish(true)}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



            >



              <Eye className="w-3.5 h-3.5" />



              <span>Publikasikan</span>



            </button>







            {/* Bulk Unpublish */}



            <button



              type="button"



              onClick={() => handleBulkPublish(false)}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



            >



              <EyeOff className="w-3.5 h-3.5" />



              <span>Sembunyikan</span>



            </button>







            {/* Bulk Token */}



            <button



              type="button"



              onClick={() => {



                setBulkTokenInput("STS26");



                setShowTokenModal(true);



              }}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



            >



              <Key className="w-3.5 h-3.5" />



              <span>Ganti Token</span>



            </button>







            {/* Bulk Anti-Cheat */}



            <button



              type="button"



              onClick={() => handleBulkAntiCheat(true)}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



              title="Ubah ujian terpilih menjadi bebas pelanggaran"



            >



              <ShieldCheck className="w-3.5 h-3.5" />



              <span>Bebas Pelanggaran</span>



            </button>







            {/* Bulk Delete */}



            <button



              type="button"



              onClick={handleBulkDelete}



              disabled={bulkLoading}



              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"



            >



              <Trash2 className="w-3.5 h-3.5" />



              <span>Hapus ({selectedIds.length})</span>



            </button>







            {/* Cancel Selection */}



            <button



              type="button"



              onClick={() => setSelectedIds([])}



              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"



            >



              ✕ Batal



            </button>



          </div>



        </div>



      )}







      {/* Exam Grid */}



      {loading ? (



        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">Memuat daftar ujian...</div>



      ) : filteredExams.length === 0 ? (



        <div className="p-12 text-center rounded-2xl bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 text-slate-500 dark:text-slate-400">



          <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-3" />



          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">



            {hasActiveFilter



              ? "Tidak ada paket ujian yang cocok dengan filter yang dipilih."



              : "Belum ada ujian yang dibuat."}



          </p>



          <p className="text-xs text-slate-500 mt-1">



            {hasActiveFilter



              ? "Coba ubah opsi filter atau tekan tombol 'Reset Filter' di bawah untuk menampilkan seluruh ujian."



              : "Klik tombol &apos;Buat Ujian Baru&apos; untuk memulai."}



          </p>



          {hasActiveFilter && (



            <button



              type="button"



              onClick={resetFilters}



              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"



            >



              <RotateCcw className="w-3.5 h-3.5" />



              <span>Reset Semua Filter</span>



            </button>



          )}



        </div>



      ) : (



        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">



          {filteredExams.map((exam) => {



            const isSelected = selectedIds.includes(exam.id);



            return (



            <div



              key={exam.id}



              className={`glass p-5 flex flex-col justify-between hover:shadow-glow transition relative overflow-hidden ${



                isSelected ? "ring-2 ring-blue-500 bg-sky-50/70 dark:bg-sky-100/50 shadow-md" : ""



              }`}



            >



              <div>



                <div className="flex items-center justify-between gap-2 mb-3">



                  <div className="flex items-center gap-1.5 flex-wrap">



                    {/* Card Selection Checkbox */}



                    <button



                      type="button"



                      onClick={(e) => {



                        e.stopPropagation();



                        handleToggleSelect(exam.id);



                      }}



                      className="p-1 -ml-1 text-slate-700 dark:text-black hover:text-blue-600 transition cursor-pointer"



                      title={isSelected ? "Batal pilih jadwal ujian ini" : "Pilih jadwal ujian ini"}



                    >



                      {isSelected ? (



                        <CheckSquare className="w-5 h-5 text-blue-600 fill-blue-50" />



                      ) : (



                        <Square className="w-5 h-5 text-slate-400 hover:text-slate-700" />



                      )}



                    </button>







                    <span className="px-2.5 py-1 text-[11px] font-semibold badge-info font-black">



                      {exam.subject?.name}



                    </span>



                    {/* Grade Badge */}



                    {(() => {



                      const grade = getExamGrade(exam);



                      if (grade === "X") {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-md">



                            KELAS X



                          </span>



                        );



                      } else if (grade === "XI") {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-black bg-cyan-100 text-cyan-950 border border-cyan-300 rounded-md">



                            KELAS XI



                          </span>



                        );



                      } else if (grade === "XII") {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-950 border border-indigo-300 rounded-md">



                            KELAS XII



                          </span>



                        );



                      }



                      return null;



                    })()}



                    {/* Category Badge */}



                    {exam.category === "PKL" ? (



                      <span className="px-2 py-0.5 text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 rounded-md">



                        KHUSUS PKL



                      </span>



                    ) : (



                      <span className="px-2 py-0.5 text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 rounded-md">



                        REGULER



                      </span>



                    )}



                    {/* Status Badge */}



                    {(() => {



                      const status = getExamStatus(exam);



                      if (status === "ACTIVE") {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-2xs">



                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>



                            AKTIF



                          </span>



                        );



                      } else if (status === "SCHEDULED") {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 rounded-md">



                            TERJADWAL



                          </span>



                        );



                      } else {



                        return (



                          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300 rounded-md">



                            SELESAI



                          </span>



                        );



                      }



                    })()}



                    {exam.disableAntiCheat && (



                      <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 rounded-md">



                        🛡️ Bebas Pelanggaran



                      </span>



                    )}



                  </div>



                  <div className="flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 bg-sky-200 border border-sky-300 rounded-lg text-black font-black">



                    <Key className="w-3 h-3 text-black" />



                    <span>{exam.token || "TANPA TOKEN"}</span>



                  </div>



                </div>







                <div className="flex items-start justify-between gap-2">



                  <h3 className="text-base font-black text-black mb-1 line-clamp-1">{exam.title}</h3>



                  <div className="flex items-center gap-1 shrink-0">



                    <button



                      onClick={() => {



                        setEditForm({



                          id: exam.id,



                          title: exam.title,



                          code: exam.code,



                          description: exam.description || "",



                          subjectId: exam.subjectId,



                          category: exam.category || "REGULER",



                          disableAntiCheat: Boolean(exam.disableAntiCheat),



                          durationMinutes: exam.durationMinutes,



                          startTime: toLocalDatetimeString(exam.startTime),



                          endTime: toLocalDatetimeString(exam.endTime),



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
                          groupsData: (() => {
                            const map: Record<string, any> = {};
                            exam.examGroups?.forEach((eg: any) => {
                              map[eg.groupId] = {
                                sessionName: eg.sessionName || "",
                                room: eg.room || "",
                                startTime: toLocalDatetimeString(eg.startTime),
                                endTime: toLocalDatetimeString(eg.endTime),
                              };
                            });
                            return map;
                          })(),
                        });
                        setShowEditModal(true);



                      }}



                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-400 rounded transition"



                      title="Edit Pengaturan Ujian"



                    >



                      <Edit2 className="w-4 h-4" />



                    </button>



                    <button

                      onClick={() => handleOpenCloneModal(exam)}

                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 rounded transition"

                      title="Kloning / Duplikasi Ujian (Remedial / Susulan)"

                    >

                      <Copy className="w-4 h-4" />

                    </button>

                    <button



                      onClick={() => handleDeleteExam(exam.id, exam.title)}



                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-400 rounded transition"



                      title="Hapus Ujian"



                    >



                      <Trash2 className="w-4 h-4" />



                    </button>



                  </div>



                </div>







                <div className="text-[11px] font-mono text-black font-bold mb-1">Kode: {exam.code}</div>



                <p className="text-xs text-black font-medium line-clamp-2">{exam.description || "Tanpa deskripsi"}</p>







                {(exam.startTime || exam.endTime) && (



                  <div className="mt-2.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-100/70 border border-slate-200 dark:border-sky-200 text-[11px] space-y-1">



                    {exam.startTime && (



                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-800">



                        <span className="font-semibold flex items-center gap-1">



                          <Calendar className="w-3 h-3 text-blue-600" />



                          Hari & Tanggal:



                        </span>



                        <span className="text-slate-900 dark:text-black font-bold">



                          {new Intl.DateTimeFormat("id-ID", {



                            timeZone: "Asia/Jakarta",



                            weekday: "short",



                            day: "2-digit",



                            month: "short",



                            year: "numeric",



                          }).format(new Date(exam.startTime))}



                        </span>



                      </div>



                    )}



                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-800">



                      <span className="font-semibold flex items-center gap-1">



                        <Clock className="w-3 h-3 text-amber-600" />



                        Waktu (WIB):



                      </span>



                      <span className="text-slate-900 dark:text-black font-mono font-black">



                        {exam.startTime ? new Intl.DateTimeFormat("id-ID", {



                          timeZone: "Asia/Jakarta",



                          hour: "2-digit",



                          minute: "2-digit",



                        }).format(new Date(exam.startTime)) : "--:--"}



                        {" - "}



                        {exam.endTime ? new Intl.DateTimeFormat("id-ID", {



                          timeZone: "Asia/Jakarta",



                          hour: "2-digit",



                          minute: "2-digit",



                        }).format(new Date(exam.endTime)) + " WIB" : "Selesai"}



                      </span>



                    </div>



                  </div>



                )}







                <div className="mt-4 pt-4 border-t border-sky-300/80 grid grid-cols-3 gap-2 text-center text-xs">



                  <div className="p-2 rounded-xl bg-sky-100 border border-sky-200 shadow-2xs">



                    <div className="text-black font-bold text-[10px]">Durasi</div>



                    <div className="font-black text-black mt-0.5">{exam.durationMinutes}m</div>



                  </div>



                  <div className="p-2 rounded-xl bg-sky-100 border border-sky-200 shadow-2xs">



                    <div className="text-black font-bold text-[10px]">Total Soal</div>



                    <div className="font-black text-black mt-0.5">{exam._count?.examQuestions || 0}</div>



                  </div>



                  <div className="p-2 rounded-xl bg-sky-100 border border-sky-200 shadow-2xs">



                    <div className="text-black font-bold text-[10px]">Peserta</div>



                    <div className="font-black text-black mt-0.5">{exam._count?.examSessions || 0}</div>



                  </div>



                </div>



              </div>







              <div className="mt-5 pt-4 border-t border-sky-300/80 flex items-center gap-2">



                <button



                  onClick={() => router.push(`/admin/exams/${exam.id}/proctor`)}



                  className="btn-primary flex-1 justify-center py-2"



                >



                  <Activity className="w-3.5 h-3.5 text-black" />



                  <span>Proctoring</span>



                </button>







                <button



                  onClick={() => router.push(`/admin/exams/${exam.id}/analysis`)}



                  className="btn-default py-2"



                  title="Analisis Butir Soal (Psikometri & Daya Beda)"



                >



                  <BarChart3 className="w-3.5 h-3.5 text-black" />



                  <span>Analisis</span>



                </button>







                <button



                  onClick={() => handlePrewarm(exam.id)}



                  disabled={prewarmingId === exam.id}



                  className="btn-default py-2 hover:border-amber-400"



                  title="Pre-warm Cache Redis (Cegah Thundering Herd saat Siswa Mulai Ujian)"



                >



                  <Zap className={`w-3.5 h-3.5 text-amber-600 ${prewarmingId === exam.id ? "animate-spin" : ""}`} />



                  <span className="text-black font-bold">{prewarmingId === exam.id ? "Warming..." : "Pre-warm"}</span>



                </button>



              </div>



            </div>



            );



          })}



        </div>



      )}







      {/* Clone Exam Modal */}

      {showCloneModal && selectedExamForClone && (

        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-md z-50 flex items-center justify-center p-4">

          <div className="glass p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">

            <div className="flex items-center justify-between mb-1">

              <div className="flex items-center gap-2">

                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">

                  <Copy className="w-5 h-5" />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-black">Kloning / Duplikasi Ujian</h2>

                  <p className="text-xs text-slate-500 dark:text-slate-400">

                    Sumber: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedExamForClone.title}</span> ({selectedExamForClone._count?.examQuestions || 0} Soal)

                  </p>

                </div>

              </div>

            </div>



            <form onSubmit={handleCloneExam} className="mt-5 space-y-4">

              {/* Type Selector (Pills) */}

              <div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tujuan Kloning:</label>

                <div className="grid grid-cols-3 gap-2">

                  <button

                    type="button"

                    onClick={() => handleCloneTypeChange("REMEDIAL")}

                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${

                      cloneForm.cloneType === "REMEDIAL"

                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"

                        : "bg-sky-50 dark:bg-sky-100/60 text-slate-700 dark:text-slate-800 border-sky-200 hover:bg-sky-100"

                    }`}

                  >

                    <span>Remedial</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => handleCloneTypeChange("SUSULAN")}

                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${

                      cloneForm.cloneType === "SUSULAN"

                        ? "bg-purple-600 text-white border-purple-700 shadow-sm"

                        : "bg-sky-50 dark:bg-sky-100/60 text-slate-700 dark:text-slate-800 border-sky-200 hover:bg-sky-100"

                    }`}

                  >

                    <span>Susulan</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => handleCloneTypeChange("COPY")}

                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${

                      cloneForm.cloneType === "COPY"

                        ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"

                        : "bg-sky-50 dark:bg-sky-100/60 text-slate-700 dark:text-slate-800 border-sky-200 hover:bg-sky-100"

                    }`}

                  >

                    <span>Salinan Biasa</span>

                  </button>

                </div>

              </div>



              {/* Title & Code */}

              <div className="space-y-3">

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Judul Ujian Baru</label>

                  <input

                    type="text"

                    required

                    value={cloneForm.title}

                    onChange={(e) => setCloneForm({ ...cloneForm, title: e.target.value })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-semibold"

                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Ujian Baru (Wajib Unik)</label>

                  <input

                    type="text"

                    required

                    value={cloneForm.code}

                    onChange={(e) => setCloneForm({ ...cloneForm, code: e.target.value.toUpperCase() })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-mono font-bold uppercase"

                  />

                </div>

              </div>



              {/* Duration & Token */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Durasi (Menit)</label>

                  <input

                    type="number"

                    required

                    min={1}

                    value={cloneForm.durationMinutes}

                    onChange={(e) => setCloneForm({ ...cloneForm, durationMinutes: Number(e.target.value) })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-semibold"

                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Token Akses</label>

                  <input

                    type="text"

                    required

                    value={cloneForm.token}

                    onChange={(e) => setCloneForm({ ...cloneForm, token: e.target.value.toUpperCase() })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-mono font-bold uppercase"

                  />

                </div>

              </div>



              {/* Start Time & End Time */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Waktu Mulai Baru</label>

                  <input

                    type="datetime-local"

                    value={cloneForm.startTime}

                    onChange={(e) => setCloneForm({ ...cloneForm, startTime: e.target.value })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-medium"

                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Waktu Selesai Baru</label>

                  <input

                    type="datetime-local"

                    value={cloneForm.endTime}

                    onChange={(e) => setCloneForm({ ...cloneForm, endTime: e.target.value })}

                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-medium"

                  />

                </div>

              </div>



              {/* Checkboxes: Copy questions & copy groups */}

              <div className="pt-2 border-t border-sky-200 space-y-2 text-xs">

                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-800 cursor-pointer font-medium">

                  <input

                    type="checkbox"

                    checked={cloneForm.copyQuestions}

                    onChange={(e) => setCloneForm({ ...cloneForm, copyQuestions: e.target.checked })}

                    className="rounded bg-sky-100 border-slate-300 text-blue-600 focus:ring-0"

                  />

                  <span>

                    Salin seluruh <strong>{selectedExamForClone._count?.examQuestions || 0} butir soal</strong> ke ujian baru

                  </span>

                </label>

                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-800 cursor-pointer font-medium">

                  <input

                    type="checkbox"

                    checked={cloneForm.copyGroups}

                    onChange={(e) => setCloneForm({ ...cloneForm, copyGroups: e.target.checked })}

                    className="rounded bg-sky-100 border-slate-300 text-blue-600 focus:ring-0"

                  />

                  <span>

                    Salin kelas/rombel yang terdaftar ({selectedExamForClone.examGroups?.length || 0} kelas)

                  </span>

                </label>

              </div>



              {/* Action Buttons */}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-sky-200">

                <button

                  type="button"

                  onClick={() => setShowCloneModal(false)}

                  disabled={cloning}

                  className="px-4 py-2 bg-sky-100 hover:bg-slate-200 text-slate-700 dark:text-slate-800 rounded-xl text-xs font-semibold"

                >

                  Batal

                </button>

                <button

                  type="submit"

                  disabled={cloning}

                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"

                >

                  {cloning ? (

                    <>

                      <Loader2 className="w-3.5 h-3.5 animate-spin" />

                      <span>Menduplikasi...</span>

                    </>

                  ) : (

                    <>

                      <Copy className="w-3.5 h-3.5" />

                      <span>Duplikasi Ujian Sekarang</span>

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* New Exam Modal */}



      {showModal && (



        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-md z-50 flex items-center justify-center p-4">



          <div className="glass p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">



            <h2 className="text-lg font-bold text-slate-900 dark:text-black mb-1">Buat Konfigurasi Ujian Baru</h2>



            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Lengkapi detail tes, durasi, token, dan anti-cheat.</p>







            <form onSubmit={handleCreateExam} className="space-y-4">



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Judul Ujian</label>



                  <input



                    type="text"



                    required



                    value={form.title}



                    onChange={(e) => setForm({ ...form, title: e.target.value })}



                    placeholder="misal: Penilaian Akhir Semester (PAS) Matematika"



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-500 focus:outline-none focus:border-blue-500"



                  />



                </div>



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Ujian</label>



                  <input



                    type="text"



                    required



                    value={form.code}



                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}



                    placeholder="PAS-MTK-2026"



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase font-mono"



                  />



                </div>



              </div>







              <div>



                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mata Pelajaran</label>



                <select



                  required



                  value={form.subjectId}



                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}



                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500 font-semibold"



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



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Durasi (Menit)</label>



                  <input



                    type="number"



                    required



                    min={5}



                    max={360}



                    value={form.durationMinutes}



                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-500 focus:outline-none focus:border-blue-500"



                  />



                </div>



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Token Ujian Masuk</label>



                  <input



                    type="text"



                    value={form.token}



                    onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })}



                    placeholder="HEBAT"



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-blue-500 uppercase"



                  />



                </div>



              </div>







              {/* Schedule (Start & End Time) */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



                  Jadwal Waktu Pelaksanaan (Opsional / Otomatis Buka-Tutup):



                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">



                  <div>



                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Waktu Mulai Dibuka</label>



                    <input



                      type="datetime-local"



                      value={form.startTime || ""}



                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}



                      className="w-full px-3 py-2 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500"



                    />



                  </div>



                  <div>



                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Batas Waktu Ditutup</label>



                    <input



                      type="datetime-local"



                      value={form.endTime || ""}



                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}



                      className="w-full px-3 py-2 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500"



                    />



                  </div>



                </div>



              </div>







              {/* Kategori Ujian: Reguler vs PKL */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-2">



                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



                  Kategori Peserta Ujian:



                </label>



                <div className="grid grid-cols-2 gap-3">



                  <label



                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${



                      form.category === "REGULER"



                        ? "bg-blue-100 border-blue-600 text-blue-950 font-bold shadow-xs"



                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"



                    }`}



                  >



                    <input



                      type="radio"



                      name="category_create"



                      value="REGULER"



                      checked={form.category === "REGULER"}



                      onChange={() => setForm({ ...form, category: "REGULER", disableAntiCheat: false })}



                      className="text-blue-600"



                    />



                    <div>



                      <div className="text-xs font-bold">🏫 Khusus REGULER</div>



                      <div className="text-[10px] opacity-75">Siswa PKL diblokir</div>



                    </div>



                  </label>







                  <label



                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${



                      form.category === "PKL"



                        ? "bg-purple-100 border-purple-600 text-purple-950 font-bold shadow-xs"



                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"



                    }`}



                  >



                    <input



                      type="radio"



                      name="category_create"



                      value="PKL"



                      checked={form.category === "PKL"}



                      onChange={() => setForm({ ...form, category: "PKL", disableAntiCheat: true })}



                      className="text-purple-600"



                    />



                    <div>



                      <div className="text-xs font-bold">🏢 Khusus PKL (Magang)</div>



                      <div className="text-[10px] opacity-75">Siswa reguler diblokir</div>



                    </div>



                  </label>



                </div>



              </div>







              {/* Target Groups / Classes */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="flex items-center justify-between">



                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



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



                            : "bg-white dark:bg-sky-50 border-slate-200 dark:border-sky-200 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:border-sky-200"



                        }`}



                      >



                        <input



                          type="checkbox"



                          checked={isChecked}



                          onChange={(e) => {



                            if (e.target.checked) {



                              setForm({ ...form, groupIds: [...form.groupIds, g.id] });



                            } else {



                              setForm({ ...form, groupIds: form.groupIds.filter((id: string) => id !== g.id) });



                            }



                          }}



                          className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                        />



                        <span className="truncate">{g.name}</span>



                      </label>



                    );



                  })}



                </div>



              
                {/* ⏱️ IDE 4: Session & Lab Assignment UI */}
                {form.groupIds && form.groupIds.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-100/70 border border-sky-200 dark:border-sky-300 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-700" />
                          <span>Jadwal Sesi & Ruang Lab ({form.groupIds.length} Kelas Terpilih)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-700 font-medium">
                          Bagi jam login per kelas agar siswa tidak berebut antrean PC lab.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => applySessionPreset("ALL_SESI_1", false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 font-bold text-slate-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                        >
                          Semua Sesi 1
                        </button>
                        <button
                          type="button"
                          onClick={() => applySessionPreset("SPLIT_1_2", false)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-2xs cursor-pointer"
                        >
                          Bagi Sesi 1 & 2
                        </button>
                        <button
                          type="button"
                          onClick={() => applySessionPreset("RESET", false)}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition text-[10px] cursor-pointer"
                        >
                          Reset Bebas
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {form.groupIds.map((gid: string) => {
                        const groupObj = groups.find((g) => g.id === gid);
                        const groupData = form.groupsData?.[gid] || {};

                        return (
                          <div
                            key={gid}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-sky-200 text-xs shadow-2xs"
                          >
                            <div className="font-black text-black sm:w-36 truncate">
                              {groupObj?.name || gid}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                              <select
                                value={groupData.sessionName || ""}
                                onChange={(e) => updateGroupSession(gid, "sessionName", e.target.value, false)}
                                className="px-2 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-black focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- Bebas (Ikut Ujian) --</option>
                                <option value="Sesi 1">Sesi 1 (07:30 - 09:30)</option>
                                <option value="Sesi 2">Sesi 2 (10:00 - 12:00)</option>
                                <option value="Sesi 3">Sesi 3 (13:00 - 15:00)</option>
                                <option value="Kustom">Kustom Jam</option>
                              </select>

                              <select
                                value={groupData.room || ""}
                                onChange={(e) => updateGroupSession(gid, "room", e.target.value, false)}
                                className="px-2 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-black focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- Bebas Lab --</option>
                                <option value="Lab 1">Lab 1</option>
                                <option value="Lab 2">Lab 2</option>
                                <option value="Lab 3">Lab 3</option>
                                <option value="Lab 4">Lab 4</option>
                                <option value="Lab 5">Lab 5</option>
                                <option value="Lab 6">Lab 6</option>
                                <option value="Lab 7">Lab 7</option>
                              </select>

                              {groupData.sessionName && (
                                <div className="flex items-center gap-1 text-[11px] font-mono">
                                  <input
                                    type="datetime-local"
                                    value={groupData.startTime || ""}
                                    onChange={(e) => updateGroupSession(gid, "startTime", e.target.value, false)}
                                    className="px-1.5 py-1 bg-sky-50 border border-sky-200 rounded text-[10px] text-black"
                                    title="Jam Buka Akses Kelas Ini"
                                  />
                                  <span>-</span>
                                  <input
                                    type="datetime-local"
                                    value={groupData.endTime || ""}
                                    onChange={(e) => updateGroupSession(gid, "endTime", e.target.value, false)}
                                    className="px-1.5 py-1 bg-sky-50 border border-sky-200 rounded text-[10px] text-black"
                                    title="Jam Tutup Akses Kelas Ini"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
</div>







              {/* Toggles */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">



                  Pengaturan Keamanan & Tampilan Hasil:



                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">



                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={form.disableAntiCheat}



                      onChange={(e) => setForm({ ...form, disableAntiCheat: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-amber-600 focus:ring-0"



                    />



                    <span className="font-bold text-amber-900">🛡️ Bebas Pelanggaran (Khusus PKL)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={form.isTokenDynamic}



                      onChange={(e) => setForm({ ...form, isTokenDynamic: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Token Dinamis (Rotasi Tiap 15m)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={form.requireKioskBrowser}



                      onChange={(e) => setForm({ ...form, requireKioskBrowser: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Wajib Exambro / Safe Exam Browser</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={form.shuffleQuestions}



                      onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Acak Urutan Soal Siswa</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={form.shuffleOptions}



                      onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Acak Opsi Pilihan (A, B, C, D)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer col-span-1 sm:col-span-2 pt-1 border-t border-sky-300/60">



                    <input



                      type="checkbox"



                      checked={form.showResult}



                      onChange={(e) => setForm({ ...form, showResult: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>



                      <strong>Tampilkan Nilai Langsung ke Siswa</strong> (Jika tidak dicentang, siswa akan melihat pesan apresiasi santun dan nilai disimpan rahasia)



                    </span>



                  </label>



                </div>



              </div>







              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-sky-200">



                <button



                  type="button"



                  onClick={() => setShowModal(false)}



                  className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"



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







      {/* Modal Ganti Token Massal */}



      {showTokenModal && (



        <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">



          <div className="glass p-6 max-w-md w-full animate-in zoom-in-95 rounded-2xl bg-white dark:bg-sky-50 shadow-2xl border border-sky-300">



            <div className="flex items-center justify-between mb-4">



              <div className="flex items-center gap-2">



                <Key className="w-5 h-5 text-blue-600" />



                <h3 className="text-base font-black text-slate-900 dark:text-black">



                  Ganti Token Massal ({selectedIds.length} Ujian)



                </h3>



              </div>



              <button



                onClick={() => setShowTokenModal(false)}



                className="p-1 text-slate-400 hover:text-slate-600 rounded"



              >



                ✕



              </button>



            </div>







            <p className="text-xs text-slate-600 dark:text-slate-700 mb-4">



              Token berikut akan diterapkan serentak ke seluruh <strong>{selectedIds.length}</strong> jadwal ujian yang sedang dipilih.



            </p>







            <form onSubmit={handleBulkSetToken} className="space-y-4">



              <div>



                <label className="block text-xs font-bold text-slate-700 dark:text-slate-800 mb-1.5">



                  Token Baru (Kapital / Huruf & Angka)



                </label>



                <input



                  type="text"



                  required



                  value={bulkTokenInput}



                  onChange={(e) => setBulkTokenInput(e.target.value.toUpperCase())}



                  placeholder="misal: STS26"



                  maxLength={10}



                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-black tracking-widest uppercase focus:outline-none focus:border-blue-500"



                />



              </div>







              <div className="flex items-center justify-end gap-2 pt-2">



                <button



                  type="button"



                  onClick={() => setShowTokenModal(false)}



                  className="btn-default py-2 px-4 text-xs font-bold"



                >



                  Batal



                </button>



                <button



                  type="submit"



                  disabled={bulkLoading}



                  className="btn-primary py-2 px-5 text-xs font-black"



                >



                  {bulkLoading ? "Memproses..." : "Terapkan Token"}



                </button>



              </div>



            </form>



          </div>



        </div>



      )}







      {/* Edit Exam Modal */}



      {showEditModal && editForm && (



        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs backdrop-blur-md z-50 flex items-center justify-center p-4">



          <div className="glass p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">



            <h2 className="text-lg font-bold text-slate-900 dark:text-black mb-1">Edit Pengaturan Ujian</h2>



            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Ubah detail judul, token, durasi, dan anti-cheat.</p>







            <form onSubmit={handleUpdateExam} className="space-y-4">



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Judul Ujian</label>



                  <input



                    type="text"



                    required



                    value={editForm.title}



                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black"



                  />



                </div>



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Ujian</label>



                  <input



                    type="text"



                    required



                    value={editForm.code}



                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black font-mono uppercase"



                  />



                </div>



              </div>







              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Durasi (Menit)</label>



                  <input



                    type="number"



                    required



                    min={5}



                    value={editForm.durationMinutes}



                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })}



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black"



                  />



                </div>



                <div>



                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Token Ujian Masuk</label>



                  <input



                    type="text"



                    value={editForm.token}



                    onChange={(e) => setEditForm({ ...editForm, token: e.target.value.toUpperCase() })}



                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-amber-400 font-mono font-bold uppercase"



                  />



                </div>



              </div>







              {/* Schedule (Start & End Time) */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



                  Jadwal Waktu Pelaksanaan (Opsional / Otomatis Buka-Tutup):



                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">



                  <div>



                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Waktu Mulai Dibuka</label>



                    <input



                      type="datetime-local"



                      value={editForm.startTime || ""}



                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}



                      className="w-full px-3 py-2 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500"



                    />



                  </div>



                  <div>



                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Batas Waktu Ditutup</label>



                    <input



                      type="datetime-local"



                      value={editForm.endTime || ""}



                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}



                      className="w-full px-3 py-2 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black focus:outline-none focus:border-blue-500"



                    />



                  </div>



                </div>



              </div>







              {/* Kategori Ujian: Reguler vs PKL */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-2">



                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



                  Kategori Peserta Ujian:



                </label>



                <div className="grid grid-cols-2 gap-3">



                  <label



                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${



                      editForm.category === "REGULER"



                        ? "bg-blue-100 border-blue-600 text-blue-950 font-bold shadow-xs"



                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"



                    }`}



                  >



                    <input



                      type="radio"



                      name="category_edit"



                      value="REGULER"



                      checked={editForm.category === "REGULER"}



                      onChange={() => setEditForm({ ...editForm, category: "REGULER" })}



                      className="text-blue-600"



                    />



                    <div>



                      <div className="text-xs font-bold">🏫 Khusus REGULER</div>



                      <div className="text-[10px] opacity-75">Siswa PKL diblokir</div>



                    </div>



                  </label>







                  <label



                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${



                      editForm.category === "PKL"



                        ? "bg-purple-100 border-purple-600 text-purple-950 font-bold shadow-xs"



                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"



                    }`}



                  >



                    <input



                      type="radio"



                      name="category_edit"



                      value="PKL"



                      checked={editForm.category === "PKL"}



                      onChange={() => setEditForm({ ...editForm, category: "PKL" })}



                      className="text-purple-600"



                    />



                    <div>



                      <div className="text-xs font-bold">🏢 Khusus PKL (Magang)</div>



                      <div className="text-[10px] opacity-75">Siswa reguler diblokir</div>



                    </div>



                  </label>



                </div>



              </div>







              {/* Target Groups / Classes */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="flex items-center justify-between">



                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">



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



                            : "bg-white dark:bg-sky-50 border-slate-200 dark:border-sky-200 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:border-sky-200"



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



                          className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                        />



                        <span className="truncate">{g.name}</span>



                      </label>



                    );



                  })}



                </div>



              
                {/* ⏱️ IDE 4: Session & Lab Assignment UI */}
                {editForm.groupIds && editForm.groupIds.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-100/70 border border-sky-200 dark:border-sky-300 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-black flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-700" />
                          <span>Jadwal Sesi & Ruang Lab ({editForm.groupIds.length} Kelas Terpilih)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-700 font-medium">
                          Bagi jam login per kelas agar siswa tidak berebut antrean PC lab.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => applySessionPreset("ALL_SESI_1", true)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 font-bold text-slate-800 hover:bg-sky-100 transition shadow-2xs cursor-pointer"
                        >
                          Semua Sesi 1
                        </button>
                        <button
                          type="button"
                          onClick={() => applySessionPreset("SPLIT_1_2", true)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-2xs cursor-pointer"
                        >
                          Bagi Sesi 1 & 2
                        </button>
                        <button
                          type="button"
                          onClick={() => applySessionPreset("RESET", true)}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition text-[10px] cursor-pointer"
                        >
                          Reset Bebas
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {editForm.groupIds.map((gid: string) => {
                        const groupObj = groups.find((g) => g.id === gid);
                        const groupData = editForm.groupsData?.[gid] || {};

                        return (
                          <div
                            key={gid}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-sky-200 text-xs shadow-2xs"
                          >
                            <div className="font-black text-black sm:w-36 truncate">
                              {groupObj?.name || gid}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                              <select
                                value={groupData.sessionName || ""}
                                onChange={(e) => updateGroupSession(gid, "sessionName", e.target.value, true)}
                                className="px-2 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-black focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- Bebas (Ikut Ujian) --</option>
                                <option value="Sesi 1">Sesi 1 (07:30 - 09:30)</option>
                                <option value="Sesi 2">Sesi 2 (10:00 - 12:00)</option>
                                <option value="Sesi 3">Sesi 3 (13:00 - 15:00)</option>
                                <option value="Kustom">Kustom Jam</option>
                              </select>

                              <select
                                value={groupData.room || ""}
                                onChange={(e) => updateGroupSession(gid, "room", e.target.value, true)}
                                className="px-2 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-black focus:outline-none focus:border-blue-500"
                              >
                                <option value="">-- Bebas Lab --</option>
                                <option value="Lab 1">Lab 1</option>
                                <option value="Lab 2">Lab 2</option>
                                <option value="Lab 3">Lab 3</option>
                                <option value="Lab 4">Lab 4</option>
                                <option value="Lab 5">Lab 5</option>
                                <option value="Lab 6">Lab 6</option>
                                <option value="Lab 7">Lab 7</option>
                              </select>

                              {groupData.sessionName && (
                                <div className="flex items-center gap-1 text-[11px] font-mono">
                                  <input
                                    type="datetime-local"
                                    value={groupData.startTime || ""}
                                    onChange={(e) => updateGroupSession(gid, "startTime", e.target.value, true)}
                                    className="px-1.5 py-1 bg-sky-50 border border-sky-200 rounded text-[10px] text-black"
                                    title="Jam Buka Akses Kelas Ini"
                                  />
                                  <span>-</span>
                                  <input
                                    type="datetime-local"
                                    value={groupData.endTime || ""}
                                    onChange={(e) => updateGroupSession(gid, "endTime", e.target.value, true)}
                                    className="px-1.5 py-1 bg-sky-50 border border-sky-200 rounded text-[10px] text-black"
                                    title="Jam Tutup Akses Kelas Ini"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
</div>







              {/* Toggles */}



              <div className="p-4 rounded-xl bg-slate-50 dark:bg-sky-50 border border-sky-300/80 space-y-3">



                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">



                  Pengaturan Keamanan & Tampilan Hasil:



                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">



                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={editForm.disableAntiCheat}



                      onChange={(e) => setEditForm({ ...editForm, disableAntiCheat: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-amber-600 focus:ring-0"



                    />



                    <span className="font-bold text-amber-900">🛡️ Bebas Pelanggaran (Khusus PKL)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={editForm.isTokenDynamic}



                      onChange={(e) => setEditForm({ ...editForm, isTokenDynamic: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Token Dinamis (Rotasi Tiap 15m)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={editForm.requireKioskBrowser}



                      onChange={(e) => setEditForm({ ...editForm, requireKioskBrowser: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Wajib Exambro / Safe Exam Browser</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={editForm.shuffleQuestions}



                      onChange={(e) => setEditForm({ ...editForm, shuffleQuestions: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Acak Urutan Soal Siswa</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">



                    <input



                      type="checkbox"



                      checked={editForm.shuffleOptions}



                      onChange={(e) => setEditForm({ ...editForm, shuffleOptions: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>Acak Opsi Pilihan (A, B, C, D)</span>



                  </label>







                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer col-span-1 sm:col-span-2 pt-1 border-t border-sky-300/60">



                    <input



                      type="checkbox"



                      checked={editForm.showResult}



                      onChange={(e) => setEditForm({ ...editForm, showResult: e.target.checked })}



                      className="rounded bg-sky-100 border-slate-200 dark:border-sky-200 text-blue-600 focus:ring-0"



                    />



                    <span>



                      <strong>Tampilkan Nilai Langsung ke Siswa</strong> (Jika tidak dicentang, siswa akan melihat pesan apresiasi santun dan nilai disimpan rahasia)



                    </span>



                  </label>



                </div>



              </div>







              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-sky-200">



                <button



                  type="button"



                  onClick={() => setShowEditModal(false)}



                  className="px-4 py-2 bg-sky-100 hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"



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



