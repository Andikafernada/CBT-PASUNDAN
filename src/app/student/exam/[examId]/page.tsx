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
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave & Network State
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "OFFLINE_SAVED" | "ERROR">("SAVED");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Zoom / Font Scale
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  // Anti-cheat / Violations
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Flush pending IndexedDB queue items to server
  const flushPendingQueue = async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    try {
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
          await ExamLocalDB.removePendingAnswer(item.id, examId, payload.questionId);
        }
      }
      setSaveStatus("SAVED");
    } catch {}
  };

  const updateQuestionAnswer = (partial: any) => {
    const updatedQuestions = [...questions];
    const target = updatedQuestions[currentIndex];
    target.answer = { ...target.answer, ...partial };
    setQuestions(updatedQuestions);

    // 1. Immediately backup full exam state to local storage & IndexedDB
    try {
      localStorage.setItem(`cbt_backup_${examId}`, JSON.stringify(updatedQuestions));
    } catch {}

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
      remainingSeconds,
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
          setSaveStatus("SAVED");
          await ExamLocalDB.removePendingAnswer(undefined, examId, q.id);
        } else {
          setSaveStatus("OFFLINE_SAVED");
        }
      } catch (err) {
        // Network drop / offline
        setSaveStatus("OFFLINE_SAVED");
      }
    }, 400);
  };

  const currentQ = questions[currentIndex];

  // Anti-Cheat: Visibility Change, Keylock & Blur Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !loading && session?.status === "IN_PROGRESS") {
        handleViolation("TAB_SWITCH", "Terdeteksi beralih dari tab atau jendela ujian");
      }
    };

    const handleBlur = () => {
      if (!loading && session?.status === "IN_PROGRESS") {
        handleViolation("TAB_SWITCH", "Fokus jendela ujian hilang (berpindah aplikasi)");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 DevTools
      if (e.key === "F12") {
        e.preventDefault();
        handleViolation("KEYBOARD_LOCK", "Percobaan membuka developer console (F12)");
        return false;
      }

      // Block Ctrl+C, Ctrl+V, Ctrl+U (source), Ctrl+S, Ctrl+P, Ctrl+Shift+I
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "c" || key === "v" || key === "u" || key === "s" || key === "p" || (e.shiftKey && key === "i")) {
          e.preventDefault();
          handleViolation("KEYBOARD_LOCK", `Pintasan keyboard '${e.ctrlKey ? "Ctrl" : "Cmd"}+${key.toUpperCase()}' diblokir`);
          return false;
        }
      }

      // CBT Keyboard Navigation Shortcuts (A-E, Arrows, Space, R)
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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, session, currentIndex, questions, currentQ]);

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
          if (errData.status === "COMPLETED") {
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

      setExam(data.exam);
      setSession(data.session);
      setQuestions(data.questions || []);
      setRemainingSeconds(data.exam.remainingSeconds || 3600);
      setViolationCount(data.session.violationCount || 0);

      // Start Countdown Timer
      startTimer(data.exam.remainingSeconds || 3600);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan koneksi saat memuat ujian");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let sec = initialSeconds;
    timerRef.current = setInterval(() => {
      sec -= 1;
      setRemainingSeconds(sec);

      if (sec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 1000);
  };

  const handleViolation = async (type: string, detail: string) => {
    try {
      const res = await fetch(`/api/student/exams/${examId}/violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ violationType: type, details: detail }),
      });

      const data = await res.json();
      if (res.ok) {
        setViolationCount(data.violationCount);
        setViolationMessage(detail);
        setShowViolationModal(true);

        if (data.isSuspended) {
          alert("Ujian Anda telah dibekukan karena melebihi batas toleransi pelanggaran!");
          router.push("/student/dashboard");
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

  // Helper Stats for Palette
  const answeredCount = questions.filter(
    (q) =>
      (q.answer.selectedOptionIds && q.answer.selectedOptionIds.length > 0) ||
      (q.answer.textAnswer && q.answer.textAnswer.trim() !== "") ||
      (q.answer.matchingAnswer && Object.keys(q.answer.matchingAnswer).length > 0)
  ).length;

  const doubtfulCount = questions.filter((q) => q.answer.isDoubtful).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Menyiapkan Lembar Ujian...</h2>
        <p className="text-xs text-slate-400 mt-1">Mengunduh butir soal & sinkronisasi sesi</p>
      </div>
    );
  }

  const isTimerCritical = remainingSeconds < 300; // < 5 mins

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col select-none transition-colors duration-150">
      {/* Exam Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              <Layers className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight line-clamp-1">
                  {exam?.title}
                </h1>
                <span className="hidden md:inline px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-md">
                  SMK Pasundan 2 Bandung
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{exam?.subject}</span>
                <span>•</span>
                <span>Soal {currentIndex + 1} dari {questions.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Font Size Selector */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
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
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
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
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

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
        <div className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xs dark:shadow-xl">
          <div>
            {/* Question Header Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-xs">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Ragu-ragu</span>
              </button>
            </div>

            {/* Question Content */}
            <div
              className={`text-slate-800 dark:text-slate-100 leading-relaxed font-normal ${
                fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-base"
              }`}
            >
              <MathContent content={currentQ?.content || ""} />

              {/* Optional Media (Audio / Video / Image) */}
              {currentQ?.audioUrl && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <audio controls className="w-full h-8">
                    <source src={currentQ.audioUrl} />
                    Browser tidak mendukung audio player.
                  </audio>
                </div>
              )}

              {currentQ?.imageUrl && (
                <div className="mt-4">
                  <img
                    src={currentQ.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-80 rounded-xl border border-slate-200 dark:border-slate-800 object-contain mx-auto shadow-2xs"
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
                            ? "bg-blue-50 dark:bg-blue-600/20 border-blue-600 dark:border-blue-500 text-slate-900 dark:text-white shadow-xs ring-1 ring-blue-600 dark:ring-blue-500 font-semibold"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
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
                            ? "bg-indigo-50 dark:bg-indigo-600/20 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white shadow-xs ring-1 ring-indigo-600 dark:ring-indigo-500 font-semibold"
                            : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 text-sm sm:text-base">
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
                                ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-500/40 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex-1 text-sm text-slate-900 dark:text-slate-100 flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="pt-0.5 leading-relaxed font-medium">
                                <MathContent content={premise.text} />
                              </div>
                            </div>

                            <div className="md:w-80 shrink-0 flex items-center gap-2">
                              <select
                                value={selectedRespId}
                                onChange={(e) => handleMatchingChange(premise.id, e.target.value)}
                                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none transition cursor-pointer border ${
                                  isMatched
                                    ? "bg-indigo-600 dark:bg-indigo-900/60 border-indigo-600 dark:border-indigo-400 text-white font-semibold shadow-inner"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 hover:border-slate-300"
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
                                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400">
                    Tuliskan Jawaban / Uraian Anda di bawah:
                  </label>
                  <textarea
                    rows={6}
                    value={currentQ?.answer.textAnswer || ""}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                    placeholder="Ketik jawaban lengkap di sini..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition leading-relaxed resize-y"
                  />
                  <div className="text-right text-[11px] text-slate-400">
                    {(currentQ?.answer.textAnswer || "").length} Karakter
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya <span className="hidden sm:inline text-slate-400 font-normal text-[10px]">(←/P)</span></span>
            </button>

            {/* Keyboard Shortcuts Visual Hint (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-slate-400 dark:text-slate-500 font-medium">💡 Keyboard:</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-slate-700 shadow-2xs">A-E</kbd> Opsi</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-slate-700 shadow-2xs">← / →</kbd> Navigasi</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded text-slate-700 dark:text-slate-200 font-mono text-[10px] border border-slate-200 dark:border-slate-700 shadow-2xs">R / Spasi</kbd> Ragu</span>
            </div>

            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowFinishModal(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
              >
                <span>Selesaikan Ujian</span>
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition"
              >
                <span>Berikutnya <span className="hidden sm:inline text-blue-100 font-normal text-[10px]">(→/N)</span></span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Question Navigation Palette (Desktop) */}
        <aside
          className={`lg:w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs dark:shadow-xl flex flex-col justify-between ${
            showPalette ? "fixed inset-x-4 bottom-4 top-20 z-50 overflow-y-auto lg:static" : "hidden lg:flex"
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
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
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400 mb-4 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Ragu ({doubtfulCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                <span>Kosong ({unansweredCount})</span>
              </div>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered =
                  (q.answer.selectedOptionIds && q.answer.selectedOptionIds.length > 0) ||
                  (q.answer.textAnswer && q.answer.textAnswer.trim() !== "") ||
                  (q.answer.matchingAnswer && Object.keys(q.answer.matchingAnswer).length > 0);
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
                        ? "ring-2 ring-blue-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105 z-10 shadow-sm"
                        : ""
                    } ${
                      isDoubtful
                        ? "bg-amber-400 text-slate-950 font-extrabold shadow-2xs"
                        : isAnswered
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {q.answer.selectedOptionIds && q.answer.selectedOptionIds.length > 0 && (
                      <span className="text-[9px] opacity-75 font-normal">
                        {currentQ?.type === "MULTIPLE_CHOICE"
                          ? String.fromCharCode(
                              65 +
                                q.options.findIndex(
                                  (opt: any) => opt.id === q.answer.selectedOptionIds[0]
                                )
                            )
                          : "✓"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
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

      {/* Anti-Cheat Violation Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Peringatan Pelanggaran!</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 text-center mt-1">{violationMessage}</p>

            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 text-center">
              <div className="text-slate-500 dark:text-slate-400 mb-1">Total Pelanggaran Anda:</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {violationCount} / {exam?.maxViolations || 3}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Jika mencapai batas toleransi, ujian Anda akan otomatis dibekukan oleh sistem pengawas.
              </p>
            </div>

            <button
              onClick={() => setShowViolationModal(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition"
            >
              Saya Mengerti & Kembali ke Ujian
            </button>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal with Mandatory Agreement Checkbox */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {(() => {
              const examDuration = exam?.durationMinutes || 60;
              const isLockedEarly = examDuration > 10 && remainingSeconds > 600;

              return isLockedEarly ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Pengumpulan Ujian Belum Dibuka</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                    Berikut ringkasan pengerjaan lembar jawaban Anda saat ini:
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Konfirmasi Pengakhiran Ujian</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                    Periksa ringkasan lembar jawaban Anda dengan cermat sebelum menyelesaikan sesi:
                  </p>
                </>
              );
            })()}

            {/* Answer Statistics Grid */}
            <div className="my-4 grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-blue-500/30">
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">{answeredCount}</div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Sudah Dijawab</div>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border ${doubtfulCount > 0 ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400">{doubtfulCount}</div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">Ragu-ragu</div>
              </div>
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border ${unansweredCount > 0 ? "border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/10" : "border-slate-200 dark:border-slate-800"}`}>
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
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
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
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer select-none transition mb-5">
                    <input
                      type="checkbox"
                      checked={isAgreedFinish}
                      onChange={(e) => setIsAgreedFinish(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition text-center"
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
    </div>
  );
}
