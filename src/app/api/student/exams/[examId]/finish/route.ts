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

    const session = await prisma.examSession.findUnique({
      where: { examId_userId: { examId, userId: user.id } },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesi ujian tidak ditemukan" }, { status: 404 });
    }

    if (["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session.status)) {
      return NextResponse.json({ error: "Ujian sudah selesai dikerjakan" }, { status: 400 });
    }

    // Early Submission Lock: Cannot submit if remaining time > 10 minutes (600s) and duration > 10 mins
    const examDurationMinutes = exam.durationMinutes || 60;
    const currentRemainingSeconds = session.remainingSeconds ?? 3600;

    if (examDurationMinutes > 10 && currentRemainingSeconds > 600) {
      const secondsUntilUnlock = currentRemainingSeconds - 600;
      const minutesUntilUnlock = Math.ceil(secondsUntilUnlock / 60);

      return NextResponse.json(
        {
          error: `Pengumpulan ujian terkunci. Tombol selesaikan ujian baru akan aktif saat sisa waktu pengerjaan 10 menit terakhir (sekitar ${minutesUntilUnlock} menit lagi). Silakan periksa kembali seluruh jawaban Anda.`,
          isLockedEarly: true,
          remainingSeconds: currentRemainingSeconds,
          secondsUntilUnlock,
          minutesUntilUnlock,
        },
        { status: 400 }
      );
    }

    const result: any = await calculateAndFinishSession(session.id, "SELF");

    return NextResponse.json({
      success: true,
      message: "Ujian berhasil diselesaikan",
      result: {
        score: result.score,
        totalQuestions: exam.examQuestions.length,
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
