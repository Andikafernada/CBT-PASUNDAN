import { prisma } from "@/lib/prisma";

import { gradeEssayWithAI } from "@/lib/ai-grader";

import { getMatchingResponseToken } from "@/lib/exam-token-crypto";



export interface OptionItem {

  id: string;

  content: string;

  isCorrect?: boolean;

  orderIndex?: number;

}



export interface MatchingPairItem {

  id: string;

  premise: string;

  response: string;

  orderIndex?: number;

}



// 🎯 PURE FUNCTIONS: Isolated Scoring Evaluation (Easily Testable via Unit Tests)



export function gradeMultipleChoice(

  options: OptionItem[],

  selectedOptionIds: string[],

  questionMaxScore: number

): { isCorrect: boolean; scoreAwarded: number } {

  const correctOpt = options.find((o) => o.isCorrect);

  if (correctOpt && selectedOptionIds.length === 1 && selectedOptionIds[0] === correctOpt.id) {

    return { isCorrect: true, scoreAwarded: questionMaxScore };

  }

  return { isCorrect: false, scoreAwarded: 0 };

}



export function gradeComplexMultipleChoice(

  options: OptionItem[],

  selectedOptionIds: string[],

  questionMaxScore: number

): { isCorrect: boolean; scoreAwarded: number } {

  const correctOptionIds = options.filter((o) => o.isCorrect).map((o) => o.id).sort();

  const selected = [...selectedOptionIds].sort();



  if (correctOptionIds.length > 0 && JSON.stringify(correctOptionIds) === JSON.stringify(selected)) {

    return { isCorrect: true, scoreAwarded: questionMaxScore };

  }



  let correctSelected = 0;

  let wrongSelected = 0;

  selected.forEach((id: string) => {

    if (correctOptionIds.includes(id)) correctSelected++;

    else wrongSelected++;

  });



  if (correctOptionIds.length > 0) {

    const fraction = Math.max(0, (correctSelected - wrongSelected) / correctOptionIds.length);

    const scoreAwarded = Math.round(fraction * questionMaxScore * 100) / 100;

    return { isCorrect: scoreAwarded > 0, scoreAwarded };

  }



  return { isCorrect: false, scoreAwarded: 0 };

}



export function gradeMatching(

  matchingAns: Record<string, unknown>,

  pairs: MatchingPairItem[],

  sessionId: string,

  questionMaxScore: number

): { isCorrect: boolean; scoreAwarded: number; matchesCorrect: number; attempted: number } {

  const { matchesCorrect, attempted } = countMatchingCorrect(matchingAns, pairs, sessionId);

  const totalPairs = pairs.length;

  if (totalPairs > 0) {

    const ratio = matchesCorrect / totalPairs;

    const scoreAwarded = Math.round(ratio * questionMaxScore * 100) / 100;

    return {

      isCorrect: ratio > 0,

      scoreAwarded,

      matchesCorrect,

      attempted,

    };

  }

  return { isCorrect: false, scoreAwarded: 0, matchesCorrect: 0, attempted: 0 };

}



// Parse JSON objek jawaban matching secara aman; fallback ke {} bila rusak.

export function safeParseObject(raw: string | null | undefined): Record<string, unknown> {

  if (!raw) return {};

  try {

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};

  } catch {

    return {};

  }

}



// Hitung pasangan matching yang benar. Mendukung legacy pair.id dan obfuscated HMAC token.

export function countMatchingCorrect(

  matchingAns: Record<string, unknown>,

  pairs: { id: string }[],

  sessionId?: string

): { matchesCorrect: number; attempted: number } {

  let matchesCorrect = 0;

  let attempted = 0;

  for (const pair of pairs) {

    const chosen = matchingAns[pair.id];

    if (chosen === undefined || chosen === null || chosen === "") continue;

    attempted++;

    const expectedToken = sessionId ? getMatchingResponseToken(pair.id, sessionId) : "";

    if (chosen === pair.id || (expectedToken && chosen === expectedToken)) {

      matchesCorrect++;

    }

  }

  return { matchesCorrect, attempted };

}



// Shared score calculation logic with High-Concurrency Batch Transaction

