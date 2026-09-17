"use client";



import React, { useEffect, useState, useRef, use } from "react";

import { useRouter } from "next/navigation";

import { MathContent } from "@/components/MathContent";

import { ThemeToggle } from "@/components/ThemeToggle";

import { ExamLocalDB } from "@/lib/indexeddb";

import { formatTime } from "@/lib/utils";

import {

  Clock,

  CheckCircle2,

  AlertTriangle,

  ChevronLeft,

  ChevronRight,

  Maximize2,

  Minimize2,

  HelpCircle,

  ShieldAlert,

  Volume2,

  Bookmark,

  CheckSquare,

  Square,

  Layers,

  Send,

  Loader2,

  ZoomIn,

  ZoomOut,

  Sparkles,

  Lock,

  ArrowRight,

  ShieldCheck,

} from "lucide-react";



export default function ExamRoomPage({

  params,

}: {

  params: Promise<{ examId: string }>;

}) {

  const { examId } = use(params);

  const router = useRouter();



  // Core State

  const [loading, setLoading] = useState(true);

  const [exam, setExam] = useState<any>(null);

  const [session, setSession] = useState<any>(null);

  // Force-Finished by Admin State
  const [isForceFinishedByAdmin, setIsForceFinishedByAdmin] = useState(false);
  const [forceFinishedData, setForceFinishedData] = useState<{ examTitle?: string; subjectName?: string } | null>(null);

  const handleForceFinishedByAdmin = (info?: { examTitle?: string; subjectName?: string }) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    ExamLocalDB.clearExamData(examId).catch(() => {});
    setShowFinishModal(false);
    setShowViolationModal(false);
    setIsForceFinishedByAdmin(true);
    if (info) {
      setForceFinishedData(info);
    } else {
      setForceFinishedData({
        examTitle: exam?.title,
        subjectName: exam?.subject,
      });
    }
  };

  const [questions, setQuestions] = useState<any[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);



  // Drift-Free Timestamp Timer (Priority 2)

  const [remainingSeconds, setRemainingSeconds] = useState(3600);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetEndTimeRef = useRef<number>(0);



  // Autosave & Network State

  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "OFFLINE_SAVED" | "ERROR">("SAVED");

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [screenShieldActive, setScreenShieldActive] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);



  // Zoom / Font Scale

  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const [audioPlays, setAudioPlays] = useState<Record<string, number>>({});

  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);

  const [dismissedBroadcastId, setDismissedBroadcastId] = useState<string>("");



  // Anti-cheat / Violations

  const [violationCount, setViolationCount] = useState(0);

  const [showViolationModal, setShowViolationModal] = useState(false);

  const [violationMessage, setViolationMessage] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [freezeCountdown, setFreezeCountdown] = useState<number>(0);

  const [isSuspendedLocked, setIsSuspendedLocked] = useState<boolean>(false);

  const [unlockedSuccessNotification, setUnlockedSuccessNotification] = useState<boolean>(false);

  const lastViolationTimeRef = useRef<number>(0);
  const lastUserActivityRef = useRef<number>(Date.now());



  // 🔄 Real-time Proctor Unlock Polling

  // Saat siswa dibekukan / terkunci, cek status sesi ke server setiap 3 detik.

  // Begitu proktor klik "Buka Kunci", modal langsung hilang & siswa lanjut ujian!

  useEffect(() => {

    let pollInterval: NodeJS.Timeout | null = null;

    if (isSuspendedLocked && session?.id) {

      pollInterval = setInterval(async () => {

        try {

          const res = await fetch(`/api/student/exams/${examId}/start`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ token: "" }),

          });

          if (res.ok) {

            const data = await res.json();

            if (data.session && data.session.status === "IN_PROGRESS") {

              setSession(data.session);

              setViolationCount(data.session.violationCount || 0);

              setIsSuspendedLocked(false);

              setShowViolationModal(false);

              setUnlockedSuccessNotification(true);

              setTimeout(() => setUnlockedSuccessNotification(false), 6000);

            }

          }

        } catch (err) {

          // ignore transient poll error

        }

      }, 3000);

    }

    return () => {

      if (pollInterval) clearInterval(pollInterval);

    };

  }, [isSuspendedLocked, session?.id, examId]);




  // Track user interaction to distinguish idle/sleep from active tab switching
  useEffect(() => {
    const recordActivity = () => {
      lastUserActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity, { passive: true });
    window.addEventListener("touchstart", recordActivity, { passive: true });
    window.addEventListener("scroll", recordActivity, { passive: true });
    window.addEventListener("click", recordActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("touchstart", recordActivity);
      window.removeEventListener("scroll", recordActivity);
      window.removeEventListener("click", recordActivity);
    };
  }, []);

  // Real-time Session Status Polling (Heartbeat check for Force-Finish by Admin)
  useEffect(() => {
    if (isForceFinishedByAdmin || !examId) return;

    const statusInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/student/exams/${examId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.isForceFinished || data.status === "FORCE_FINISHED") {
            handleForceFinishedByAdmin({
              examTitle: data.examTitle || exam?.title,
              subjectName: data.subjectName || exam?.subject,
            });
          }
        }
      } catch {
        // ignore transient network glitch
      }
    }, 4000);

    return () => clearInterval(statusInterval);
  }, [examId, isForceFinishedByAdmin, exam?.title, exam?.subject]);

  // Progressive Freeze Countdown Timer

  useEffect(() => {

    let timer: NodeJS.Timeout | null = null;

    if (freezeCountdown > 0) {

      timer = setInterval(() => {

        setFreezeCountdown((prev) => Math.max(0, prev - 1));

      }, 1000);

    }

    return () => {

      if (timer) clearInterval(timer);

    };

  }, [freezeCountdown]);



  // Finish Modal

  const [showFinishModal, setShowFinishModal] = useState(false);

  const [isAgreedFinish, setIsAgreedFinish] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [finishError, setFinishError] = useState<string | null>(null);



  // Mobile Drawer

  const [showPalette, setShowPalette] = useState(false);



  useEffect(() => {

    initExam();



    const handleOnline = () => {

      setIsOnline(true);

      flushPendingQueue();

    };

    const handleOffline = () => {

      setIsOnline(false);

      setSaveStatus("OFFLINE_SAVED");

    };



    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);



    // Sync queue interval every 4 seconds

    syncIntervalRef.current = setInterval(() => {

      flushPendingQueue();

    }, 4000);



    return () => {

      if (timerRef.current) clearInterval(timerRef.current);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);

    };

  }, [examId]);



  // Flush pending IndexedDB queue items to server (Batch Disaster Recovery)

  const flushPendingQueue = async () => {

    if (typeof window === "undefined" || !navigator.onLine) return;

    try {

      // ⚡ Disaster Recovery: Attempt single atomic batch sync to prevent server HTTP flood

      const bulkResult = await ExamLocalDB.flushPendingAnswersBulk(examId);

      if (bulkResult.success && bulkResult.syncedCount > 0) {

        if (typeof bulkResult.serverRemainingSeconds === "number") {

          targetEndTimeRef.current = Date.now() + bulkResult.serverRemainingSeconds * 1000;

          setRemainingSeconds(bulkResult.serverRemainingSeconds);

        }

        setSaveStatus("SAVED");

        return;

      }



      // Fallback: Individual item sync if bulk returns 0 or unsupported

      const pending = await ExamLocalDB.getPendingAnswers(examId);

      if (!Array.isArray(pending) || pending.length === 0) return;



      for (const item of pending) {

        const payload = item.payload || item;

        const res = await fetch(`/api/student/exams/${examId}/save-answer`, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(payload),

        });



        if (res.ok) {

          const resData = await res.json().catch(() => null);

          if (resData && typeof resData.serverRemainingSeconds === "number") {

            targetEndTimeRef.current = Date.now() + resData.serverRemainingSeconds * 1000;

            setRemainingSeconds(resData.serverRemainingSeconds);

          }

          await ExamLocalDB.removePendingAnswer(item.id, examId, payload.questionId);

        }

      }

      setSaveStatus("SAVED");

    } catch {}

  };



  const updateQuestionAnswer = (partial: any) => {
    lastUserActivityRef.current = Date.now();
    const updatedQuestions = [...questions];
    const target = updatedQuestions[currentIndex];
    target.answer = { ...target.answer, ...partial };
    setQuestions(updatedQuestions);

    // 1. Immediately backup full exam state to local storage & IndexedDB
    try {
      localStorage.setItem(`cbt_backup_${examId}`, JSON.stringify(updatedQuestions));
    } catch {}
    ExamLocalDB.updateCachedQuestions(examId, updatedQuestions).catch(() => {});

    // 2. Trigger debounced autosave & queue
    triggerAutosave(target);
  };



  const triggerAutosave = (q: any) => {

    setSaveStatus("SAVING");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);



    const payload = {

      questionId: q.id,

      selectedOptionIds: q.answer.selectedOptionIds,

      textAnswer: q.answer.textAnswer,

      matchingAnswer: q.answer.matchingAnswer,

      isDoubtful: q.answer.isDoubtful,

    };



    // Save to IndexedDB pending queue

    ExamLocalDB.queueAnswer(examId, payload).catch(() => {});



    saveTimeoutRef.current = setTimeout(async () => {

      try {

        const res = await fetch(`/api/student/exams/${examId}/save-answer`, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(payload),

        });



        if (res.ok) {

          const data = await res.json();

          setSaveStatus("SAVED");

          // 🔒 Server Time Authority Synchronization (Priority 1 & 2)

          if (typeof data.serverRemainingSeconds === "number") {

            targetEndTimeRef.current = Date.now() + data.serverRemainingSeconds * 1000;

            setRemainingSeconds(data.serverRemainingSeconds);

          }

          await ExamLocalDB.removePendingAnswer(undefined, examId, q.id);

        } else {

          const errData = await res.json().catch(() => ({}));

          if (errData.status === "TIMEOUT" || errData.isTimeOut) {

            alert("Waktu ujian telah habis!");

            router.push(`/student/exam/${examId}/result`);

            return;

          }

          setSaveStatus("OFFLINE_SAVED");

        }

      } catch (err) {

        // Network drop / offline

        setSaveStatus("OFFLINE_SAVED");

      }

    }, 400);

  };



  const currentQ = questions[currentIndex];



  // Helper with debouncing to prevent flood of violations (Immunity for PKL/Bebas Pelanggaran)
  const reportViolationDebounced = (type: string, detail: string) => {
    if (exam?.disableAntiCheat || exam?.maxViolations === 0) {
      return;
    }
    const now = Date.now();
    if (now - lastViolationTimeRef.current > 2000) {
      lastViolationTimeRef.current = now;
      handleViolation(type, detail);
    }
  };



  // 🔒 HARDENED ANTI-CHEAT WITH SMART MOBILE IMMUNITY

  useEffect(() => {

    // Deteksi apakah perangkat adalah HP / Smartphone / Tablet

    const isMobileDevice = typeof window !== "undefined" && (

      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||

      window.innerWidth <= 800

    );



    // 🛡️ 1. Pencegahan Tombol Back & Swipe Gestur HP

    // Mendorong riwayat agar gestur back tidak mengeluarkan siswa atau memicu pelanggaran

    if (typeof window !== "undefined") {

      window.history.pushState(null, "", window.location.href);

      const handlePopState = () => {

        window.history.pushState(null, "", window.location.href);

      };

      window.addEventListener("popstate", handlePopState);

    }



    const handleVisibilityChange = () => {
      // Hanya rekam pelanggaran jika dokumen benar-benar disembunyikan
      if (document.hidden) {
        // Toleransi Layar Mati / Idle Screen Lock:
        // Jika siswa sudah tidak aktif > 45 detik, event hidden ini dipicu oleh screen sleep / timeout / screensaver / power-saving OS,
        // BUKAN kecurangan atau beralih tab!
        const timeSinceLastActivity = Date.now() - lastUserActivityRef.current;
        if (timeSinceLastActivity > 45000) {
          console.log(`[Idle Guard] Screen lock/sleep detected (${Math.round(timeSinceLastActivity / 1000)}s idle). Suppressing violation.`);
          return;
        }

        if (!loading && session?.status === "IN_PROGRESS") {
          reportViolationDebounced("TAB_SWITCH", "Terdeteksi beralih dari aplikasi / jendela ujian");
        }
      } else {
        // Saat tab / layar aktif kembali setelah tidur (Wakeup Reconnect):
        lastUserActivityRef.current = Date.now();
        console.log("[Wakeup] Student woke up or returned to tab. Syncing queue & verifying status...");
        flushPendingQueue();
        fetch(`/api/student/exams/${examId}/status`)
          .then((r) => (r.ok ? r.json() : null))
          .then((st) => {
            if (st?.session?.status === "FORCE_FINISHED") {
              handleForceFinishedByAdmin({
                examTitle: st.exam?.title,
                subjectName: st.exam?.subject?.name,
              });
            } else if (typeof st?.session?.remainingSeconds === "number") {
              targetEndTimeRef.current = Date.now() + st.session.remainingSeconds * 1000;
              setRemainingSeconds(st.session.remainingSeconds);
              setIsOnline(true);
            }
          })
          .catch(() => {});
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // 📱 Mobile Shield: Pada HP / Smartphone, event blur sering terpanggil saat:
      // 1. Siswa mengetik (keyboard virtual muncul / menutup)
      // 2. Siswa menekan opsi radio button / checkbox
      // 3. Siswa scroll atau membuka menu drawer palet nomor soal
      if (isMobileDevice) {
        return;
      }

      // 🛡️ PC Lab / Desktop Exambro Shield:
      // Di browser / WebView2 Exambro, event blur terpanggil setiap kali fokus elemen berpindah
      // (misal saat klik opsi jawaban, klik nomor palet, atau klik teks soal).
      // Selama document.hidden adalah FALSE, window sebenarnya MASIH TERBUKA dan AKTIF di layar!
      // Oleh karena itu, abaikan jika dokumen masih terlihat (!document.hidden).
      if (!document.hidden) {
        return;
      }

      // Untuk PC Lab (Desktop), pastikan elemen form atau klik tombol tidak terhitung pelanggaran
      const activeEl = typeof document !== "undefined" ? document.activeElement : null;
      if (activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "BUTTON" ||
        activeEl.tagName === "LABEL" ||
        activeEl.closest("button") ||
        activeEl.closest("input")
      )) {
        return;
      }

      const timeSinceLastActivity = Date.now() - lastUserActivityRef.current;
      if (timeSinceLastActivity > 45000) {
        console.log(`[Idle Guard] Blur event ignored: user inactive for ${Math.round(timeSinceLastActivity / 1000)}s (display sleep)`);
        return;
      }

      if (!loading && session?.status === "IN_PROGRESS" && !document.hidden) {
        // Toleransi: Hanya catat jika benar-benar kehilangan fokus window
        if (!exam?.disableAntiCheat && exam?.maxViolations !== 0) { setScreenShieldActive(true); }
        reportViolationDebounced("WINDOW_BLUR", "Fokus jendela ujian hilang (berpindah aplikasi)");
      }
    };

    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);

      // 📱 Pada smartphone (siswa PKL), keluar fullscreen TIDAK dihukum sebagai pelanggaran
      if (isMobileDevice) {
        return;
      }

      // Hanya berlakukan sanksi keluar fullscreen pada PC Lab
      if (!isFull && !loading && session?.status === "IN_PROGRESS" && !submitting) {
        const timeSinceLastActivity = Date.now() - lastUserActivityRef.current;
        if (timeSinceLastActivity > 45000) {
          console.log(`[Idle Guard] Fullscreen exit ignored: user inactive for ${Math.round(timeSinceLastActivity / 1000)}s (display sleep)`);
          return;
        }
        if (!exam?.disableAntiCheat && exam?.maxViolations !== 0) { setScreenShieldActive(true); }
        reportViolationDebounced("FULLSCREEN_EXIT", "Terdeteksi keluar dari mode layar penuh (Fullscreen) PC Lab");
      }
    };



    const handleBeforeUnload = (e: BeforeUnloadEvent) => {

      if (!loading && session?.status === "IN_PROGRESS" && !submitting) {

        e.preventDefault();

        e.returnValue = "Ujian sedang berlangsung! Apakah Anda yakin ingin meninggalkan sesi ini?";

        return e.returnValue;

      }

    };



    const handleContextMenu = (e: MouseEvent) => {

      e.preventDefault();

      e.stopPropagation();

      return false;

    };



    const handleCopy = (e: ClipboardEvent) => {

      e.preventDefault();

      e.stopPropagation();

      reportViolationDebounced("CLIPBOARD_COPY", "Menyalin konten (Copy) diblokir demi integritas ujian");

      return false;

    };



    const handleCut = (e: ClipboardEvent) => {

      e.preventDefault();

      e.stopPropagation();

      reportViolationDebounced("CLIPBOARD_CUT", "Memotong konten (Cut) diblokir demi integritas ujian");

      return false;

    };



    const handlePaste = (e: ClipboardEvent) => {

      // Block pasting across entire exam, even essay, to prevent ChatGPT/external answer injection

      e.preventDefault();

      e.stopPropagation();

      reportViolationDebounced("CLIPBOARD_PASTE", "Menempelkan teks (Paste) diblokir. Harap ketik jawaban Anda secara mandiri.");

      return false;

    };



    const handleDragStart = (e: DragEvent) => {

      e.preventDefault();

      e.stopPropagation();

      return false;

    };



    const handleDrop = (e: DragEvent) => {

      e.preventDefault();

      e.stopPropagation();

      return false;

    };



    const handleSelectStart = (e: Event) => {

      const target = e.target as HTMLElement;

      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {

        return true;

      }

      e.preventDefault();

      return false;

    };



    // 🔒 CAPTURE PHASE KEYDOWN LISTENER

    const handleKeyDown = (e: KeyboardEvent) => {

      const key = e.key.toLowerCase();



      // 1. Block F12 (Developer Tools)

      // Intercept PrintScreen & Screenshot shortcut
      if (e.key === "PrintScreen" || ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        if (!exam?.disableAntiCheat && exam?.maxViolations !== 0) { setScreenShieldActive(true); }
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          try { navigator.clipboard.writeText(""); } catch {}
        }
        reportViolationDebounced("KEYBOARD_LOCK", "Tangkapan layar (Screenshot / PrintScreen) diblokir!");
        return false;
      }

      if (e.key === "F12") {

        e.preventDefault();

        e.stopPropagation();

        reportViolationDebounced("KEYBOARD_LOCK", "Pintasan Developer Console (F12) diblokir!");

        return false;

      }



      // 2. Block F5 and Ctrl+R (Reload)

      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && key === "r")) {

        e.preventDefault();

        e.stopPropagation();

        reportViolationDebounced("KEYBOARD_LOCK", "Penyegaran halaman (Reload / F5) diblokir selama ujian berlangsung");

        return false;

      }



      // 3. Block DevTools Shortcuts: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K, Ctrl+Shift+S

      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {

        if (["i", "j", "c", "k", "s"].includes(key)) {

          e.preventDefault();

          e.stopPropagation();

          reportViolationDebounced("KEYBOARD_LOCK", `Pintasan Developer Tools 'Ctrl+Shift+${key.toUpperCase()}' diblokir!`);

          return false;

        }

      }



      // 4. Block Browser/OS Action Shortcuts: Ctrl+U (Source), Ctrl+S (Save), Ctrl+P (Print), Ctrl+C, Ctrl+V, Ctrl+X

      if (e.ctrlKey || e.metaKey) {

        if (["u", "s", "p", "c", "v", "x", "h", "j"].includes(key)) {

          e.preventDefault();

          e.stopPropagation();

          reportViolationDebounced("KEYBOARD_LOCK", `Pintasan '${e.ctrlKey ? "Ctrl" : "Cmd"}+${key.toUpperCase()}' diblokir`);

          return false;

        }

      }



      // 5. Block Alt+ArrowLeft / Alt+ArrowRight (Browser History Navigation)

      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {

        e.preventDefault();

        e.stopPropagation();

        return false;

      }



      // 6. CBT Keyboard Navigation Shortcuts (A-E, Arrows, Space, R)

      if (!loading && session?.status === "IN_PROGRESS") {

        const target = e.target as HTMLElement;

        const isInputField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);



        if (!isInputField && !e.ctrlKey && !e.metaKey && !e.altKey) {

          const keyUpper = e.key.toUpperCase();



          // Navigation: ArrowRight or N

          if (e.key === "ArrowRight" || keyUpper === "N") {

            e.preventDefault();

            setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));

            return;

          }



          // Navigation: ArrowLeft or P

          if (e.key === "ArrowLeft" || keyUpper === "P") {

            e.preventDefault();

            setCurrentIndex((prev) => Math.max(prev - 1, 0));

            return;

          }



          // Doubtful toggle: Space or R

          if (e.key === " " || keyUpper === "R") {

            e.preventDefault();

            handleToggleDoubtful();

            return;

          }



          // Option selection: A, B, C, D, E or 1, 2, 3, 4, 5

          if (currentQ && (currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "COMPLEX_MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE")) {

            let optIdx = -1;

            if (["A", "B", "C", "D", "E"].includes(keyUpper)) {

              optIdx = keyUpper.charCodeAt(0) - 65;

            } else if (["1", "2", "3", "4", "5"].includes(keyUpper)) {

              optIdx = parseInt(keyUpper) - 1;

            }



            if (optIdx >= 0 && currentQ.options && currentQ.options[optIdx]) {

              e.preventDefault();

              handleSelectOption(currentQ.options[optIdx].id);

            }

          }

        }

      }

    };



    // Attach listeners with capture: true to intercept events before browser/extensions

    document.addEventListener("visibilitychange", handleVisibilityChange, { capture: true });

    window.addEventListener("blur", handleBlur, { capture: true });

    document.addEventListener("fullscreenchange", handleFullscreenChange, { capture: true });

    document.addEventListener("webkitfullscreenchange", handleFullscreenChange, { capture: true });

    document.addEventListener("mozfullscreenchange", handleFullscreenChange, { capture: true });

    document.addEventListener("MSFullscreenChange", handleFullscreenChange, { capture: true });

    window.addEventListener("beforeunload", handleBeforeUnload);

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    document.addEventListener("copy", handleCopy, { capture: true });

    document.addEventListener("cut", handleCut, { capture: true });

    document.addEventListener("paste", handlePaste, { capture: true });

    document.addEventListener("dragstart", handleDragStart, { capture: true });

    document.addEventListener("drop", handleDrop, { capture: true });

    document.addEventListener("selectstart", handleSelectStart, { capture: true });



    return () => {

      document.removeEventListener("visibilitychange", handleVisibilityChange, { capture: true });

      window.removeEventListener("blur", handleBlur, { capture: true });

      document.removeEventListener("fullscreenchange", handleFullscreenChange, { capture: true });

      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange, { capture: true });

      document.removeEventListener("mozfullscreenchange", handleFullscreenChange, { capture: true });

      document.removeEventListener("MSFullscreenChange", handleFullscreenChange, { capture: true });

      window.removeEventListener("beforeunload", handleBeforeUnload);

      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });

      window.removeEventListener("keydown", handleKeyDown, { capture: true });

      document.removeEventListener("copy", handleCopy, { capture: true });

      document.removeEventListener("cut", handleCut, { capture: true });

      document.removeEventListener("paste", handlePaste, { capture: true });

      document.removeEventListener("dragstart", handleDragStart, { capture: true });

      document.removeEventListener("drop", handleDrop, { capture: true });

      document.removeEventListener("selectstart", handleSelectStart, { capture: true });

    };

  }, [loading, session, currentIndex, questions, currentQ, submitting]);



  const initExam = async () => {

    try {

      setLoading(true);

      let data: any = null;



      try {

        const res = await fetch(`/api/student/exams/${examId}/start`, {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ token: "" }), // empty token resumes existing session

        });



        if (res.ok) {

          data = await res.json();

          // Save full structure to IndexedDB for zero-failure offline recovery

          ExamLocalDB.saveExamCache(examId, data).catch(() => {});

        } else {

          const errData = await res.json();

          if (errData.status === "FORCE_FINISHED" || errData.isForceFinished) {
            handleForceFinishedByAdmin({
              examTitle: errData.examTitle,
              subjectName: errData.subjectName,
            });
            setLoading(false);
            return;
          }

          if (errData.status === "COMPLETED" || errData.status === "TIMEOUT") {

            router.push(`/student/exam/${examId}/result`);

            return;

          }

          throw new Error(errData.error || "Gagal memuat ujian");

        }

      } catch (networkErr: any) {
        // Fallback: Recover from IndexedDB cache if connection dropped!
        console.warn("Attempting offline recovery from IndexedDB...", networkErr);
        const cached = await ExamLocalDB.getExamCache(examId);
        if (cached) {
          data = cached;
          setIsOnline(false);
          setSaveStatus("OFFLINE_SAVED");
        } else {
          alert(networkErr.message || "Gagal memuat ujian dan tidak ada cache lokal.");
          router.push("/student/dashboard");
          return;
        }
      }

      // ⚡ SMART 3-WAY ANSWER MERGE (Server + IndexedDB Queue + LocalStorage)
      try {
        const localBackupRaw = localStorage.getItem(`cbt_backup_${examId}`);
        const pendingQueue = await ExamLocalDB.getPendingAnswers(examId);

        const localMap = new Map<string, any>();
        if (localBackupRaw) {
          const parsed = JSON.parse(localBackupRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((q: any) => {
              if (q.id && q.answer) localMap.set(q.id, q.answer);
            });
          }
        }
        if (Array.isArray(pendingQueue)) {
          pendingQueue.forEach((item: any) => {
            const p = item.payload || item;
            if (p?.questionId) {
              const existing = localMap.get(p.questionId) || {};
              localMap.set(p.questionId, { ...existing, ...p });
            }
          });
        }

        if (localMap.size > 0 && Array.isArray(data?.questions)) {
          let mergedCount = 0;
          data.questions = data.questions.map((q: any) => {
            const localAns = localMap.get(q.id);
            if (!localAns) return q;

            const s = q.answer || {};
            const sHasSelected = Array.isArray(s.selectedOptionIds) && s.selectedOptionIds.length > 0;
            const sHasText = typeof s.textAnswer === "string" && s.textAnswer.trim() !== "";
            const sHasMatching = s.matchingAnswer && Object.keys(s.matchingAnswer).length > 0;

            const lHasSelected = Array.isArray(localAns.selectedOptionIds) && localAns.selectedOptionIds.length > 0;
            const lHasText = typeof localAns.textAnswer === "string" && localAns.textAnswer.trim() !== "";
            const lHasMatching = localAns.matchingAnswer && Object.keys(localAns.matchingAnswer).length > 0;

            if (lHasSelected || lHasText || lHasMatching) {
              mergedCount++;
              return {
                ...q,
                answer: {
                  ...s,
                  ...(lHasSelected ? { selectedOptionIds: localAns.selectedOptionIds } : {}),
                  ...(lHasText ? { textAnswer: localAns.textAnswer } : {}),
                  ...(lHasMatching ? { matchingAnswer: localAns.matchingAnswer } : {}),
                  ...(typeof localAns.isDoubtful === "boolean" ? { isDoubtful: localAns.isDoubtful } : {}),
                },
              };
            }
            return q;
          });

          if (mergedCount > 0) {
            console.log(`[Smart 3-Way Merge] Successfully merged ${mergedCount} local answers into exam session.`);
            ExamLocalDB.updateCachedQuestions(examId, data.questions).catch(() => {});
            setTimeout(() => flushPendingQueue(), 1500);
          }
        }
      } catch (mergeErr) {
        console.warn("Smart 3-Way Answer Merge error:", mergeErr);
      }

      setExam(data.exam);
      setSession(data.session);
      setQuestions(data.questions || []);

      setRemainingSeconds(data.exam.remainingSeconds || 3600);

      setViolationCount(data.session.violationCount || 0);



      // Start Drift-Free Countdown Timer

      startTimer(data.exam.remainingSeconds || 3600);

    } catch (err: any) {

      console.error(err);

      alert("Terjadi kesalahan koneksi saat memuat ujian");

    } finally {

      setLoading(false);

    }

  };



  // 🔒 DRIFT-FREE COUNTDOWN TIMER (Priority 2)

  const startTimer = (initialSeconds: number) => {

    if (timerRef.current) clearInterval(timerRef.current);



    targetEndTimeRef.current = Date.now() + initialSeconds * 1000;

    setRemainingSeconds(initialSeconds);



    timerRef.current = setInterval(() => {

      const now = Date.now();

      const sec = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));

      setRemainingSeconds(sec);



      if (sec <= 0) {

        if (timerRef.current) clearInterval(timerRef.current);

        handleAutoSubmit();

      }

    }, 1000);

  };



  const handleViolation = async (type: string, detail: string) => {

    // 🛡️ Mode Bebas Pelanggaran PKL: jangan blokir / freeze siswa

    if (exam?.disableAntiCheat || exam?.maxViolations === 0) {

      return;

    }

    try {

      const res = await fetch(`/api/student/exams/${examId}/violation`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ violationType: type, details: detail }),

      });



      const data = await res.json();

      if (res.ok) {

        if (data.disabled) return;

        setViolationCount(data.violationCount);

        setViolationMessage(detail);

        setShowViolationModal(true);



        if (data.isSuspended) {

          setIsSuspendedLocked(true);

        } else if (data.violationCount === 1) {

          setFreezeCountdown(5);

        } else if (data.violationCount >= 2) {

          setFreezeCountdown(15);

        }

      }

    } catch (e) {

      console.error(e);

    }

  };



  const toggleFullscreen = () => {

    if (!document.fullscreenElement) {

      document.documentElement.requestFullscreen().catch(() => {});

      setIsFullscreen(true);

    } else {

      if (document.exitFullscreen) {

        document.exitFullscreen().catch(() => {});

        setIsFullscreen(false);

      }

    }

  };



  // Answer Handlers

  const handleSelectOption = (optionId: string) => {

    if (!currentQ) return;

    const isSingle = currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE";



    let updatedSelection: string[] = [];

    const currentSelected = currentQ.answer.selectedOptionIds || [];



    if (isSingle) {

      updatedSelection = [optionId];

    } else {

      // Complex multiple choice toggle

      if (currentSelected.includes(optionId)) {

        updatedSelection = currentSelected.filter((id: string) => id !== optionId);

      } else {

        updatedSelection = [...currentSelected, optionId];

      }

    }



    updateQuestionAnswer({ selectedOptionIds: updatedSelection });

  };



  const handleTextAnswerChange = (text: string) => {

    updateQuestionAnswer({ textAnswer: text });

  };



  const handleMatchingChange = (premiseId: string, responseId: string) => {

    const currentMatching = currentQ.answer.matchingAnswer || {};

    const updated = { ...currentMatching, [premiseId]: responseId };

    updateQuestionAnswer({ matchingAnswer: updated });

  };



  const handleToggleDoubtful = () => {

    if (!currentQ) return;

    updateQuestionAnswer({ isDoubtful: !currentQ.answer.isDoubtful });

  };



  const handleAutoSubmit = async () => {

    await submitExam();

  };



  const submitExam = async () => {

    setSubmitting(true);

    setFinishError(null);



    try {

      const res = await fetch(`/api/student/exams/${examId}/finish`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({}),

      });



      const data = await res.json();

      if (!res.ok) {

        throw new Error(data.error || "Gagal mengakhiri ujian");

      }



      await ExamLocalDB.clearExamData(examId);

      router.push(`/student/exam/${examId}/result`);

    } catch (err: any) {

      setFinishError(err.message);

      setSubmitting(false);

    }

  };



  // Helper Stats for Palette & Submissions
  const checkQuestionIsAnswered = (q: any): boolean => {
    if (!q || !q.answer) return false;
    if (Array.isArray(q.answer.selectedOptionIds) && q.answer.selectedOptionIds.length > 0) return true;
    if (typeof q.answer.textAnswer === "string" && q.answer.textAnswer.trim() !== "") return true;
    let m = q.answer.matchingAnswer;
    if (typeof m === "string") {
      try { m = JSON.parse(m); } catch { return false; }
    }
    if (m && typeof m === "object" && !Array.isArray(m)) {
      return Object.values(m).some((val) => typeof val === "string" && val.trim() !== "");
    }
    return false;
  };

  const answeredCount = questions.filter(checkQuestionIsAnswered).length;



  const doubtfulCount = questions.filter((q) => q.answer.isDoubtful).length;

  const unansweredCount = questions.length - answeredCount;



  if (loading) {

    return (

      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center text-black">

        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />

        <h2 className="text-lg font-bold">Menyiapkan Lembar Ujian...</h2>

        <p className="text-xs text-slate-500 mt-1">Mengunduh butir soal & sinkronisasi sesi</p>

      </div>

    );

  }



  const isTimerCritical = remainingSeconds < 300; // < 5 mins



  return (

    <div className="exam-workspace min-h-screen bg-slate-50 text-slate-900 flex flex-col select-none transition-colors duration-150">

      
      {/* 🛡️ Fullscreen Anti-Screenshot & Focus-Loss Protection Shield */}
      {screenShieldActive && !loading && session?.status === "IN_PROGRESS" && !exam?.disableAntiCheat && exam?.maxViolations !== 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center select-none animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 mb-4 shadow-lg">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Layar Disembunyikan Demi Keamanan Ujian
          </h2>
          <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
            Sistem mendeteksi jendela ujian kehilangan fokus atau upaya tangkapan layar (screenshot).
            Klik tombol di bawah untuk kembali ke lembar ujian Anda.
          </p>
          <button
            onClick={() => setScreenShieldActive(false)}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
          >
            Lanjutkan Pengerjaan Soal
          </button>
        </div>
      )}

      {/* 🟢 Notifikasi Kunci Berhasil Dibuka oleh Proktor */}

      {unlockedSuccessNotification && (

        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 border border-emerald-400">

          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">

            ✓

          </div>

          <div>

            <div className="font-bold text-sm">Kunci Ujian Berhasil Dibuka!</div>

            <div className="text-xs text-emerald-100">Proktor telah menyetujui. Anda dapat melanjutkan pengerjaan soal kembali.</div>

          </div>

        </div>

      )}



      {/* Exam Header */}

      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 py-3 shadow-xs">

        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-3">

            <button

              onClick={() => setShowPalette(!showPalette)}

              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-sky-50 text-slate-700 dark:text-slate-300 hover:bg-slate-200"

            >

              <Layers className="w-5 h-5" />

            </button>



            <div>

              <div className="flex items-center gap-2">

                <h1 className="font-black text-sm sm:text-base text-black tracking-tight line-clamp-1">

                  {exam?.title}

                </h1>

                <span className="hidden md:inline px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-md">

                  CBT HEBAT - SMK Pasundan 2 Bandung

                </span>

                {exam?.requireKioskBrowser && (

                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-md">

                    <Lock className="w-3 h-3" /> Mode Kiosk Aktif

                  </span>

                )}

                {exam?.category === "PKL" && (

                  <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-950 border border-purple-300 rounded-md">

                    Khusus PKL

                  </span>

                )}

                {exam?.disableAntiCheat && (

                  <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 rounded-md">

                    🛡️ Bebas Pelanggaran Aktif

                  </span>

                )}

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">

                <span className="font-bold text-black underline">{exam?.subject}</span>

                <span>•</span>

                <span>Soal {currentIndex + 1} dari {questions.length}</span>

              </div>

            </div>

          </div>



          <div className="flex items-center gap-2.5">

            {/* Font Size Selector */}

            <div className="hidden md:flex items-center bg-slate-100 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 rounded-xl p-1 text-xs">

              <button

                onClick={() => setFontSize("sm")}

                className={`px-2 py-1 rounded-lg transition ${fontSize === "sm" ? "bg-blue-600 text-white font-bold" : "text-slate-500 dark:text-slate-400"}`}

                title="Font Kecil"

              >

                A-

              </button>

              <button

                onClick={() => setFontSize("base")}

                className={`px-2 py-1 rounded-lg transition ${fontSize === "base" ? "bg-blue-600 text-white font-bold" : "text-slate-500 dark:text-slate-400"}`}

                title="Font Normal"

              >

                A

              </button>

              <button

                onClick={() => setFontSize("lg")}

                className={`px-2 py-1 rounded-lg transition ${fontSize === "lg" ? "bg-blue-600 text-white font-bold" : "text-slate-500 dark:text-slate-400"}`}

                title="Font Besar"

              >

                A+

              </button>

            </div>



            {/* Autosave Status */}

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-sky-50 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-sky-200/50">

              {saveStatus === "SAVING" ? (

                <>

                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />

                  <span className="text-amber-600 dark:text-amber-400">Menyimpan...</span>

                </>

              ) : saveStatus === "SAVED" ? (

                <>

                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />

                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Tersimpan</span>

                </>

              ) : saveStatus === "OFFLINE_SAVED" ? (

                <>

                  <Bookmark className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />

                  <span className="text-yellow-700 dark:text-yellow-400 font-medium">Tersimpan Offline</span>

                </>

              ) : (

                <>

                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />

                  <span className="text-rose-600 dark:text-rose-400">Gagal Simpan</span>

                </>

              )}

            </div>



            {/* Countdown Timer */}

            <div

              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition ${

                isTimerCritical

                  ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 animate-pulse"

                  : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"

              }`}

            >

              <Clock className="w-4 h-4" />

              <span>{formatTime(remainingSeconds)}</span>

            </div>



            {/* Theme Switcher in Exam Header */}

            <ThemeToggle />



            {/* Fullscreen Button */}

            <button

              onClick={toggleFullscreen}

              className={`p-2 rounded-xl border transition ${

                isFullscreen

                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300"

                  : "bg-slate-100 dark:bg-sky-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-sky-200 hover:bg-slate-200"

              }`}

              title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}

            >

              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}

            </button>

          </div>

        </div>

      </header>



      {/* 🛡️ Dynamic Anti-Cheating Watermark (Invisible to Cheaters, Clear on Phone Photos) */}

      <div

        className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none opacity-[0.06] dark:opacity-[0.08] flex flex-wrap gap-x-20 gap-y-16 p-6 items-center justify-around"

        aria-hidden="true"

      >

        {Array.from({ length: 32 }).map((_, i) => (

          <div

            key={i}

            className="transform -rotate-25 text-xs sm:text-sm font-black tracking-wider text-slate-800 dark:text-slate-200 whitespace-nowrap"

          >

            {session?.studentName || "PESERTA CBT"} • {session?.studentNis || session?.studentUsername || "SMK PASUNDAN 2"} • CBT HEBAT

          </div>

        ))}

      </div>



      {/* Offline Alert Banner */}

      {!isOnline && (

        <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center gap-2 shadow-lg backdrop-blur sticky top-16 z-30 animate-pulse">

          <AlertTriangle className="w-4 h-4 shrink-0" />

          <span>Jaringan Terputus / Offline: Seluruh jawaban Anda tetap tersimpan otomatis dan aman di memori laptop/HP. Lanjutkan ujian seperti biasa!</span>

        </div>

      )}



      {/* Main Workspace */}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6">

        {/* Left Side: Question Sheet */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-between p-6 sm:p-8">

          <div>

            {/* Question Header Bar */}

            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-sky-200">

              <div className="flex items-center gap-2">

                <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-xs">

                  {currentIndex + 1}

                </span>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-sky-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-sky-200">

                  {currentQ?.type === "MULTIPLE_CHOICE"

                    ? "Pilihan Ganda"

                    : currentQ?.type === "COMPLEX_MULTIPLE_CHOICE"

                    ? "Pilihan Ganda Kompleks"

                    : currentQ?.type === "TRUE_FALSE"

                    ? "Benar / Salah"

                    : currentQ?.type === "MATCHING"

                    ? "Menjodohkan"

                    : "Esai / Isian"}

                </span>

              </div>



              {/* Doubtful Toggle */}

              <button

                onClick={handleToggleDoubtful}

                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${

                  currentQ?.answer.isDoubtful

                    ? "bg-amber-400 text-slate-950 border-amber-500 font-bold shadow-sm"

                    : "bg-slate-100 dark:bg-sky-50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-sky-200 hover:text-slate-900 dark:hover:text-slate-200"

                }`}

              >

                <Bookmark className="w-3.5 h-3.5" />

                <span>Ragu-ragu</span>

              </button>

            </div>



            {/* Question Content */}

            <div

              className={`text-slate-950 dark:text-slate-950 font-medium leading-relaxed ${

                fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-base"

              }`}

            >

              <MathContent content={currentQ?.content || ""} />



              {/* Optional Media (Audio Listening with 2x Play Limit & Anti-Download) */}

              {currentQ?.audioUrl && (

                <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-300 space-y-2">

                  <div className="flex items-center justify-between text-xs font-black text-black">

                    <div className="flex items-center gap-2">

                      <Volume2 className="w-4 h-4 text-blue-700" />

                      <span>Audio Listening (Maksimal 2x Putar)</span>

                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${

                      (audioPlays[currentQ.id] || 0) >= 2

                        ? "bg-rose-100 text-rose-950 border-rose-300"

                        : "bg-emerald-100 text-emerald-950 border-emerald-300"

                    }`}>

                      Diputar: {audioPlays[currentQ.id] || 0} / 2 Kali

                    </span>

                  </div>



                  {(audioPlays[currentQ.id] || 0) >= 2 ? (

                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-950 font-bold text-center">

                      🔒 Batas pemutaran audio untuk nomor ini telah tercapai (Maksimal 2 kali).

                    </div>

                  ) : (

                    <audio

                      controls

                      controlsList="nodownload noplaybackrate"

                      onPlay={() => {

                        setAudioPlays((prev) => ({

                          ...prev,

                          [currentQ.id]: (prev[currentQ.id] || 0) + 1,

                        }));

                      }}

                      className="w-full h-9"

                    >

                      <source src={currentQ.audioUrl} />

                      Browser tidak mendukung audio player.

                    </audio>

                  )}

                </div>

              )}



              {currentQ?.imageUrl && (

                <div className="mt-4">

                  <img

                    src={currentQ.imageUrl}

                    alt="Lampiran Soal"

                    className="max-h-80 rounded-xl border border-slate-200 dark:border-sky-200 object-contain mx-auto shadow-2xs"

                  />

                </div>

              )}

            </div>



            {/* Answer Options Section */}

            <div className="mt-8">

              {/* Type 1: MULTIPLE_CHOICE & TRUE_FALSE */}

              {(currentQ?.type === "MULTIPLE_CHOICE" || currentQ?.type === "TRUE_FALSE") && (

                <div className="space-y-3">

                  {currentQ?.options.map((option: any, optIdx: number) => {

                    const isSelected = currentQ.answer.selectedOptionIds?.includes(option.id);

                    const letter = String.fromCharCode(65 + optIdx); // A, B, C, D, E



                    return (

                      <button

                        key={option.id}

                        onClick={() => handleSelectOption(option.id)}

                        className={`w-full text-left p-4 rounded-xl border flex items-start gap-3.5 transition ${

                          isSelected

                            ? "bg-blue-100/90 dark:bg-blue-100/90 border-2 border-blue-600 dark:border-blue-600 text-blue-950 dark:text-blue-950 shadow-xs ring-2 ring-blue-500/50 font-bold"

                            : "bg-white dark:bg-white border border-slate-200 dark:border-sky-200 text-slate-900 dark:text-slate-950 hover:bg-sky-50 dark:hover:bg-sky-50 font-medium"

                        }`}

                      >

                        <span

                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition ${

                            isSelected

                              ? "bg-blue-600 text-white shadow-xs"

                              : "bg-slate-100 dark:bg-sky-100 text-slate-800 dark:text-slate-950 border border-slate-200 dark:border-sky-300"

                          }`}

                        >

                          {letter}

                        </span>

                        <div className="flex-1 pt-0.5 text-sm sm:text-base">

                          <MathContent content={option.content} />

                        </div>

                      </button>

                    );

                  })}

                </div>

              )}



              {/* Type 2: COMPLEX_MULTIPLE_CHOICE */}

              {currentQ?.type === "COMPLEX_MULTIPLE_CHOICE" && (

                <div className="space-y-3">

                  <p className="text-xs text-slate-700 dark:text-slate-700 font-medium mb-2">

                    * Pilih satu atau lebih opsi jawaban yang menurut Anda benar.

                  </p>

                  {currentQ?.options.map((option: any, optIdx: number) => {

                    const isSelected = currentQ.answer.selectedOptionIds?.includes(option.id);



                    return (

                      <button

                        key={option.id}

                        onClick={() => handleSelectOption(option.id)}

                        className={`w-full text-left p-4 rounded-xl border flex items-start gap-3.5 transition ${

                          isSelected

                            ? "bg-indigo-100/90 dark:bg-indigo-100/90 border-2 border-indigo-600 dark:border-indigo-600 text-indigo-950 dark:text-indigo-950 shadow-xs ring-2 ring-indigo-500/50 font-bold"

                            : "bg-white dark:bg-white border border-slate-200 dark:border-sky-200 text-slate-900 dark:text-slate-950 hover:bg-indigo-50/50 dark:hover:bg-indigo-50/50 font-medium"

                        }`}

                      >

                        <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-600">

                          {isSelected ? (

                            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-600" />

                          ) : (

                            <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />

                          )}

                        </div>

                        <div className="flex-1 text-sm sm:text-base font-medium">

                          <MathContent content={option.content} />

                        </div>

                      </button>

                    );

                  })}

                </div>

              )}



              {/* Type 3: MATCHING (Menjodohkan) */}

              {currentQ?.type === "MATCHING" && (() => {

                const premises =

                  currentQ.matchingData?.premises ||

                  currentQ.matchingPairs?.map((p: any) => ({ id: p.id, text: p.premise })) ||

                  [];

                const responses =

                  currentQ.matchingData?.responses ||

                  currentQ.matchingPairs?.map((p: any) => ({ id: p.id, text: p.response })) ||

                  [];



                if (premises.length === 0) {

                  return (

                    <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">

                      Pilihan pasangan belum tersedia untuk butir soal ini.

                    </div>

                  );

                }



                const answeredCount = Object.keys(currentQ.answer?.matchingAnswer || {}).filter(

                  (k) => currentQ.answer?.matchingAnswer?.[k]

                ).length;



                return (

                  <div className="space-y-4">

                    <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">

                      <span>💡 <strong>Petunjuk:</strong> Pasangkan setiap item pernyataan di kolom kiri dengan pasangan yang tepat di kolom kanan.</span>

                      <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-300 dark:border-indigo-400/30">

                        {answeredCount} / {premises.length} Terpasang

                      </span>

                    </div>



                    <div className="space-y-3">

                      {premises.map((premise: any, idx: number) => {

                        const selectedRespId = currentQ.answer?.matchingAnswer?.[premise.id] || "";

                        const isMatched = Boolean(selectedRespId);



                        return (

                          <div

                            key={premise.id || idx}

                            className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${

                              isMatched

                                ? "bg-indigo-50/80 dark:bg-indigo-50/80 border-indigo-300 dark:border-indigo-400 shadow-xs"

                                : "bg-white dark:bg-white border-slate-200 dark:border-sky-200 hover:border-slate-300 dark:hover:border-sky-300"

                            }`}

                          >

                            <div className="flex-1 text-sm text-slate-950 dark:text-slate-950 flex items-start gap-3">

                              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-100 text-blue-700 dark:text-blue-800 border border-blue-200 dark:border-blue-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">

                                {idx + 1}

                              </span>

                              <div className="pt-0.5 leading-relaxed font-bold">

                                <MathContent content={premise.text} />

                              </div>

                            </div>



                            <div className="md:w-80 shrink-0 flex items-center gap-2">

                              <select

                                value={selectedRespId}

                                onChange={(e) => handleMatchingChange(premise.id, e.target.value)}

                                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none transition cursor-pointer border ${

                                  isMatched

                                    ? "bg-indigo-600 text-white font-semibold shadow-inner border-indigo-600"

                                    : "bg-white dark:bg-white border-slate-300 dark:border-sky-300 text-slate-950 dark:text-slate-950 hover:border-slate-400 font-medium"

                                }`}

                              >

                                <option value="">-- Pilih Pasangan Jawaban --</option>

                                {responses.map((resp: any, rIdx: number) => (

                                  <option key={resp.id || rIdx} value={resp.id}>

                                    {resp.text}

                                  </option>

                                ))}

                              </select>



                              {isMatched && (

                                <button

                                  type="button"

                                  onClick={() => handleMatchingChange(premise.id, "")}

                                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-100 rounded-lg transition"

                                  title="Reset Pasangan Ini"

                                >

                                  ✕

                                </button>

                              )}

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  </div>

                );

              })()}



              {/* Type 4: ESSAY */}

              {currentQ?.type === "ESSAY" && (

                <div className="space-y-2">

                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-950">

                    Tuliskan Jawaban / Uraian Anda di bawah:

                  </label>

                  <textarea

                    rows={6}

                    value={currentQ?.answer.textAnswer || ""}

                    onChange={(e) => handleTextAnswerChange(e.target.value)}

                    placeholder="Ketik jawaban lengkap di sini..."

                    className="w-full p-4 bg-white dark:bg-white border-2 border-slate-200 dark:border-sky-200 rounded-xl text-slate-950 dark:text-slate-950 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed resize-y font-medium placeholder:text-slate-400"

                  />

                  <div className="text-right text-[11px] text-slate-500 font-semibold">

                    {(currentQ?.answer.textAnswer || "").length} Karakter

                  </div>

                </div>

              )}

            </div>

          </div>



          {/* Bottom Navigation Buttons */}

          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-sky-200 flex flex-wrap items-center justify-between gap-3">

            <button

              disabled={currentIndex === 0}

              onClick={() => setCurrentIndex(currentIndex - 1)}

              className="btn-default px-4 py-2.5"

            >

              <ChevronLeft className="w-4 h-4" />

              <span>Sebelumnya <span className="hidden sm:inline text-slate-400 font-normal text-[10px]">(←/P)</span></span>

            </button>



            {/* Keyboard Shortcuts Visual Hint (Desktop) */}

            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-sky-50/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-sky-200 shadow-2xs">

              <span className="text-slate-400 dark:text-slate-500 font-medium">💡 Keyboard:</span>

              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-sky-50 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-sky-200 shadow-2xs">A-E</kbd> Opsi</span>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-sky-50 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-sky-200 shadow-2xs">← / →</kbd> Navigasi</span>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-sky-50 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-sky-200 shadow-2xs">R / Spasi</kbd> Ragu</span>

            </div>



            {currentIndex === questions.length - 1 ? (

              <button

                onClick={() => setShowFinishModal(true)}

                className="btn-primary px-6 py-2.5"

              >

                <span>Selesaikan Ujian</span>

                <Send className="w-4 h-4" />

              </button>

            ) : (

              <button

                onClick={() => setCurrentIndex(currentIndex + 1)}

                className="btn-primary px-5 py-2.5"

              >

                <span>Berikutnya <span className="hidden sm:inline text-blue-100 font-normal text-[10px]">(→/N)</span></span>

                <ChevronRight className="w-4 h-4" />

              </button>

            )}

          </div>

        </div>



        {/* Right Side: Question Navigation Palette (Desktop) */}

        <aside

          className={`glass lg:w-80 p-5 flex flex-col justify-between ${

            showPalette ? "fixed inset-x-4 bottom-4 top-20 z-50 overflow-y-auto lg:static" : "hidden lg:flex"

          }`}

        >

          <div>

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-sky-200">

              <div className="font-bold text-sm text-slate-900 dark:text-black flex items-center gap-2">

                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />

                <span>Nomor Soal ({questions.length})</span>

              </div>

              <button

                onClick={() => setShowPalette(false)}

                className="lg:hidden text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"

              >

                Tutup

              </button>

            </div>



            {/* Quick Status Legend */}

            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400 mb-4 p-2 bg-slate-50 dark:bg-sky-50 rounded-xl border border-slate-200 dark:border-sky-200/80">

              <div className="flex items-center gap-1.5">

                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />

                <span>Dijawab ({answeredCount})</span>

              </div>

              <div className="flex items-center gap-1.5">

                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />

                <span>Ragu ({doubtfulCount})</span>

              </div>

              <div className="flex items-center gap-1.5">

                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-sky-50 border border-slate-300 dark:border-sky-200" />

                <span>Kosong ({unansweredCount})</span>

              </div>

            </div>



            {/* Palette Grid */}

            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">

              {questions.map((q, idx) => {

                const isAnswered = checkQuestionIsAnswered(q);

                const isDoubtful = q.answer.isDoubtful;

                const isCurrent = idx === currentIndex;



                return (

                  <button

                    key={q.id}

                    onClick={() => {

                      setCurrentIndex(idx);

                      setShowPalette(false);

                    }}

                    className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center relative transition ${

                      isCurrent

                        ? "ring-2 ring-sky-500 scale-105 gradient-brand text-black font-black shadow-md"

                        : ""

                    } ${

                      isDoubtful

                        ? "bg-amber-100 text-amber-900 border-2 border-amber-400 font-black shadow-xs"

                        : isAnswered

                        ? "bg-sky-200 text-black border-2 border-sky-400 font-black shadow-xs"

                        : "bg-white text-black border border-sky-200 hover:bg-sky-50 font-bold"

                    }`}

                  >

                    <span>{idx + 1}</span>

                    {q.answer.selectedOptionIds && q.answer.selectedOptionIds.length > 0 && (

                      <span className="text-[9px] opacity-90 font-bold">

                        {q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE"

                          ? (() => {

                              const foundIdx = q.options?.findIndex(

                                (opt: any) => opt.id === q.answer.selectedOptionIds[0]

                              );

                              return foundIdx >= 0 ? String.fromCharCode(65 + foundIdx) : "✓";

                            })()

                          : "✓"}

                      </span>

                    )}

                  </button>

                );

              })}

            </div>

          </div>



          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-sky-200">

            <button

              onClick={() => setShowFinishModal(true)}

              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"

            >

              <Send className="w-4 h-4" />

              <span>Selesaikan Ujian</span>

            </button>

          </div>

        </aside>

      </div>



      {/* Anti-Cheat Violation Modal with Progressive Screen Freeze */}

      {showViolationModal && (

        <div className="fixed inset-0 bg-sky-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4">

          <div className="bg-white dark:bg-sky-50 border border-rose-300 dark:border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">

            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">

              <ShieldAlert className="w-8 h-8 animate-bounce" />

            </div>



            <h3 className="text-lg font-bold text-slate-900 dark:text-black text-center">

              {isSuspendedLocked ? "Sesi Ujian Dibekukan!" : "Peringatan Pelanggaran!"}

            </h3>

            <p className="text-xs text-rose-600 dark:text-rose-400 text-center mt-1 font-semibold">{violationMessage}</p>



            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-sky-100/50 border border-slate-200 dark:border-sky-200 text-xs text-slate-700 dark:text-slate-800 text-center">

              <div className="text-slate-500 dark:text-slate-600 mb-1">Total Pelanggaran Anda:</div>

              <div className="text-3xl font-black text-rose-600 dark:text-rose-500">

                {violationCount} / {exam?.maxViolations || 3}

              </div>

              <p className="text-[11px] text-slate-500 mt-2">

                {isSuspendedLocked

                  ? "Batas toleransi pelanggaran telah terlampaui. Ujian Anda telah dibekukan."

                  : freezeCountdown > 0

                  ? `Layar dibekukan sementara selama ${freezeCountdown} detik demi integritas ujian.`

                  : "Tetap berada di jendela ujian dan jangan berpindah aplikasi atau tab."}

              </p>

            </div>



            {isSuspendedLocked ? (

              <div className="space-y-3">

                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 rounded-2xl text-xs font-medium text-left border border-rose-200 dark:border-rose-800/40 space-y-2">

                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-sm">

                    <span>⚠️</span> Sesi Anda Ditangguhkan Sementara

                  </div>

                  <p className="text-[11.5px] leading-relaxed">

                    Sistem mendeteksi aktivitas keluar layar / berpindah aplikasi sebanyak <strong>{violationCount} kali</strong> (melebihi batas toleransi).

                  </p>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-black/20 p-2 rounded-xl border border-rose-100 dark:border-rose-900/30">

                    💡 <strong>Jangan panik:</strong> Seluruh jawaban yang telah Anda pilih tersimpan aman di server. Segera lapor ke <strong>Proktor Lab / Koordinator PKL</strong> untuk verifikasi dan pembukaan kunci.

                  </p>

                </div>



                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/30 flex items-center justify-center gap-2 text-xs text-sky-700 dark:text-sky-300 font-semibold animate-pulse">

                  <Loader2 className="w-4 h-4 animate-spin" />

                  <span>Menunggu persetujuan Proktor... (Otomatis lanjut setelah dibuka)</span>

                </div>



                <button

                  onClick={() => router.push("/student/dashboard")}

                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"

                >

                  Lihat Status di Dashboard Siswa

                </button>

              </div>

            ) : (

              <div className="space-y-2">

                <button

                  disabled={freezeCountdown > 0}

                  onClick={() => {

                    setShowViolationModal(false);

                    if (!document.fullscreenElement) {

                      toggleFullscreen();

                    }

                  }}

                  className={`w-full py-2.5 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 ${

                    freezeCountdown > 0

                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"

                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"

                  }`}

                >

                  {freezeCountdown > 0 ? (

                    <>

                      <Clock className="w-4 h-4 animate-spin" />

                      <span>Tunggu ({freezeCountdown} detik)...</span>

                    </>

                  ) : (

                    <span>Saya Mengerti & Kembali ke Ujian</span>

                  )}

                </button>

              </div>

            )}

          </div>

        </div>

      )}



      {/* Finish Confirmation Modal with Mandatory Agreement Checkbox */}

      {showFinishModal && (

        <div className="fixed inset-0 bg-sky-950/25 backdrop-blur-xs z-50 flex items-center justify-center p-4">

          <div className="glass p-6 max-w-lg w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">

            {(() => {

              const examDuration = exam?.durationMinutes || 60;

              const isLockedEarly = examDuration > 10 && remainingSeconds > 600;



              return isLockedEarly ? (

                <>

                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3">

                    <Lock className="w-7 h-7" />

                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-black text-center">Pengumpulan Ujian Belum Dibuka</h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">

                    Berikut ringkasan pengerjaan lembar jawaban Anda saat ini:

                  </p>

                </>

              ) : (

                <>

                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">

                    <CheckCircle2 className="w-7 h-7" />

                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-black text-center">Konfirmasi Pengakhiran Ujian</h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">

                    Periksa ringkasan lembar jawaban Anda dengan cermat sebelum menyelesaikan sesi:

                  </p>

                </>

              );

            })()}



            {/* Answer Statistics Grid */}

            <div className="my-4 grid grid-cols-3 gap-2.5 text-center">

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-sky-50 border border-blue-200 dark:border-blue-500/30">

                <div className="text-xl font-black text-blue-600 dark:text-blue-400">{answeredCount}</div>

                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Sudah Dijawab</div>

              </div>

              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-sky-50 border ${doubtfulCount > 0 ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10" : "border-slate-200 dark:border-sky-200"}`}>

                <div className="text-xl font-black text-amber-600 dark:text-amber-400">{doubtfulCount}</div>

                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Ragu-ragu</div>

              </div>

              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-sky-50 border ${unansweredCount > 0 ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10" : "border-slate-200 dark:border-sky-200"}`}>

                <div className={`text-xl font-black ${unansweredCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>{unansweredCount}</div>

                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Belum Dijawab</div>

              </div>

            </div>



            {/* Warnings if empty or doubtful */}

            {unansweredCount > 0 && (

              <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">

                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />

                <div className="leading-relaxed">

                  <strong>Peringatan:</strong> Masih terdapat <strong>{unansweredCount} butir soal</strong> yang belum Anda jawab. Soal yang dikosongkan tidak akan mendapatkan poin.

                </div>

              </div>

            )}



            {doubtfulCount > 0 && (

              <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">

                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />

                <div className="leading-relaxed">

                  <strong>Perhatian:</strong> Masih ada <strong>{doubtfulCount} butir soal</strong> bertanda ragu-ragu. Pastikan Anda telah yakin dengan jawaban akhir.

                </div>

              </div>

            )}



            {/* 10-MINUTE EARLY SUBMISSION LOCK & COUNTDOWN */}

            {(() => {

              const examDuration = exam?.durationMinutes || 60;

              const isLockedEarly = examDuration > 10 && remainingSeconds > 600;

              const secondsUntilUnlock = Math.max(0, remainingSeconds - 600);

              const unlockMins = Math.floor(secondsUntilUnlock / 60);

              const unlockSecs = secondsUntilUnlock % 60;



              if (isLockedEarly) {

                return (

                  <div className="space-y-4">

                    {/* Elegant Lock Box */}

                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 shadow-sm text-xs space-y-3">

                      <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300 font-extrabold text-sm">

                        <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />

                        <span>PENGUMPULAN UJIAN BELUM DIBUKA</span>

                      </div>

                      <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">

                        Sesuai tata tertib asesmen, lembar jawaban baru dapat diselesaikan dan dikumpulkan saat sisa waktu pengerjaan <strong>10 menit terakhir</strong>.

                      </p>



                      {/* Live Countdown Badge */}

                      <div className="p-3.5 rounded-xl bg-white dark:bg-sky-50 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">

                        <div className="text-slate-600 dark:text-slate-400 font-semibold text-xs flex items-center gap-1.5">

                          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />

                          <span>Tombol Selesai Aktif Dalam:</span>

                        </div>

                        <div className="font-mono font-extrabold text-base text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40 px-3 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/60 self-start sm:self-auto">

                          {unlockMins} Menit {unlockSecs < 10 ? `0${unlockSecs}` : unlockSecs} Detik

                        </div>

                      </div>



                      <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 text-amber-950 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">

                        <span className="text-sm shrink-0">💡</span>

                        <span>Silakan manfaatkan sisa waktu ini untuk memeriksa kembali butir soal yang belum dijawab atau bertanda ragu-ragu.</span>

                      </div>

                    </div>



                    {finishError && (

                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">

                        <AlertTriangle className="w-4 h-4 shrink-0" />

                        <span>{finishError}</span>

                      </div>

                    )}



                    {/* Action Button: Back to Exam */}

                    <div className="pt-2">

                      <button

                        type="button"

                        onClick={() => {

                          setShowFinishModal(false);

                          setIsAgreedFinish(false);

                        }}

                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition text-center shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"

                      >

                        <span>Kembali Periksa Lembar Jawaban</span>

                      </button>

                    </div>

                  </div>

                );

              }



              // Normal Flow (Remaining Time <= 10 Minutes)

              return (

                <div>

                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-center gap-2">

                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

                    <span>Waktu pengerjaan telah memasuki 10 menit terakhir. Anda diperkenankan menyelesaikan ujian.</span>

                  </div>



                  {/* Mandatory Agreement Checkbox */}

                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-sky-50 border border-slate-200 dark:border-sky-200 hover:border-slate-300 dark:hover:border-sky-200 cursor-pointer select-none transition mb-5">

                    <input

                      type="checkbox"

                      checked={isAgreedFinish}

                      onChange={(e) => setIsAgreedFinish(e.target.checked)}

                      className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-sky-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer"

                    />

                    <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">

                      Saya telah memeriksa seluruh jawaban dengan teliti dan yakin untuk mengakhiri sesi ujian ini.

                    </span>

                  </label>



                  {finishError && (

                    <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">

                      <AlertTriangle className="w-4 h-4 shrink-0" />

                      <span>{finishError}</span>

                    </div>

                  )}



                  {/* Action Buttons */}

                  <div className="flex flex-col sm:flex-row gap-2.5">

                    <button

                      type="button"

                      onClick={() => {

                        setShowFinishModal(false);

                        setIsAgreedFinish(false);

                      }}

                      className="flex-1 py-3 bg-slate-100 dark:bg-sky-50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition text-center"

                    >

                      Batal / Periksa Kembali

                    </button>

                    <button

                      type="button"

                      disabled={!isAgreedFinish || submitting}

                      onClick={() => submitExam()}

                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"

                    >

                      {submitting ? (

                        <>

                          <Loader2 className="w-4 h-4 animate-spin" />

                          <span>Menyimpan & Menilai...</span>

                        </>

                      ) : (

                        <>

                          <span>Selesaikan Ujian Sekarang</span>

                          <Send className="w-4 h-4" />

                        </>

                      )}

                    </button>

                  </div>

                </div>

              );

            })()}

          </div>

        </div>

      )}

      {/* Force Finished by Admin Modal */}
      {isForceFinishedByAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-400 dark:border-emerald-600/80 overflow-hidden text-slate-900 dark:text-white p-6 sm:p-8 space-y-6">
            {/* Header Icon & Title */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-9 h-9 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sesi Selesai (Dihentikan Pengawas)
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Ujian Telah Diselesaikan oleh Pengawas
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                Pengawas / Admin telah mengakhiri sesi ujian Anda. Seluruh jawaban yang telah Anda isi telah <strong className="text-emerald-600 dark:text-emerald-400">tersimpan dengan aman</strong> dan nilai Anda telah tercatat di sistem.
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Mata Pelajaran</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{forceFinishedData?.subjectName || exam?.subject || "Mata Pelajaran"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/80 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Judul Ujian</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right max-w-[220px] truncate">{forceFinishedData?.examTitle || exam?.title || "Ujian"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Keterangan</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Paksa Selesai (Pengawas / Admin)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>Anda tidak perlu menunggu sisa waktu habis. Silakan klik tombol di bawah untuk langsung melanjutkan ke mata pelajaran berikutnya.</span>
            </div>

            {/* Action Button */}
            <div>
              <button
                type="button"
                onClick={() => router.push("/student/dashboard")}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition transform active:scale-98 cursor-pointer"
              >
                <span>Lanjutkan ke Mata Pelajaran Berikutnya</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

}

