import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateAndFinishSession } from "@/lib/exam-score";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { examQuestions: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
    }

    // 🔒 Kiosk Exam Browser Validation on Finish (Priority 3)
    const isBypassed = Boolean((user as any).bypassExambro || user.group?.isPkl || (user.group as any)?.bypassExambro);
    if (exam.requireKioskBrowser && !isBypassed) {
      const userAgent = req.headers.get("user-agent") || "";
      const sebHeader = req.headers.get("x-safeexambrowser-requesthash");
      const pattern = new RegExp(exam.kioskUserAgentPattern || "Exambro|SafeExamBrowser", "i");
      if (!pattern.test(userAgent) && !sebHeader) {
        return NextResponse.json(
          {
            error: "Akses ditolak: Aplikasi wajib dijalankan di Exambro / Safe Exam Browser!",
            isKioskRequired: true,
          },
          { status: 403 }
        );
      }
    }

    const session = await prisma.examSession.findUnique({
      where: { examId_userId: { examId, userId: user.id } },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi ujian tidak ditemukan" }, { status: 404 });
    }

    if (["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session.status)) {
      return NextResponse.json({ error: "Ujian sudah selesai dikerjakan" }, { status: 400 });
    }

    // 🔒 ATOMIC CONCURRENCY LOCK (Anti-Race Condition):
    // Atomically transition status from IN_PROGRESS -> SUBMITTING
    // Eliminates race conditions and duplicate AI grading calls if student double-submits
    const lockResult = await prisma.examSession.updateMany({
      where: {
        id: session.id,
        status: "IN_PROGRESS",
      },
      data: {
        status: "SUBMITTING",
      },
    });

    if (lockResult.count === 0) {
      return NextResponse.json(
        { error: "Sesi ujian Anda sedang diproses atau telah selesai dikerjakan" },
        { status: 409 }
      );
    }

    // 🔒 DUAL-CAP AUTHORITATIVE REMAINING TIME:
    // Takes the smaller of session duration and global exam.endTime
    const now = new Date();
    const examDurationMinutes = exam.durationMinutes || 60;
    const elapsedSeconds = Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000);
    const durationRemaining = Math.max(0, examDurationMinutes * 60 - elapsedSeconds);

    let scheduleRemaining = Infinity;
    if (exam.endTime) {
      scheduleRemaining = Math.max(0, Math.floor((new Date(exam.endTime).getTime() - now.getTime()) / 1000));
    }

    const currentRemainingSeconds = Math.min(durationRemaining, scheduleRemaining);

    // 🎯 SMART EARLY SUBMISSION:
    // Izinkan siswa mengumpulkan jika:
    // 1. Seluruh butir soal telah dijawab tuntas (isAllAnswered), ATAU
    // 2. Batas waktu minimal (minTimeMinutes) telah tercapai, ATAU
    // 3. Sisa waktu pengerjaan <= 10 menit (600s)
    const totalQCount = exam.examQuestions.length > 0
      ? exam.examQuestions.length
      : await prisma.question.count({ where: { subjectId: exam.subjectId, isActive: true } });

    const answeredCount = await prisma.examAnswer.count({
      where: {
        sessionId: session.id,
        OR: [
          { selectedOptionIds: { not: null } },
          { textAnswer: { not: null } },
          { matchingAnswer: { not: null } }
        ]
      }
    });

    const isAllAnswered = totalQCount > 0 && answeredCount >= totalQCount;
    const minTimeSeconds = (exam.minTimeMinutes || 0) * 60;
    const passedMinTime = minTimeSeconds > 0 ? elapsedSeconds >= minTimeSeconds : true;

    // HANYA kunci jika BELUM semua dijawab DAN masih di atas 10 menit DAN belum lewat minTime
    if (!isAllAnswered && examDurationMinutes > 10 && currentRemainingSeconds > 600 && !passedMinTime) {
      // Revert status back to IN_PROGRESS so student can continue
      await prisma.examSession.update({
        where: { id: session.id },
        data: { status: "IN_PROGRESS" },
      });

      const secondsUntilUnlock = currentRemainingSeconds - 600;
      const minutesUntilUnlock = Math.ceil(secondsUntilUnlock / 60);

      return NextResponse.json(
        {
          error: `Pengumpulan ujian terkunci. Anda baru menjawab ${answeredCount}/${totalQCount} butir soal. Tombol selesaikan ujian akan aktif saat seluruh soal terjawab atau pada sisa waktu 10 menit terakhir (sekitar ${minutesUntilUnlock} menit lagi).`,
          isLockedEarly: true,
          remainingSeconds: currentRemainingSeconds,
          secondsUntilUnlock,
          minutesUntilUnlock,
        },
        { status: 400 }
      );
    }

    const finishReason = currentRemainingSeconds <= 0 ? "TIMEOUT" : "SELF";
    const result: any = await calculateAndFinishSession(session.id, finishReason);

    return NextResponse.json({
      success: true,
      message: "Ujian berhasil diselesaikan",
      result: {
        score: result.score,
        totalQuestions: exam.examQuestions.length > 0 ? exam.examQuestions.length : (result.totalQuestions || 0),
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        essayCount: result.essayCount,
        showResult: exam.showResult,
        finishedAt: result.finishedAt,
      },
    });
  } catch (error: any) {
    console.error("Finish Exam Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