export async function calculateAndFinishSession(sessionId: string, finishReason: string = "SELF") {

  const session = await prisma.examSession.findUnique({

    where: { id: sessionId },

    include: {

      answers: true,

      exam: {

        include: {

          examQuestions: {

            include: {

              question: {

                include: { options: true, matchingPairs: true },

              },

            },

          },

        },

      },

    },

  });



  if (!session || session.status === "COMPLETED" || session.status === "FORCE_FINISHED" || session.status === "TIMEOUT") {

    return session;

  }



  let totalScoreAwarded = 0;

  let totalMaxScore = 0;

  let correctCount = 0;

  let incorrectCount = 0;

  let essayCount = 0;
  const pendingEssaysToGrade: Array<{
    answerId: string;
    questionContent: string;
    rubric: string;
    studentText: string;
    maxScore: number;
  }> = [];

  const answersMap = new Map(session.answers.map((a) => [a.questionId, a]));

  const answerUpdates: any[] = [];



  // 🛡️ Subject Fallback: If examQuestions is empty, automatically score against subject questions
  let examQuestions = session.exam.examQuestions;
  if (!examQuestions || examQuestions.length === 0) {
    const subjectQuestions = await prisma.question.findMany({
      where: { subjectId: session.exam.subjectId },
      include: { options: true, matchingPairs: true },
      orderBy: { createdAt: "asc" },
    });
    examQuestions = subjectQuestions.map((q: any, idx: number) => ({
      id: `auto_${q.id}`,
      examId: session.exam.id,
      questionId: q.id,
      orderIndex: idx + 1,
      score: q.points || 1.0,
      question: q,
    })) as any;
  }

  for (const eq of examQuestions) {

    const q = eq.question;

    const questionMaxScore = eq.score || 1.0;

    totalMaxScore += questionMaxScore;



    const userAns = answersMap.get(q.id);

    if (!userAns) {

      incorrectCount++;

      continue;

    }



    let isCorrect = false;

    let scoreAwarded = 0;



    if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {

      let selected: string[] = [];

      try {

        if (userAns.selectedOptionIds) selected = JSON.parse(userAns.selectedOptionIds);

      } catch {}

      const res = gradeMultipleChoice(q.options, selected, questionMaxScore);

      isCorrect = res.isCorrect;

      scoreAwarded = res.scoreAwarded;

      if (isCorrect) correctCount++;

      else incorrectCount++;

    } else if (q.type === "COMPLEX_MULTIPLE_CHOICE") {

      let selected: string[] = [];

      try {

        if (userAns.selectedOptionIds) selected = JSON.parse(userAns.selectedOptionIds);

      } catch {}

      const res = gradeComplexMultipleChoice(q.options, selected, questionMaxScore);

      isCorrect = res.isCorrect;

      scoreAwarded = res.scoreAwarded;

      if (scoreAwarded === questionMaxScore) correctCount++;

      else if (scoreAwarded === 0) incorrectCount++;

    } else if (q.type === "MATCHING") {

      const matchingAns = safeParseObject(userAns.matchingAnswer);

      const res = gradeMatching(matchingAns, q.matchingPairs, session.id, questionMaxScore);

      isCorrect = res.isCorrect;

      scoreAwarded = res.scoreAwarded;

      if (res.matchesCorrect === q.matchingPairs.length) correctCount++;
      else if (res.matchesCorrect === 0 && res.attempted > 0) incorrectCount++;
      else if (res.matchesCorrect > 0 && res.matchesCorrect < q.matchingPairs.length) {
        if (scoreAwarded >= questionMaxScore * 0.5) correctCount++;
        else incorrectCount++;
      }
    } else if (q.type === "ESSAY") {
      essayCount++;
      const isAlreadyGraded = userAns.isAiGraded || (userAns.scoreAwarded !== null && userAns.scoreAwarded !== undefined && userAns.scoreAwarded > 0);
      let teacherFeedback = userAns.teacherFeedback || null;

      if (isAlreadyGraded) {
        scoreAwarded = userAns.scoreAwarded || 0;
        if (scoreAwarded > 0) isCorrect = true;
      } else {
        // ⚡ ASYNC QUEUE: Enqueue for non-blocking background AI grading (Zero student submit wait)
        scoreAwarded = 0;
        isCorrect = false;
        teacherFeedback = "Sedang dalam antrean koreksi otomatis AI...";
        const rubricToUse =
          q.rubric && q.rubric.trim().length > 0 && q.rubric.trim() !== "null"
            ? q.rubric.trim()
            : "Kesesuaian pemahaman konsep dengan pertanyaan.";

        pendingEssaysToGrade.push({
          answerId: userAns.id,
          questionContent: q.content,
          rubric: rubricToUse,
          studentText: userAns.textAnswer || "",
          maxScore: questionMaxScore,
        });
      }

      totalScoreAwarded += scoreAwarded;

      answerUpdates.push(
        prisma.examAnswer.update({
          where: { id: userAns.id },
          data: { isCorrect, scoreAwarded, teacherFeedback, isAiGraded: isAlreadyGraded },
        })
      );
      continue;
    }



    totalScoreAwarded += scoreAwarded;



    answerUpdates.push(

      prisma.examAnswer.update({

        where: { id: userAns.id },

        data: { isCorrect, scoreAwarded },

      })

    );

  }



  // ⚡ HIGH CONCURRENCY: Jalankan seluruh update jawaban dalam 1 transaksi batch (Bukan N+1 loop)

  if (answerUpdates.length > 0) {

    await prisma.$transaction(answerUpdates);

  }



  const finalScore = totalMaxScore > 0 ? (totalScoreAwarded / totalMaxScore) * 100 : 0;



  const statusMap: Record<string, string> = {

    SELF: "COMPLETED",

    TIMEOUT: "TIMEOUT",

    FORCE_BY_ADMIN: "FORCE_FINISHED",

    PROCTOR_FORCE: "FORCE_FINISHED",

    VIOLATION: "COMPLETED",

  };



  const updatedSession = await prisma.examSession.update({

    where: { id: sessionId },

    data: {

      status: statusMap[finishReason] || "COMPLETED",

      finishReason,

      finishedAt: new Date(),

      remainingSeconds: 0,

      score: Math.round(finalScore * 100) / 100,

      totalPossible: 100,

    },

  });



  // 🚀 NON-BLOCKING ASYNC AI GRADING: Dispatch background worker for essay grading
  if (pendingEssaysToGrade.length > 0) {
    dispatchBackgroundAiGrading(sessionId, session.exam.id, totalMaxScore, pendingEssaysToGrade);
  }

  return { ...updatedSession, correctCount, incorrectCount, essayCount, totalQuestions: examQuestions.length };

}

