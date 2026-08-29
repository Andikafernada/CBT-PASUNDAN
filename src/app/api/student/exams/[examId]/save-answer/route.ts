import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { questionId, selectedOptionIds, textAnswer, matchingAnswer, isDoubtful, remainingSeconds } =
      await req.json();

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
    });

    if (!session || session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Sesi ujian tidak aktif atau telah selesai" },
        { status: 400 }
      );
    }

    // Upsert answer
    await prisma.examAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId,
        },
      },
      create: {
        sessionId: session.id,
        questionId,
        selectedOptionIds: selectedOptionIds ? JSON.stringify(selectedOptionIds) : null,
        textAnswer: textAnswer || null,
        matchingAnswer: matchingAnswer ? JSON.stringify(matchingAnswer) : null,
        isDoubtful: Boolean(isDoubtful),
      },
      update: {
        selectedOptionIds: selectedOptionIds ? JSON.stringify(selectedOptionIds) : null,
        textAnswer: textAnswer || null,
        matchingAnswer: matchingAnswer ? JSON.stringify(matchingAnswer) : null,
        isDoubtful: Boolean(isDoubtful),
        updatedAt: new Date(),
      },
    });

    // Update session remaining seconds
    if (typeof remainingSeconds === "number") {
      await prisma.examSession.update({
        where: { id: session.id },
        data: { remainingSeconds: Math.max(0, remainingSeconds) },
      });
    }

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("Save Answer Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
