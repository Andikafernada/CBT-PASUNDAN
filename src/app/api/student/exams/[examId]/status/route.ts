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
        remainingSeconds: true,
        violationCount: true,
        finishedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
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

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      finishReason: session.finishReason,
      isForceFinished,
      isFinished,
      isSuspended: session.status === "SUSPENDED",
      remainingSeconds: session.remainingSeconds,
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
