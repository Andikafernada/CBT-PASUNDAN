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

    const body = await req.json().catch(() => ({}));
    const { forceSubmit, agreeZero } = body;

    // Strict minimum 30 minutes rule (or exam.minTimeMinutes)
    const requiredMinMinutes = Math.max(exam.minTimeMinutes || 0, 30);
    const elapsedMinutes = (Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60);

    if (elapsedMinutes < requiredMinMinutes) {
      if (forceSubmit && agreeZero) {
        // PENALTI NILAI 0 KARENA MEMAKSA KUMPUL SEBELUM 30 MENIT
        await prisma.examSession.update({
          where: { id: session.id },
          data: {
            status: "COMPLETED",
            score: 0,
            finishedAt: new Date(),
          },
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "FINISH_EXAM",
            details: `Siswa memaksa kumpul sebelum 30 menit (pengerjaan: ${Math.floor(elapsedMinutes)} menit). Penalti nilai 0 otomatis diterapkan.`,
          },
        }).catch(() => {});

        return NextResponse.json({
          success: true,
          isPenaltyZero: true,
          message: "Ujian dipaksa selesai sebelum 30 menit. Seluruh jawaban tidak dinilai dan skor otomatis 0.",
          result: {
            score: 0,
            totalQuestions: exam.examQuestions.length,
            correctCount: 0,
            incorrectCount: exam.examQuestions.length,
            essayCount: 0,
            showResult: exam.showResult,
            finishedAt: new Date(),
          },
        });
      } else {
        const remainingToMin = Math.ceil(requiredMinMinutes - elapsedMinutes);
        return NextResponse.json(
          {
            error: `Ujian baru dapat diselesaikan setelah minimal ${requiredMinMinutes} menit pengerjaan. Anda baru mengerjakan selama ${Math.floor(elapsedMinutes)} menit (kurang ${remainingToMin} menit lagi).`,
            underMinTime: true,
            minMinutes: requiredMinMinutes,
            elapsedMinutes: Math.floor(elapsedMinutes),
            remainingToMin,
          },
          { status: 400 }
        );
      }
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
