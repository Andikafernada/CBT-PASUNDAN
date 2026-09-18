import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.examSession.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: user.id,
        },
      },
      select: {
        id: true,
        status: true,
        finishReason: true,
        score: true,
        startedAt: true,
        remainingSeconds: true,
        violationCount: true,
        finishedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            endTime: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ status: "NOT_STARTED", isFinished: false, isForceFinished: false });
    }

    const isForceFinished =
      session.status === "FORCE_FINISHED" ||
      session.finishReason === "FORCE_BY_ADMIN" ||
      session.finishReason === "PROCTOR_FORCE";

    const isFinished = ["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session.status);

    // 🔒 Dynamic Authoritative Remaining Seconds Calculation
    let serverRemainingSeconds = session.remainingSeconds;
    if (session.status === "IN_PROGRESS" && session.startedAt) {
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000);
      const durationRemaining = Math.max(0, (session.exam.durationMinutes || 60) * 60 - elapsedSeconds);

      let scheduleRemaining = Infinity;
      if (session.exam.endTime) {
        scheduleRemaining = Math.max(0, Math.floor((new Date(session.exam.endTime).getTime() - now.getTime()) / 1000));
      }

      serverRemainingSeconds = Math.min(durationRemaining, scheduleRemaining);

      // Background sync DB if drift is noticeable (> 5s)
      if (Math.abs(session.remainingSeconds - serverRemainingSeconds) > 5) {
        prisma.examSession.update({
          where: { id: session.id },
          data: { remainingSeconds: serverRemainingSeconds },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      finishReason: session.finishReason,
      isForceFinished,
      isFinished,
      isSuspended: session.status === "SUSPENDED",
      remainingSeconds: serverRemainingSeconds,
      serverRemainingSeconds: serverRemainingSeconds,
      score: session.score,
      finishedAt: session.finishedAt,
      examTitle: session.exam?.title || "Ujian",
      subjectName: session.exam?.subject?.name || "Mata Pelajaran",
    });
  } catch (error: any) {
    console.error("Student Exam Status Check Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
