import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { gradeEssayWithAI } from "@/lib/ai-grader";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
    }

    // Filter only ESSAY questions
    const essayQuestions = exam.examQuestions
      .filter((eq) => eq.question.type === "ESSAY")
      .map((eq) => ({
        id: eq.question.id,
        content: eq.question.content,
        rubric: eq.question.rubric,
        maxScore: eq.question.points || 10,
        orderIndex: eq.orderIndex,
      }));

    if (essayQuestions.length === 0) {
      return NextResponse.json({
        exam: { id: exam.id, title: exam.title, subject: exam.subject.name },
        essayQuestions: [],
        answers: [],
        message: "Ujian ini tidak memiliki soal tipe Esai / Uraian.",
      });
    }

    const essayQuestionIds = essayQuestions.map((q) => q.id);

    // Fetch all student answers for these essay questions
    const answers = await prisma.examAnswer.findMany({
      where: {
        questionId: { in: essayQuestionIds },
        session: { examId },
      },
      include: {
        session: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                nis: true,
                group: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { session: { user: { name: "asc" } } },
    });

    const formattedAnswers = answers.map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      questionId: a.questionId,
      textAnswer: a.textAnswer || "",
      scoreAwarded: a.scoreAwarded ?? null,
      teacherFeedback: a.teacherFeedback || "",
      isAiGraded: a.isAiGraded || false,
      student: {
        id: a.session.user.id,
        name: a.session.user.name,
        username: a.session.user.username,
        nis: a.session.user.nis,
        group: a.session.user.group?.name || "-",
      },
    }));

    return NextResponse.json({
      exam: { id: exam.id, title: exam.title, subject: exam.subject.name },
      essayQuestions,
      answers: formattedAnswers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat data koreksi esai" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, answerId, scoreAwarded, teacherFeedback, questionId, forceReGrade } = body;

    // ========================================================
    // 1. ACTION: BATCH AI AUTO-GRADE
    // ========================================================
    if (action === "BATCH_AI_GRADE") {
      const examQuestions = await prisma.examQuestion.findMany({
        where: {
          examId,
          question: { type: "ESSAY" },
          ...(questionId ? { questionId } : {}),
        },
        include: { question: true },
      });

      if (examQuestions.length === 0) {
        return NextResponse.json({ error: "Tidak ada butir soal esai pada ujian ini" }, { status: 400 });
      }

      const qIds = examQuestions.map((eq) => eq.questionId);

      const answersToGrade = await prisma.examAnswer.findMany({
        where: {
          questionId: { in: qIds },
          session: { examId },
          ...(!forceReGrade ? { scoreAwarded: null } : {}),
        },
        include: {
          session: true,
          question: true,
        },
      });

      if (answersToGrade.length === 0) {
        return NextResponse.json({
          success: true,
          gradedCount: 0,
          message: "Seluruh jawaban esai telah memiliki nilai.",
        });
      }

      let gradedCount = 0;
      const affectedSessionIds = new Set<string>();

      for (const ans of answersToGrade) {
        const q = ans.question;
        const maxScore = q.points || 10;
        const rubric = q.rubric || "Kesesuaian pemahaman konsep dan kelengkapan uraian.";
        const studentText = (ans.textAnswer || "").trim();

        if (!studentText) {
          await prisma.examAnswer.update({
            where: { id: ans.id },
            data: {
              scoreAwarded: 0,
              teacherFeedback: "Jawaban kosong / tidak dijawab.",
              isCorrect: false,
              isAiGraded: true,
            },
          });
          affectedSessionIds.add(ans.sessionId);
          gradedCount++;
          continue;
        }

        try {
          const aiRes = await gradeEssayWithAI(q.content, rubric, studentText, maxScore);
          await prisma.examAnswer.update({
            where: { id: ans.id },
            data: {
              scoreAwarded: aiRes.scoreAwarded,
              teacherFeedback: aiRes.feedback,
              isCorrect: aiRes.scoreAwarded > 0,
              isAiGraded: true,
            },
          });
          affectedSessionIds.add(ans.sessionId);
          gradedCount++;
        } catch (e) {
          console.error(`[AI-Grader] Error grading answer ${ans.id}:`, e);
        }
      }

      // Recalculate total session scores for affected students
      const allExamQuestions = await prisma.examQuestion.findMany({
        where: { examId },
        include: { question: true },
      });
      const totalMaxScore = allExamQuestions.reduce((acc, eq) => acc + (eq.question.points || 1), 0);

      for (const sessionId of Array.from(affectedSessionIds)) {
        const allSessionAnswers = await prisma.examAnswer.findMany({
          where: { sessionId },
        });
        const totalAwarded = allSessionAnswers.reduce((acc, a) => acc + (a.scoreAwarded || 0), 0);
        const finalScore = totalMaxScore > 0 ? (totalAwarded / totalMaxScore) * 100 : 0;

        await prisma.examSession.update({
          where: { id: sessionId },
          data: { score: Math.round(finalScore * 100) / 100 },
        });
      }

      return NextResponse.json({
        success: true,
        gradedCount,
        message: `Berhasil mengoreksi ${gradedCount} jawaban esai secara otomatis menggunakan AI!`,
      });
    }

    // ========================================================
    // 2. ACTION: BATCH APPROVE AI GRADES (VALIDASI SEMUA NILAI AI)
    // ========================================================
    if (action === "APPROVE_ALL_AI") {
      const updateResult = await prisma.examAnswer.updateMany({
        where: {
          session: { examId },
          ...(questionId ? { questionId } : {}),
          isAiGraded: true,
        },
        data: {
          isAiGraded: false,
        },
      });

      return NextResponse.json({
        success: true,
        validatedCount: updateResult.count,
        message: `Berhasil memvalidasi dan mengesahkan ${updateResult.count} nilai esai AI!`,
      });
    }

    // ========================================================
    // 3. ACTION: SINGLE MANUAL GRADE / MODERASI GURU
    // ========================================================
    if (!answerId || scoreAwarded === undefined || scoreAwarded === null) {
      return NextResponse.json({ error: "answerId dan scoreAwarded wajib diisi" }, { status: 400 });
    }

    const scoreNum = Number(scoreAwarded);
    if (isNaN(scoreNum) || scoreNum < 0) {
      return NextResponse.json({ error: "Nilai harus berupa angka valid (>= 0)" }, { status: 400 });
    }

    const answer = await prisma.examAnswer.findUnique({
      where: { id: answerId },
      include: {
        session: true,
        question: true,
      },
    });

    if (!answer) {
      return NextResponse.json({ error: "Jawaban esai tidak ditemukan" }, { status: 404 });
    }

    // Update the answer score & remove AI flag on manual teacher edit
    const updatedAnswer = await prisma.examAnswer.update({
      where: { id: answerId },
      data: {
        scoreAwarded: scoreNum,
        teacherFeedback: teacherFeedback || null,
        isCorrect: scoreNum > 0,
        isAiGraded: false,
      },
    });

    // Recalculate total session score
    const allSessionAnswers = await prisma.examAnswer.findMany({
      where: { sessionId: answer.sessionId },
      include: { question: true },
    });

    const examQuestions = await prisma.examQuestion.findMany({
      where: { examId },
      include: { question: true },
    });

    const totalMaxScore = examQuestions.reduce((acc, eq) => acc + (eq.question.points || 1), 0);
    const totalAwarded = allSessionAnswers.reduce((acc, ans) => acc + (ans.scoreAwarded || 0), 0);
    const finalScore = totalMaxScore > 0 ? (totalAwarded / totalMaxScore) * 100 : 0;

    await prisma.examSession.update({
      where: { id: answer.sessionId },
      data: { score: Math.round(finalScore * 100) / 100 },
    });

    return NextResponse.json({
      success: true,
      scoreAwarded: updatedAnswer.scoreAwarded,
      newSessionScore: Math.round(finalScore * 100) / 100,
      message: "Nilai esai berhasil disimpan dan nilai total siswa telah diperbarui.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan nilai esai" }, { status: 500 });
  }
}
