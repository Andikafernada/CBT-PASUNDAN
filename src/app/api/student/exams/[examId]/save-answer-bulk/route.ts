import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateAndFinishSession } from "@/lib/exam-score";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json().catch(() => ({}));
    const { answers } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ success: true, savedCount: 0, message: "No answers to sync" });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.examSession.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: user.id,
        },
      },
      include: {
        exam: {
          select: {
            id: true,
            durationMinutes: true,
            endTime: true,
            requireKioskBrowser: true,
            kioskUserAgentPattern: true,
            examQuestions: {
              select: { questionId: true },
            },
          },
        },
      },
    });

    if (!session || session.status !== "IN_PROGRESS") {
      const isForceFinished =
        session?.status === "FORCE_FINISHED" ||
        session?.finishReason === "FORCE_BY_ADMIN" ||
        session?.finishReason === "PROCTOR_FORCE";
      return NextResponse.json(
        {
          error: isForceFinished
            ? "Ujian ini telah diselesaikan oleh pengawas/admin"
            : "Sesi ujian tidak aktif atau telah selesai",
          status: session?.status,
          finishReason: session?.finishReason,
          isForceFinished,
          isFinished: ["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session?.status || ""),
        },
        { status: 403 }
      );
    }

    // 🔒 Kiosk Browser Validation (with Selective Bypass)
    const isBypassed = Boolean((user as any).bypassExambro || user.group?.isPkl || (user.group as any)?.bypassExambro);
    if (session.exam.requireKioskBrowser && !isBypassed) {
      const userAgent = req.headers.get("user-agent") || "";
      const sebHeader = req.headers.get("x-safeexambrowser-requesthash");
      const pattern = new RegExp(session.exam.kioskUserAgentPattern || "Exambro|SafeExamBrowser", "i");
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

    // 🔒 DUAL-CAP ABSOLUTE TIMER: Check session duration AND global exam.endTime
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000);
    const durationRemaining = Math.max(0, (session.exam.durationMinutes || 60) * 60 - elapsedSeconds);

    let scheduleRemaining = Infinity;
    if (session.exam.endTime) {
      scheduleRemaining = Math.max(0, Math.floor((new Date(session.exam.endTime).getTime() - now.getTime()) / 1000));
    }

    const serverRemainingSeconds = Math.min(durationRemaining, scheduleRemaining);

    if (serverRemainingSeconds <= 0) {
      await calculateAndFinishSession(session.id, "TIMEOUT");
      return NextResponse.json(
        {
          error: "Waktu pengerjaan ujian telah berakhir",
          isTimeOut: true,
          status: "TIMEOUT",
          serverRemainingSeconds: 0,
        },
        { status: 403 }
      );
    }

    // 🔒 FOREIGN QUESTION INJECTION GUARD: Validate all questionIds belong to this exam
    const registeredSet = new Set(session.exam.examQuestions.map((eq) => eq.questionId));
    const validAnswers = answers.filter((ans: any) => ans?.questionId && registeredSet.has(ans.questionId));

    if (validAnswers.length === 0 && answers.length > 0) {
      // Check subject questions fallback if examQuestions was empty
      const candidateIds = answers.map((a: any) => a.questionId).filter(Boolean);
      const subjectQuestions = await prisma.question.findMany({
        where: { id: { in: candidateIds }, subject: { exams: { some: { id: examId } } } },
        select: { id: true },
      });
      const validSubjectSet = new Set(subjectQuestions.map((q) => q.id));
      for (const ans of answers) {
        if (ans?.questionId && validSubjectSet.has(ans.questionId)) {
          validAnswers.push(ans);
        }
      }
    }

    if (validAnswers.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada butir soal yang valid untuk paket ujian ini" },
        { status: 400 }
      );
    }

    // ⚡ BATCH TRANSACTION: Upsert all answers atomically in one roundtrip
    const operations = validAnswers.map((ans: any) => {
      const selectedOptionIds = ans.selectedOptionIds ? JSON.stringify(ans.selectedOptionIds) : null;
      const textAnswer = ans.textAnswer || null;
      const matchingAnswer = ans.matchingAnswer ? JSON.stringify(ans.matchingAnswer) : null;
      const isDoubtful = Boolean(ans.isDoubtful);

      return prisma.examAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId: ans.questionId,
          },
        },
        create: {
          sessionId: session.id,
          questionId: ans.questionId,
          selectedOptionIds,
          textAnswer,
          matchingAnswer,
          isDoubtful,
        },
        update: {
          selectedOptionIds,
          textAnswer,
          matchingAnswer,
          isDoubtful,
          updatedAt: new Date(),
        },
      });
    });

    try {
      await prisma.$transaction(operations);
    } catch (batchErr: any) {
      console.warn("Bulk transaction collision, falling back to individual resilient upserts:", batchErr?.message);
      for (const ans of validAnswers) {
        const selectedOptionIds = ans.selectedOptionIds ? JSON.stringify(ans.selectedOptionIds) : null;
        const textAnswer = ans.textAnswer || null;
        const matchingAnswer = ans.matchingAnswer ? JSON.stringify(ans.matchingAnswer) : null;
        const isDoubtful = Boolean(ans.isDoubtful);
        const ansData = { selectedOptionIds, textAnswer, matchingAnswer, isDoubtful };

        try {
          await prisma.examAnswer.upsert({
            where: {
              sessionId_questionId: { sessionId: session.id, questionId: ans.questionId },
            },
            create: { sessionId: session.id, questionId: ans.questionId, ...ansData },
            update: { ...ansData, updatedAt: new Date() },
          });
        } catch {
          await prisma.examAnswer.update({
            where: {
              sessionId_questionId: { sessionId: session.id, questionId: ans.questionId },
            },
            data: { ...ansData, updatedAt: new Date() },
          }).catch(() => {});
        }
      }
    }

    // Sync authoritative remainingSeconds in background
    prisma.examSession.update({
      where: { id: session.id },
      data: { remainingSeconds: serverRemainingSeconds },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      savedCount: validAnswers.length,
      serverRemainingSeconds,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Bulk Save Answer Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