/**
 * ⚡ Non-blocking background worker to grade essays via Gemini AI
 * Automatically recalculates and updates final session score upon completion.
 */
export function dispatchBackgroundAiGrading(
  sessionId: string,
  examId: string,
  totalMaxScore: number,
  essays: Array<{
    answerId: string;
    questionContent: string;
    rubric: string;
    studentText: string;
    maxScore: number;
  }>
) {
  setImmediate(async () => {
    console.log(`[AI Queue] Background essay grading started for session ${sessionId} (${essays.length} essays)...`);
    try {
      for (const item of essays) {
        if (!item.studentText || item.studentText.trim().length === 0) {
          await prisma.examAnswer.update({
            where: { id: item.answerId },
            data: {
              scoreAwarded: 0,
              isCorrect: false,
              isAiGraded: true,
              teacherFeedback: "Jawaban kosong / tidak diisi oleh siswa.",
            },
          });
          continue;
        }

        try {
          const aiRes = await gradeEssayWithAI(
            item.questionContent,
            item.rubric,
            item.studentText,
            item.maxScore
          );

          await prisma.examAnswer.update({
            where: { id: item.answerId },
            data: {
              scoreAwarded: aiRes.scoreAwarded,
              isCorrect: aiRes.scoreAwarded > 0,
              isAiGraded: true,
              teacherFeedback: aiRes.feedback,
            },
          });
          console.log(`[AI Queue] Successfully graded answer ${item.answerId}: ${aiRes.scoreAwarded}/${item.maxScore}`);
        } catch (err: any) {
          console.error(`[AI Queue] Error grading answer ${item.answerId}:`, err?.message || err);
          await prisma.examAnswer.update({
            where: { id: item.answerId },
            data: {
              teacherFeedback: "Koreksi AI tertunda karena jaringan. Guru dapat memeriksa manual di menu Koreksi Esai.",
            },
          });
        }

        // Throttle 300ms between calls to respect Gemini API rate limits
        await new Promise((r) => setTimeout(r, 300));
      }

      // Recalculate and update final session score
      const allAnswers = await prisma.examAnswer.findMany({
        where: { sessionId },
        select: { scoreAwarded: true },
      });
      const totalEarned = allAnswers.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0);
      const recalculatedFinal = totalMaxScore > 0 ? (totalEarned / totalMaxScore) * 100 : 0;
      const roundedScore = Math.round(recalculatedFinal * 100) / 100;

      await prisma.examSession.update({
        where: { id: sessionId },
        data: { score: roundedScore },
      });
      console.log(`[AI Queue] Finished background essay grading for session ${sessionId}. Final score updated to: ${roundedScore}`);
    } catch (error) {
      console.error(`[AI Queue] Unexpected error in background grading for session ${sessionId}:`, error);
    }
  });
}

