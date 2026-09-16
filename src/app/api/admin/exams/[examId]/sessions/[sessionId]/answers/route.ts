import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMatchingResponseToken } from "@/lib/exam-token-crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string; sessionId: string }> }
) {
  try {
    const { examId, sessionId } = await params;
    const user = await getSessionUser();

    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            group: {
              select: { id: true, name: true, isPkl: true },
            },
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            code: true,
            subject: { select: { name: true } },
          },
        },
        answers: true,
      },
    });

    if (!session || session.examId !== examId) {
      return NextResponse.json({ error: "Sesi ujian tidak ditemukan" }, { status: 404 });
    }

    // Fetch questions ordered as configured in exam (including matchingPairs)
    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId },
      include: {
        question: {
          include: {
            options: {
              orderBy: { orderIndex: "asc" },
            },
            matchingPairs: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const answersMap = new Map();
    for (const ans of session.answers) {
      answersMap.set(ans.questionId, ans);
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questionsDetail = examQuestions.map((eq, idx) => {
      const q = eq.question;
      const ans = answersMap.get(q.id);

      let selectedOptionIds: string[] = [];
      if (ans?.selectedOptionIds) {
        try {
          selectedOptionIds = JSON.parse(ans.selectedOptionIds);
        } catch {
          selectedOptionIds = [ans.selectedOptionIds];
        }
      }

      let hasMatching = false;
      let parsedMatchingAns: Record<string, string> = {};
      if (ans?.matchingAnswer) {
        try {
          parsedMatchingAns =
            typeof ans.matchingAnswer === "string"
              ? JSON.parse(ans.matchingAnswer)
              : (ans.matchingAnswer || {});
          if (parsedMatchingAns && typeof parsedMatchingAns === "object") {
            hasMatching = Object.values(parsedMatchingAns).some(
              (v) => typeof v === "string" && v.trim().length > 0
            );
          }
        } catch {}
      }

      const isAnswered =
        selectedOptionIds.length > 0 ||
        (ans?.textAnswer && ans.textAnswer.trim() !== "") ||
        hasMatching;

      let isCorrect = ans?.isCorrect ?? false;
      if (ans && ans.isCorrect === null && q.type === "MULTIPLE_CHOICE") {
        const correctOpt = q.options.find((o) => o.isCorrect);
        isCorrect = correctOpt ? selectedOptionIds.includes(correctOpt.id) : false;
      }

      if (!isAnswered) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      const matchingPairs = (q.matchingPairs || []).map((p: any) => {
        const studentChosen = parsedMatchingAns[p.id];
        const expectedToken = getMatchingResponseToken(p.id, session.id);
        const isMatch = studentChosen === p.id || (expectedToken && studentChosen === expectedToken);

        const matchedPair = (q.matchingPairs || []).find((other: any) => {
          const otherToken = getMatchingResponseToken(other.id, session.id);
          return studentChosen === other.id || (otherToken && studentChosen === otherToken);
        });

        return {
          id: p.id,
          premise: p.premise,
          correctResponse: p.response,
          studentResponse: matchedPair
            ? matchedPair.response
            : studentChosen
            ? "Pilihan Lain"
            : "(Tidak Dijawab)",
          isCorrect: Boolean(isMatch),
        };
      });

      return {
        id: q.id,
        number: idx + 1,
        orderIndex: eq.orderIndex,
        content: q.content,
        type: q.type,
        rubric: q.rubric,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        maxScore: eq.score,
        options: q.options.map((opt, optIdx) => ({
          id: opt.id,
          key: String.fromCharCode(65 + optIdx),
          content: opt.content,
          isCorrect: opt.isCorrect,
          isSelected: selectedOptionIds.includes(opt.id),
        })),
        matchingPairs,
        studentAnswer: {
          selectedOptionIds,
          textAnswer: ans?.textAnswer || null,
          matchingAnswer: ans?.matchingAnswer || null,
          teacherFeedback: ans?.teacherFeedback || null,
          isAiGraded: ans?.isAiGraded ?? false,
          isCorrect,
          scoreAwarded: ans?.scoreAwarded ?? 0,
          isDoubtful: ans?.isDoubtful ?? false,
          isAnswered,
        },
      };
    });

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        score: session.score ?? 0,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        student: {
          id: session.user.id,
          name: session.user.name,
          nis: session.user.username,
          group: session.user.group?.name || "-",
        },
      },
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        code: session.exam.code,
        subject: session.exam.subject?.name || "-",
      },
      summary: {
        totalQuestions: examQuestions.length,
        answeredCount: examQuestions.length - unansweredCount,
        unansweredCount,
        correctCount,
        incorrectCount,
        score: session.score ?? 0,
      },
      questions: questionsDetail,
    });
  } catch (error: any) {
    console.error("Error fetching session answers:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
