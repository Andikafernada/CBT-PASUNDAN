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
    const body = await req.json();
    const { questionId, selectedOptionIds, textAnswer, matchingAnswer, isDoubtful } = body;

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
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

    // 🔒 FOREIGN QUESTION INJECTION GUARD: Validate questionId belongs to this exam
    const isRegisteredQuestion = session.exam.examQuestions.some(
      (eq) => eq.questionId === questionId
    );
    if (!isRegisteredQuestion) {
      // Fallback check if examQuestions is empty and dynamically assigned from subject
      const isSubjectQuestion = await prisma.question.findFirst({
        where: { id: questionId, subject: { exams: { some: { id: examId } } } },
        select: { id: true },
      });
      if (!isSubjectQuestion) {
        return NextResponse.json(
          { error: "Butir soal tidak terdaftar dalam paket ujian ini" },
          { status: 400 }
        );
      }
    }

    // 🔒 Kiosk Browser Validation on Autosave (with Selective Bypass)
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
      // Auto-finish expired session
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

    // ⚡ HIGH CONCURRENCY: Upsert answer single row with P2002 collision recovery
    let answer;
    const answerData = {
      selectedOptionIds: selectedOptionIds ? JSON.stringify(selectedOptionIds) : null,
      textAnswer: textAnswer || null,
      matchingAnswer: matchingAnswer ? JSON.stringify(matchingAnswer) : null,
      isDoubtful: Boolean(isDoubtful),
    };

    try {
      answer = await prisma.examAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId,
          },
        },
        create: {
          sessionId: session.id,
          questionId,
          ...answerData,
        },
        update: {
          ...answerData,
          updatedAt: new Date(),
        },
      });
    } catch (upsertErr: any) {
      if (upsertErr.code === "P2002") {
        // Race condition: concurrent insert just occurred, fallback to update
        answer = await prisma.examAnswer.update({
          where: {
            sessionId_questionId: {
              sessionId: session.id,
              questionId,
            },
          },
          data: {
            ...answerData,
            updatedAt: new Date(),
          },
        });
      } else {
        throw upsertErr;
      }
    }

    // ⚡ Update authoritative remainingSeconds in background (non-blocking)
    prisma.examSession.update({
      where: { id: session.id },
      data: { remainingSeconds: serverRemainingSeconds },
    }).catch((err) => console.warn("Failed to sync remainingSeconds in background:", err));

    return NextResponse.json({
      success: true,
      answerId: answer.id,
      savedAt: new Date().toISOString(),
      isDoubtful: answer.isDoubtful,
      serverRemainingSeconds, // Authoritative dual-cap server time
    });
  } catch (error: any) {
    console.error("Save Answer Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
