import { StudentAnswerSheetModal } from "@/components/StudentAnswerSheetModal";

"use client";







import React, { useEffect, useState, use } from "react";



import { useRouter } from "next/navigation";



import {



  Activity,



  ArrowLeft,



  RotateCcw,



  Clock,



  Key,



  Users,



  ShieldAlert,



  CheckCircle2,



  AlertCircle,



  Play,



  Lock,



  Unlock,



  StopCircle,



  PlusCircle,



  Search,



  Filter,



  Layers,



  BarChart3,



  LayoutGrid,



  List,



  Sparkles,



  Zap,

  Copy,

  FileText,

  Printer,



  MoreVertical,



  Laptop,

  Building2,



  Check,



  Send,



} from "lucide-react";



import { formatTime } from "@/lib/utils";







export default function ExamProctorPage({



  params,



}: {



  params: Promise<{ examId: string }>;



}) {



  const { examId } = use(params);



  const router = useRouter();







  const [data, setData] = useState<any>(null);



  const [loading, setLoading] = useState(true);



  const [autoRefresh, setAutoRefresh] = useState(true);



  const [search, setSearch] = useState("");



  const [filterStatus, setFilterStatus] = useState("ALL");



  const [selectedGroup, setSelectedGroup] = useState("ALL");



  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [selectedTrack, setSelectedTrack] = useState<"ALL" | "REGULER" | "PKL" | "SUSULAN">("ALL");



  const [selectedSessionName, setSelectedSessionName] = useState<string>("ALL");



  useEffect(() => {

    if (typeof window !== "undefined") {

      const saved = localStorage.getItem("cbt_proctor_selected_room");

      if (saved) setSelectedRoom(saved);

    }

  }, []);



  const handleSelectRoom = (room: string) => {

    setSelectedRoom(room);

    if (typeof window !== "undefined") {

      localStorage.setItem("cbt_proctor_selected_room", room);

    }

  };



  const [groupByClass, setGroupByClass] = useState(false);



  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");



  const [actionLoading, setActionLoading] = useState<string | null>(null);







  // Time Add Modal State



  const [selectedSessionForTime, setSelectedSessionForTime] = useState<any | null>(null);

  const [tokenCopied, setTokenCopied] = useState(false);



  const handleCopyToken = () => {

    if (exam?.token) {

      navigator.clipboard.writeText(exam.token);

      setTokenCopied(true);

      setTimeout(() => setTokenCopied(false), 2000);

    }

  };



  const [timeToAdd, setTimeToAdd] = useState<number>(10);



  const [showBroadcastModal, setShowBroadcastModal] = useState(false);



  const [broadcastMessage, setBroadcastMessage] = useState("");

  const [answerModalSessionId, setAnswerModalSessionId] = useState<string | null>(null);

  const [answerModalStudentName, setAnswerModalStudentName] = useState<string>("");



  const [sendingBroadcast, setSendingBroadcast] = useState(false);







  useEffect(() => {



    fetchProctorData();



    let interval: NodeJS.Timeout | null = null;



    if (autoRefresh) {



      interval = setInterval(() => {



        fetchProctorData(false);



      }, 5000);



    }



    return () => {



      if (interval) clearInterval(interval);



    };



  }, [examId, autoRefresh]);







  const fetchProctorData = async (showLoading = true) => {



    try {



      if (showLoading) setLoading(true);



      const res = await fetch(`/api/admin/exams/${examId}/proctor`);



      if (res.ok) {



        const d = await res.json();



        setData(d);



      }



    } catch (e) {



      console.error(e);



    } finally {



      if (showLoading) setLoading(false);



    }



  };







  const handleSendBroadcast = async () => {



    if (!broadcastMessage.trim()) {



      alert("Tuliskan pesan pengumuman terlebih dahulu.");



      return;



    }



    try {



      setSendingBroadcast(true);



      const res = await fetch(`/api/admin/exams/${examId}/broadcast`, {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ message: broadcastMessage }),



      });



      const data = await res.json();



      if (!res.ok) throw new Error(data.error || "Gagal menyiarkan pengumuman");



      alert("✅ Pengumuman berhasil disiarkan ke layar seluruh peserta!");



      setShowBroadcastModal(false);



      setBroadcastMessage("");



    } catch (err: any) {



      alert(err.message);



    } finally {



      setSendingBroadcast(false);



    }



  };







  const handleAction = async (



    action: string,



    sessionId?: string,



    additionalMinutes?: number | null,



    isDynamic?: boolean,



    sessionIds?: string[]



  ) => {



    if (action === "RESET" && !confirm("Yakin ingin mereset sesi peserta ini? Semua jawaban akan dihapus dan peserta dapat mengulang dari awal.")) {



      return;



    }



    if (action === "FORCE_FINISH" && !confirm("Yakin ingin menghentikan paksa ujian peserta ini? Nilai akan dihitung dari jawaban yang telah tersimpan.")) {



      return;



    }







    setActionLoading((sessionId || "") + action);



    try {



      const res = await fetch(`/api/admin/exams/${examId}/proctor`, {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ action, sessionId, additionalMinutes, isDynamic, sessionIds }),



      });







      const resData = await res.json();



      if (!res.ok) throw new Error(resData.error || "Gagal memproses aksi");







      await fetchProctorData(false);



      if (action === "ADD_TIME") {



        setSelectedSessionForTime(null);



      }



    } catch (err: any) {



      alert(err.message);



    } finally {



      setActionLoading(null);



    }



  };







  const exam = data?.exam;



  const sessions = data?.sessions || [];







  // Extract unique class groups, rooms, and sessions

  const availableGroups: string[] = Array.from(

    new Set(sessions.map((s: any) => s.user.group?.name || "Reguler").filter(Boolean))

  );



  const availableRooms: string[] = Array.from(new Set(

    ((data?.roomsList && data.roomsList.length > 0)

      ? data.roomsList

      : sessions.map((s: any) => s.room).filter(Boolean)) as string[]

  )).sort();



  const availableSessions: string[] = Array.from(new Set(

    ((data?.sessionsList && data.sessionsList.length > 0)

      ? data.sessionsList

      : sessions.map((s: any) => s.sessionName).filter(Boolean)) as string[]

  )).sort();



  const filteredSessions = sessions.filter((s: any) => {

    const groupName = s.user.group?.name || "Reguler";

    const roomName = s.room || "Umum";

    const sessionLabel = s.sessionName || "Sesi Umum";



    const matchGroup = selectedGroup === "ALL" || groupName === selectedGroup;

    const matchRoom = selectedRoom === "ALL" || roomName === selectedRoom;

    const track = s.track || (s.isPkl ? "PKL" : s.isSusulan ? "SUSULAN" : "REGULER");
    const matchTrack = selectedTrack === "ALL" || track === selectedTrack;
    const matchSession = selectedSessionName === "ALL" || sessionLabel === selectedSessionName;

    const matchSearch =

      s.user.name.toLowerCase().includes(search.toLowerCase()) ||

      s.user.username.toLowerCase().includes(search.toLowerCase()) ||

      groupName.toLowerCase().includes(search.toLowerCase()) ||

      roomName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;



    return matchGroup && matchRoom && matchSession && matchTrack && matchSearch && matchStatus;

  });



  // KPI Metrics scoped to selected lab

  const labScopeSessions = selectedRoom === "ALL"

    ? sessions

    : sessions.filter((s: any) => (s.room || "Umum") === selectedRoom);



  const inProgressCount = labScopeSessions.filter((s: any) => s.status === "IN_PROGRESS").length;

  const completedCount = labScopeSessions.filter((s: any) => s.status === "COMPLETED").length;

  const suspendedCount = labScopeSessions.filter((s: any) => s.status === "SUSPENDED").length;







  return (



    <div className="space-y-6">



      {/* Top Header */}



      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-sky-200">



        <div className="flex items-center gap-3">



          <button



            onClick={() => router.push("/admin/exams")}



            className="p-2 rounded-xl bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-xs transition"



          >



            <ArrowLeft className="w-4 h-4" />



          </button>



          <div>



            <div className="flex items-center gap-2">



              <h1 className="text-xl font-bold text-slate-900 dark:text-black tracking-tight">{exam?.title}</h1>



              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">



                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />



                LIVE PROCTOR



              </span>



              {exam?.category === "PKL" ? (



                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">



                  KHUSUS PKL



                </span>



              ) : (



                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">



                  REGULER



                </span>



              )}



            </div>



            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">



              Kode: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{exam?.code}</span> • Token:{" "}



              <span className="font-mono font-black text-amber-600 dark:text-amber-400">{exam?.token}</span>



            </div>



          </div>



        </div>







        {/* 🛡️ Track Selector (Reguler vs PKL vs Susulan) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 shrink-0">Jalur:</span>
        <button
          onClick={() => setSelectedTrack("ALL")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            selectedTrack === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          Semua Jalur
        </button>
        <button
          onClick={() => setSelectedTrack("REGULER")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            selectedTrack === "REGULER" ? "bg-cyan-700 text-white shadow-xs" : "bg-white text-cyan-800 border border-cyan-200 hover:bg-slate-100"
          }`}
        >
          🏫 Reguler (Lab)
        </button>
        <button
          onClick={() => setSelectedTrack("PKL")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            selectedTrack === "PKL" ? "bg-amber-600 text-white shadow-xs" : "bg-white text-amber-800 border border-amber-200 hover:bg-slate-100"
          }`}
        >
          📱 PKL (HP)
        </button>
        <button
          onClick={() => setSelectedTrack("SUSULAN")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
            selectedTrack === "SUSULAN" ? "bg-purple-700 text-white shadow-xs" : "bg-white text-purple-800 border border-purple-200 hover:bg-slate-100"
          }`}
        >
          📋 Susulan
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">



          {/* View Switcher */}



          <div className="flex items-center bg-white dark:bg-sky-50 p-1 rounded-xl border border-slate-200 dark:border-sky-200 shadow-xs">



            <button



              onClick={() => setViewMode("GRID")}



              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${



                viewMode === "GRID"



                  ? "bg-blue-600 text-white shadow-xs"



                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"



              }`}



              title="Tampilan Kartu Grid"



            >



              <LayoutGrid className="w-3.5 h-3.5" />



              <span className="hidden sm:inline">Grid</span>



            </button>



            <button



              onClick={() => setViewMode("TABLE")}



              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${



                viewMode === "TABLE"



                  ? "bg-blue-600 text-white shadow-xs"



                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"



              }`}



              title="Tampilan Tabel"



            >



              <List className="w-3.5 h-3.5" />



              <span className="hidden sm:inline">Tabel</span>



            </button>



          </div>







          <button



            onClick={() => router.push(`/admin/exams/${examId}/analysis`)}



            className="p-2.5 bg-white hover:bg-slate-50 dark:bg-sky-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-sky-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"



            title="Buka Analisis Butir Soal Psikometri"



          >



            <BarChart3 className="w-3.5 h-3.5" />



            <span className="hidden sm:inline">Analisis Soal</span>



          </button>







          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-sky-50 px-3 py-2 rounded-xl border border-slate-200 dark:border-sky-200 shadow-xs cursor-pointer">



            <input



              type="checkbox"



              checked={autoRefresh}



              onChange={(e) => setAutoRefresh(e.target.checked)}



              className="rounded border-slate-300 dark:border-sky-200 text-blue-600 focus:ring-0"



            />



            <span className="hidden sm:inline">Auto-Refresh (5s)</span>



          </label>







          <button



            onClick={() => fetchProctorData(true)}



            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"



          >



            <RotateCcw className="w-3.5 h-3.5" />



            <span>Segarkan</span>



          </button>



        </div>



      </div>







      {/* Dynamic Token Banner */}



      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-100/80 dark:from-blue-950/60 dark:via-slate-900 dark:to-indigo-950/60 border border-blue-200/90 dark:border-blue-500/30 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">



        <div className="flex items-center gap-4">



          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">



            <Key className="w-6 h-6 text-amber-600 dark:text-amber-400" />



          </div>



          <div>



            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">



              <span>Token Ujian Aktif</span>



              {exam?.isTokenDynamic ? (



                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 animate-pulse">



                  Dinamis (Refresh Tiap 15 Menit)



                </span>



              ) : (



                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-sky-50 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-sky-200">



                  Statis



                </span>



              )}



            </div>



            <div className="flex items-center gap-3 mt-1">



              <span className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 tracking-wider">



                {exam?.token}



              </span>



              {exam?.isTokenDynamic && exam?.tokenSecondsLeft && (



                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-sky-50 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-sky-200 shadow-2xs">



                  Rotasi dalam: <span className="font-bold text-slate-900 dark:text-black">{formatTime(exam.tokenSecondsLeft)}</span>



                </div>



              )}



            </div>



          </div>



        </div>







        <div className="flex items-center gap-2.5 flex-wrap">



          <button



            onClick={() => handleAction("TOGGLE_DYNAMIC_TOKEN", "", null, !exam?.isTokenDynamic)}



            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${



              exam?.isTokenDynamic



                ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-500/30 shadow-md shadow-purple-600/20"



                : "bg-white dark:bg-sky-50 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-sky-200 shadow-2xs"



            }`}



          >



            {exam?.isTokenDynamic ? "Mode: Token Dinamis 15m (Aktif)" : "Ganti ke Token Dinamis 15m"}



          </button>







          <button



            onClick={() => handleAction("REGENERATE_TOKEN")}



            className="px-3.5 py-2 bg-white dark:bg-sky-50 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-sky-200 shadow-2xs transition"



            title="Generate Acak Token Baru"



          >



            Acak Token Baru



          </button>







          <button



            onClick={() => {



              if (confirm("Reset kunci login SEMUA siswa pada ujian ini? Siswa yang koneksinya terputus atau komputernya restart dapat langsung login kembali.")) {



                handleAction("RESET_ALL_LOGINS");



              }



            }}



            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"



            title="Buka kunci perangkat semua siswa di sesi ini sekaligus"



          >



            <Unlock className="w-3.5 h-3.5" />



            <span>Reset Kunci Login Semua Siswa</span>



          </button>







          <button

            onClick={() => setShowBroadcastModal(true)}

            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"

            title="Kirim pengumuman atau ralat soal ke layar seluruh siswa"

          >

            <Send className="w-3.5 h-3.5" />

            <span>📢 Broadcast ke Siswa</span>

          </button>



          {/* 🛡️ SAKLAR DARURAT: Nonaktifkan Pelanggaran Anti-Cheat Khusus PKL / Darurat */}

          <button

            onClick={async () => {

              const willDisable = !exam?.disableAntiCheat;

              const confirmMsg = willDisable

                ? "NONAKTIFKAN Fitur Pelanggaran (Mode Darurat PKL)?\n\n1. Layar siswa tidak akan dibekukan/dikunci saat tab switch atau sinyal drop.\n2. Seluruh siswa yang sedang tersuspend akan otomatis dibuka kuncinya sekarang!\n\nLanjutkan?"

                : "AKTIFKAN kembali Fitur Pelanggaran (Anti-Cheat Standard)?\n\nLayar siswa akan kembali dibekukan jika melakukan pelanggaran.";

              if (confirm(confirmMsg)) {

                try {

                  const res = await fetch(`/api/admin/exams/${examId}/proctor`, {

                    method: "POST",

                    headers: { "Content-Type": "application/json" },

                    body: JSON.stringify({ action: "TOGGLE_ANTI_CHEAT", disableAntiCheat: willDisable }),

                  });

                  const d = await res.json();

                  alert(d.message || "Status Anti-Cheat berhasil diperbarui");

                  await fetchProctorData(false);

                } catch (e: any) {

                  alert(e.message || "Gagal mengubah status");

                }

              }

            }}

            className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer border ${

              exam?.disableAntiCheat

                ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse"

                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"

            }`}

            title={exam?.disableAntiCheat ? "Mode Bebas Pelanggaran Aktif. Klik untuk aktifkan kembali anti-cheat." : "Anti-cheat aktif. Klik untuk nonaktifkan pelanggaran (mode darurat PKL)."}

          >

            <ShieldAlert className="w-3.5 h-3.5" />

            <span>{exam?.disableAntiCheat ? "🛡️ Pelanggaran: NONAKTIF (Mode PKL)" : "🛡️ Pelanggaran: AKTIF"}</span>

          </button>

        </div>



      </div>







      {/* Summary KPI Badges */}



      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">



        <div className="p-4 rounded-2xl bg-white dark:bg-sky-50 border border-slate-200/80 dark:border-sky-200 shadow-sm">



          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Peserta Ikut</div>



          <div className="text-2xl font-black text-slate-900 dark:text-black mt-1">{sessions.length}</div>



        </div>







        <div className="p-4 rounded-2xl bg-white dark:bg-sky-50 border border-slate-200/80 dark:border-sky-200 shadow-sm">



          <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">



            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />



            <span>Sedang Mengerjakan</span>



          </div>



          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{inProgressCount}</div>



        </div>







        <div className="p-4 rounded-2xl bg-white dark:bg-sky-50 border border-slate-200/80 dark:border-sky-200 shadow-sm">



          <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Telah Selesai</div>



          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</div>



        </div>







        <div className="p-4 rounded-2xl bg-white dark:bg-sky-50 border border-slate-200/80 dark:border-sky-200 shadow-sm">



          <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold">Dibekukan (Pelanggaran)</div>



          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{suspendedCount}</div>



        </div>



      </div>







      {/* 🏢 LAB SELECTOR BAR (Scope Ruang Lab Komputer 1-7) */}

      <div className="p-3 bg-white dark:bg-sky-50 rounded-2xl border border-slate-200 dark:border-sky-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">

        <div className="flex items-center gap-1.5 flex-wrap">

          <span className="text-xs font-bold text-slate-500 dark:text-slate-600 mr-1 flex items-center gap-1">

            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-500" /> Ruang Lab:

          </span>

          <button

            onClick={() => handleSelectRoom("ALL")}

            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${

              selectedRoom === "ALL"

                ? "bg-indigo-600 text-white shadow-xs"

                : "bg-slate-100 hover:bg-slate-200 dark:bg-white dark:hover:bg-slate-100 text-slate-700 dark:text-slate-800 border border-slate-200 dark:border-slate-300"

            }`}

          >

            🏢 Semua Ruang ({sessions.length})

          </button>

          {availableRooms.map((roomName: string) => {

            const count = sessions.filter((s: any) => (s.room || "Umum") === roomName).length;

            const isSelected = selectedRoom === roomName;

            return (

              <button

                key={roomName}

                onClick={() => handleSelectRoom(roomName)}

                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${

                  isSelected

                    ? "bg-indigo-600 text-white shadow-xs"

                    : "bg-slate-100 hover:bg-slate-200 dark:bg-white dark:hover:bg-slate-100 text-slate-700 dark:text-slate-800 border border-slate-200 dark:border-slate-300"

                }`}

              >

                🏫 {roomName} ({count})

              </button>

            );

          })}

        </div>



        {/* Aksi Cepat Reset Massal Lab Terpilih */}

        {selectedRoom !== "ALL" && (

          <div className="flex items-center gap-2">

            <button

              onClick={() => {

                const targetSessions = sessions.filter((s: any) => (s.room || "Umum") === selectedRoom);

                if (targetSessions.length === 0) return;

                if (confirm(`Reset kunci perangkat untuk SEMUA (${targetSessions.length}) siswa di ${selectedRoom}?\nSiswa di ruangan ini dapat login kembali sekarang.`)) {

                  handleAction("RESET_ALL_LOGINS", "", null, false, targetSessions.map((s: any) => s.id));

                }

              }}

              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-900 border border-amber-300 dark:border-amber-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"

              title={`Reset login massal untuk semua siswa di ${selectedRoom}`}

            >

              <Laptop className="w-3.5 h-3.5" /> Reset Login Semua Siswa {selectedRoom}

            </button>

          </div>

        )}

      </div>



      {/* Filter and Search Bar */}

      <div className="flex flex-col sm:flex-row gap-3">



        <div className="relative flex-1">



          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />



          <input



            type="text"



            value={search}



            onChange={(e) => setSearch(e.target.value)}



            placeholder="Cari nama peserta, NIS, username, atau kelas..."



            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-900 dark:text-black placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-500"



          />



        </div>







        {/* Filter Per Kelas / Rombel */}



        <select



          value={selectedGroup}



          onChange={(e) => setSelectedGroup(e.target.value)}



          className="px-3.5 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-800 dark:text-black font-semibold shadow-xs focus:outline-none focus:border-blue-500"



        >



          <option value="ALL">Semua Kelas ({availableGroups.length} Kelas)</option>



          {availableGroups.map((g) => {



            const countInGroup = sessions.filter((s: any) => (s.user.group?.name || "Reguler") === g).length;



            return (



              <option key={g} value={g}>



                Kelas: {g} ({countInGroup} Siswa)



              </option>



            );



          })}



        </select>







        {/* Filter Sesi Ujian */}

        {availableSessions.length > 0 && (

          <select

            value={selectedSessionName}

            onChange={(e) => setSelectedSessionName(e.target.value)}

            className="px-3.5 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-800 dark:text-black font-semibold shadow-xs focus:outline-none focus:border-blue-500"

          >

            <option value="ALL">Semua Sesi ({availableSessions.length})</option>

            {availableSessions.map((sName) => (

              <option key={sName} value={sName}>

                ⏱️ {sName}

              </option>

            ))}

          </select>

        )}



        {/* Filter Status Pengerjaan */}

        <select



          value={filterStatus}



          onChange={(e) => setFilterStatus(e.target.value)}



          className="px-3.5 py-2.5 bg-white dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl text-xs text-slate-800 dark:text-black font-semibold shadow-xs focus:outline-none focus:border-blue-500"



        >



          <option value="ALL">Semua Status ({sessions.length})</option>



          <option value="IN_PROGRESS">🟢 Mengerjakan ({inProgressCount})</option>



          <option value="COMPLETED">🏁 Selesai ({completedCount})</option>



          <option value="SUSPENDED">🔴 Dibekukan ({suspendedCount})</option>



        </select>







        {/* Group By Class Toggle */}



        <button



          onClick={() => setGroupByClass(!groupByClass)}



          className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${



            groupByClass



              ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"



              : "bg-white dark:bg-sky-50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-sky-200 hover:text-slate-900 dark:hover:text-white shadow-xs"



          }`}



          title="Kelompokkan tampilan berdasarkan Rombel/Kelas"



        >



          <Layers className="w-4 h-4" />



          <span>Grup Kelas</span>



        </button>



      </div>







      {/* LIVE PROCTORING VIEW */}



      {filteredSessions.length === 0 ? (



        <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-sky-50 border border-slate-200/80 dark:border-sky-200 rounded-2xl shadow-xs">



          Tidak ada data peserta yang cocok dengan kriteria pencarian.



        </div>



      ) : viewMode === "GRID" ? (



        /* 1. CARD GRID VIEW */



        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">



          {filteredSessions.map((s: any) => {



            const isInProgress = s.status === "IN_PROGRESS";



            const isCompleted = s.status === "COMPLETED";



            const isSuspended = s.status === "SUSPENDED";



            const hasViolations = s.violationCount > 0;







            return (



              <div



                key={s.id}



                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative shadow-xs ${



                  isSuspended



                    ? "bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/50"



                    : isInProgress && hasViolations



                    ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40"



                    : isInProgress



                    ? "bg-white dark:bg-sky-50/90 border-slate-200/90 dark:border-sky-200 hover:border-blue-400"



                    : "bg-slate-50/80 dark:bg-sky-50/50 border-slate-200 dark:border-sky-200/60 opacity-90"



                }`}



              >



                <div>



                  {/* Card Header: Avatar & Status Badge */}



                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-sky-200/70">



                    <div className="flex items-center gap-2.5">



                      <div



                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase text-white shadow-xs ${



                          isSuspended



                            ? "bg-rose-600"



                            : isInProgress



                            ? "bg-blue-600"



                            : "bg-emerald-600"



                        }`}



                      >



                        {s.user.name?.charAt(0) || "S"}



                      </div>



                      <div>



                        <div className="font-bold text-slate-900 dark:text-black text-xs leading-snug line-clamp-1">



                          {s.user.name}



                        </div>



                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">



                          <span>{s.user.username}</span>



                          <span>•</span>



                          <span>{s.user.group?.name || "Reguler"}</span>



                        </div>



                        <div className="flex items-center gap-1.5 flex-wrap mt-1">

                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-100 text-indigo-700 dark:text-indigo-900 border border-indigo-200 dark:border-indigo-300 flex items-center gap-1">

                            🏫 {s.room || "Umum"}

                          </span>

                          {s.sessionName && (

                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 dark:bg-amber-100 text-amber-700 dark:text-amber-900 border border-amber-200 dark:border-amber-300 flex items-center gap-1">

                              ⏱️ {s.sessionName}

                            </span>

                          )}
                          {(s.track === "PKL" || s.isPkl) ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              📱 PKL (HP)
                            </span>
                          ) : (s.track === "SUSULAN" || s.isSusulan) ? (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                              📋 Susulan
                            </span>
                          ) : null}

                        </div>



                      </div>



                    </div>







                    {/* Status Pill */}



                    {isInProgress ? (



                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 animate-pulse">



                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />



                        Aktif



                      </span>



                    ) : isCompleted ? (



                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">



                        <Check className="w-3 h-3" />



                        Nilai: {s.score ?? 0}



                      </span>



                    ) : (



                      <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">



                        <Lock className="w-3 h-3" />



                        Beku



                      </span>



                    )}



                  </div>







                  {/* Progress & Time Info */}



                  <div className="py-3 space-y-2.5">



                    <div className="flex items-center justify-between text-[11px]">



                      <span className="text-slate-500 dark:text-slate-400">Progres Soal:</span>



                      <span className="font-bold text-slate-900 dark:text-black">



                        {s.answeredCount} / {s.totalQuestions} ({s.progressPercent}%)



                      </span>



                    </div>







                    {/* Progress Bar */}



                    <div className="w-full h-1.5 bg-slate-100 dark:bg-sky-50 rounded-full overflow-hidden border border-slate-200 dark:border-sky-200">



                      <div



                        className={`h-full transition-all duration-300 ${



                          isCompleted



                            ? "bg-emerald-500"



                            : isSuspended



                            ? "bg-rose-500"



                            : "bg-blue-500"



                        }`}



                        style={{ width: `${s.progressPercent}%` }}



                      />



                    </div>







                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">



                      <div className="flex items-center gap-1">



                        <Clock className="w-3 h-3 text-slate-400" />



                        <span>Sisa Waktu:</span>



                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">



                          {formatTime(s.remainingSeconds)}



                        </span>



                      </div>







                      <div



                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 ${



                          hasViolations



                            ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"



                            : "text-slate-400 dark:text-slate-500"



                        }`}



                      >



                        <ShieldAlert className="w-3 h-3" />



                        <span>{s.violationCount}x</span>



                      </div>



                    </div>



                  </div>



                </div>







                {/* Card Footer Actions */}



                <div className="pt-3 border-t border-slate-100 dark:border-sky-200/70 grid grid-cols-2 gap-1.5">



                  {isSuspended && (



                    <button



                      onClick={() => handleAction("UNLOCK", s.id)}



                      className="col-span-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1 shadow-xs"



                    >



                      <Unlock className="w-3.5 h-3.5" /> Buka Kunci



                    </button>



                  )}







                  {isInProgress && (



                    <>



                      <button



                        onClick={() => {



                          setSelectedSessionForTime(s);



                          setTimeToAdd(10);



                        }}



                        className="py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-sky-200 transition flex items-center justify-center gap-1"



                        title="Tambah Waktu Ujian"



                      >



                        <PlusCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" /> +Waktu



                      </button>







                      <button



                        onClick={() => handleAction("FORCE_FINISH", s.id)}



                        className="py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold rounded-xl transition flex items-center justify-center gap-1"



                        title="Hentikan & Hitung Nilai Sekarang"



                      >



                        <StopCircle className="w-3 h-3" /> Selesai



                      </button>



                    </>



                  )}







                  <button



                    onClick={() => handleAction("RESET_LOGIN", s.id)}



                    className={`py-1 bg-white hover:bg-slate-100 dark:bg-sky-50 dark:hover:bg-sky-100 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-[10px] font-medium rounded-lg border border-slate-200 dark:border-sky-200 transition flex items-center justify-center gap-1 shadow-2xs ${



                      isInProgress ? "col-span-2" : "col-span-1"



                    }`}



                    title="Buka Kunci Perangkat jika siswa ganti laptop/komputer"



                  >



                    <Laptop className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Reset Perangkat



                  </button>







                  <button



                    onClick={() => handleAction("RESET", s.id)}



                    className={`py-1 bg-white hover:bg-rose-50 dark:bg-sky-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300 text-[10px] font-medium rounded-lg border border-slate-200 dark:border-sky-200 hover:border-rose-200 dark:hover:border-rose-500/30 transition flex items-center justify-center gap-1 shadow-2xs ${



                      isInProgress ? "col-span-2" : "col-span-1"



                    }`}



                    title="Hapus sesi agar peserta mengulang"



                  >



                    <RotateCcw className="w-3 h-3" /> Ulang Dari Awal



                  </button>



                </div>



              </div>



            );



          })}



        </div>



      ) : (



        /* 2. TABLE VIEW */



        <div className="glass overflow-hidden">



          <div className="overflow-x-auto">



            <table className="w-full text-left text-xs">



              <thead className="bg-slate-50 dark:bg-sky-50/80 border-b border-slate-200 dark:border-sky-200 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[10px]">



                <tr>



                  <th className="py-3 px-4">Nama Siswa / Akun</th>



                  <th className="py-3 px-4">Status & Waktu</th>



                  <th className="py-3 px-4">Progres Lembar Soal</th>



                  <th className="py-3 px-4 text-center">Pelanggaran</th>



                  <th className="py-3 px-4 text-right">Aksi Proktor</th>



                </tr>



              </thead>



              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">



                {filteredSessions.map((s: any) => {



                  return (



                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-sky-100 transition">



                      <td className="py-3 px-4">



                        <div className="font-bold text-slate-900 dark:text-black text-sm">{s.user.name}</div>



                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">



                          <span>{s.user.username}</span>



                          <span>•</span>



                          <span>{s.user.group?.name || "Kelas Reguler"}</span>



                          <span>•</span>



                          <span className="font-bold text-indigo-600 dark:text-indigo-700">🏫 {s.room || "Umum"}</span>



                          {s.sessionName && (

                            <>

                              <span>•</span>

                              <span className="font-semibold text-amber-600 dark:text-amber-700">⏱️ {s.sessionName}</span>

                            </>

                          )}



                          <span>•</span>



                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{s.ipAddress || "127.0.0.1"}</span>



                        </div>



                      </td>







                      <td className="py-3 px-4">



                        <div className="flex items-center gap-2 mb-1">



                          {s.status === "IN_PROGRESS" ? (



                            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-[10px] font-bold flex items-center gap-1 animate-pulse">



                              <Clock className="w-3 h-3" /> Mengerjakan



                            </span>



                          ) : s.status === "COMPLETED" ? (



                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">



                              <CheckCircle2 className="w-3 h-3" /> Selesai ({s.score ?? 0})



                            </span>



                          ) : (



                            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[10px] font-bold flex items-center gap-1">



                              <Lock className="w-3 h-3" /> Dibekukan



                            </span>



                          )}



                        </div>



                        {s.status === "IN_PROGRESS" && (



                          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">



                            Sisa: {formatTime(s.remainingSeconds)}



                          </div>



                        )}



                      </td>







                      <td className="py-3 px-4 min-w-[180px]">



                        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">



                          <span>



                            {s.answeredCount} dari {s.totalQuestions} Soal



                          </span>



                          <span className="font-bold text-slate-900 dark:text-black">{s.progressPercent}%</span>



                        </div>



                        <div className="w-full h-2 bg-slate-100 dark:bg-sky-50 rounded-full overflow-hidden border border-slate-200 dark:border-sky-200">



                          <div



                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"



                            style={{ width: `${s.progressPercent}%` }}



                          />



                        </div>



                        {s.doubtfulCount > 0 && (



                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">



                            {s.doubtfulCount} soal ditandai ragu-ragu



                          </div>



                        )}



                      </td>







                      <td className="py-3 px-4 text-center">



                        <div



                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${



                            s.violationCount > 0



                              ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30"



                              : "bg-slate-100 dark:bg-sky-50 text-slate-500"



                          }`}



                        >



                          <ShieldAlert className="w-3.5 h-3.5" />



                          <span>{s.violationCount}x</span>



                        </div>



                      </td>







                      <td className="py-3 px-4 text-right">



                        <div className="flex items-center justify-end gap-1.5">



                          {s.status === "SUSPENDED" && (



                            <button



                              onClick={() => handleAction("UNLOCK", s.id)}



                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition"



                              title="Buka Kunci Akun"



                            >



                              <Unlock className="w-3.5 h-3.5 inline mr-1" /> Buka Kunci



                            </button>



                          )}







                          {s.status === "IN_PROGRESS" && (



                            <>



                              <button



                                onClick={() => {



                                  setSelectedSessionForTime(s);



                                  setTimeToAdd(10);



                                }}



                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-sky-200 shadow-2xs transition"



                                title="Tambah Waktu"



                              >



                                +Waktu



                              </button>







                              <button



                                onClick={() => handleAction("FORCE_FINISH", s.id)}



                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold rounded-lg transition"



                                title="Hentikan Paksa"



                              >



                                Selesaikan



                              </button>



                            </>



                          )}







                          <button



                            onClick={() => handleAction("RESET_LOGIN", s.id)}



                            className="p-1.5 bg-white hover:bg-slate-100 dark:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-sky-200 shadow-2xs transition"



                            title="Reset Kunci Perangkat"



                          >



                            <Laptop className="w-3.5 h-3.5" />



                          </button>







                          <button



                            onClick={() => handleAction("RESET", s.id)}



                            className="p-1.5 bg-white hover:bg-rose-50 dark:bg-sky-50 dark:hover:bg-rose-500/20 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg border border-slate-200 dark:border-sky-200 shadow-2xs transition"



                            title="Reset & Ulang Sesi"



                          >



                            <RotateCcw className="w-3.5 h-3.5" />



                          </button>



                        </div>



                      </td>



                    </tr>



                  );



                })}



              </tbody>



            </table>



          </div>



        </div>



      )}







      {/* Extra Time Modal */}



      {selectedSessionForTime && (



        <div className="fixed inset-0 z-50 bg-sky-950/25 backdrop-blur-xs flex items-center justify-center p-4">



          <div className="glass max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">



            <h3 className="text-base font-bold text-slate-900 dark:text-black flex items-center gap-2">



              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />



              <span>Tambah Waktu Pengerjaan</span>



            </h3>







            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">



              Peserta: <strong className="text-slate-900 dark:text-black">{selectedSessionForTime.user.name}</strong> ({selectedSessionForTime.user.username})



            </p>







            <div className="space-y-2">



              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih Tambahan Menit:</label>



              <div className="grid grid-cols-3 gap-2">



                {[5, 10, 15, 20, 30, 45].map((m) => (



                  <button



                    key={m}



                    type="button"



                    onClick={() => setTimeToAdd(m)}



                    className={`py-2 text-xs font-bold rounded-xl border transition ${



                      timeToAdd === m



                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"



                        : "bg-slate-50 dark:bg-sky-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-sky-200 hover:border-slate-300"



                    }`}



                  >



                    +{m} Menit



                  </button>



                ))}



              </div>



            </div>







            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-sky-200">



              <button



                type="button"



                onClick={() => setSelectedSessionForTime(null)}



                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl transition"



              >



                Batal



              </button>



              <button



                type="button"



                disabled={actionLoading !== null}



                onClick={() => handleAction("ADD_TIME", selectedSessionForTime.id, timeToAdd)}



                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50"



              >



                Simpan & Tambahkan



              </button>



            </div>



          </div>



        </div>



      )}



      {/* Modal Broadcast Pengumuman */}



      {showBroadcastModal && (



        <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">



          <div className="glass p-6 max-w-lg w-full border border-sky-300 shadow-soft animate-in zoom-in-95 space-y-4">



            <div className="flex items-center justify-between pb-3 border-b border-sky-200">



              <div className="flex items-center gap-2">



                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">



                  📢



                </div>



                <div>



                  <h3 className="text-sm font-black text-black">Broadcast Pengumuman Ujian</h3>



                  <p className="text-[11px] text-black font-semibold">Pesan akan langsung muncul sebagai notifikasi di layar seluruh peserta ujian aktif.</p>



                </div>



              </div>



              <button



                onClick={() => setShowBroadcastModal(false)}



                className="w-8 h-8 rounded-lg hover:bg-sky-200 text-black flex items-center justify-center font-bold text-sm transition"



              >



                ✕



              </button>



            </div>







            <div className="space-y-2">



              <label className="text-xs font-black text-black">Teks Pengumuman / Ralat Soal:</label>



              <textarea



                rows={3}



                value={broadcastMessage}



                onChange={(e) => setBroadcastMessage(e.target.value)}



                placeholder="Contoh: Perhatian, waktu ujian tersisa 15 menit. Atau: Ralat soal nomor 20 pilihan C seharusnya..."



                className="w-full p-3 bg-white border border-sky-300 rounded-xl text-xs text-black font-medium focus:outline-none focus:border-blue-500"



              />



            </div>







            <div className="flex justify-end gap-2 pt-2 border-t border-sky-200">



              <button



                type="button"



                onClick={() => setShowBroadcastModal(false)}



                className="btn-default py-2 text-xs"



              >



                Batal



              </button>



              <button



                type="button"



                onClick={handleSendBroadcast}



                disabled={sendingBroadcast || !broadcastMessage.trim()}



                className="btn-primary py-2 px-5 flex items-center gap-1.5 text-xs cursor-pointer"



              >



                {sendingBroadcast ? (



                  <>



                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />



                    <span className="text-black font-black">Menyiarkan...</span>



                  </>



                ) : (



                  <>



                    <Send className="w-3.5 h-3.5 text-black" />



                    <span className="text-black font-black">Kirim Sekarang</span>



                  </>



                )}



              </button>



            </div>



          </div>



        </div>



      )}



    </div>



  );



}



