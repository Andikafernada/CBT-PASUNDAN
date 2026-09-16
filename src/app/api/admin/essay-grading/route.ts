import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all published exams
    const exams = await prisma.exam.findMany({
      include: {
        subject: { select: { name: true } },
        examQuestions: {
          include: {
            question: {
              select: { id: true, type: true, points: true },
            },
          },
        },
        examSessions: {
          select: {
            id: true,
            status: true,
            score: true,
            answers: {
              select: {
                id: true,
                questionId: true,
                textAnswer: true,
                scoreAwarded: true,
                isAiGraded: true,
                teacherFeedback: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const overview = exams.map((exam) => {
      const essayQuestions = exam.examQuestions.filter((eq) => eq.question.type === "ESSAY");
      const essayQuestionIdSet = new Set(essayQuestions.map((eq) => eq.question.id));

      const totalSubmissions = exam.examSessions.length;
      let totalEssayAnswers = 0;
      let aiGradedCount = 0;
      let teacherGradedCount = 0;
      let ungradedCount = 0;

      exam.examSessions.forEach((session) => {
        session.answers.forEach((ans) => {
          if (essayQuestionIdSet.has(ans.questionId)) {
            totalEssayAnswers++;
            if (ans.isAiGraded) {
              aiGradedCount++;
            } else if (ans.scoreAwarded !== null) {
              teacherGradedCount++;
            } else {
              ungradedCount++;
            }
          }
        });
      });

      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject?.name || "Mata Pelajaran",
        durationMinutes: exam.durationMinutes,
        category: exam.category || "REGULER",
        totalQuestions: exam.examQuestions.length,
        totalEssayQuestions: essayQuestions.length,
        totalSubmissions,
        totalEssayAnswers,
        aiGradedCount,
        teacherGradedCount,
        ungradedCount,
        hasPendingValidation: aiGradedCount > 0 || ungradedCount > 0,
        isFullyValidated: totalEssayAnswers > 0 && aiGradedCount === 0 && ungradedCount === 0,
      };
    });

    return NextResponse.json({
      success: true,
      exams: overview,
    });
  } catch (error: any) {
    console.error("Essay Grading Overview Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
