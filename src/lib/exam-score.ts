import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Shared score calculation logic (reused by finish endpoint & force-finish)
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

  const answersMap = new Map(session.answers.map((a) => [a.questionId, a]));

  for (const eq of session.exam.examQuestions) {
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
      const correctOpt = q.options.find((o) => o.isCorrect);
      const selected = userAns.selectedOptionIds ? JSON.parse(userAns.selectedOptionIds) : [];
      if (correctOpt && selected.length === 1 && selected[0] === correctOpt.id) {
        isCorrect = true;
        scoreAwarded = questionMaxScore;
        correctCount++;
      } else {
        incorrectCount++;
      }
    } else if (q.type === "COMPLEX_MULTIPLE_CHOICE") {
      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
      const selected = (userAns.selectedOptionIds ? JSON.parse(userAns.selectedOptionIds) : []).sort();
      if (JSON.stringify(correctOptionIds) === JSON.stringify(selected)) {
        isCorrect = true;
        scoreAwarded = questionMaxScore;
        correctCount++;
      } else {
        let correctSelected = 0;
        let wrongSelected = 0;
        selected.forEach((id: string) => {
          if (correctOptionIds.includes(id)) correctSelected++;
          else wrongSelected++;
        });
        if (correctOptionIds.length > 0) {
          const fraction = Math.max(0, (correctSelected - wrongSelected) / correctOptionIds.length);
          scoreAwarded = fraction * questionMaxScore;
          if (scoreAwarded > 0) isCorrect = true;
        }
        if (scoreAwarded === 0) incorrectCount++;
      }
    } else if (q.type === "MATCHING") {
      const matchingAns = userAns.matchingAnswer ? JSON.parse(userAns.matchingAnswer) : {};
      let matchesCorrect = 0;
      const totalPairs = q.matchingPairs.length;
      q.matchingPairs.forEach((pair) => {
        if (matchingAns[pair.id] === pair.id) matchesCorrect++;
      });
      if (totalPairs > 0) {
        const ratio = matchesCorrect / totalPairs;
        scoreAwarded = ratio * questionMaxScore;
        if (ratio === 1) { isCorrect = true; correctCount++; }
        else if (ratio > 0) { isCorrect = true; }
        else { incorrectCount++; }
      }
    } else if (q.type === "ESSAY") {
      essayCount++;
      scoreAwarded = userAns.scoreAwarded || 0;
    }

    totalScoreAwarded += scoreAwarded;

    await prisma.examAnswer.update({
      where: { id: userAns.id },
      data: { isCorrect, scoreAwarded },
    });
  }

  const finalScore = totalMaxScore > 0 ? (totalScoreAwarded / totalMaxScore) * 100 : 0;

  const statusMap: Record<string, string> = {
    SELF: "COMPLETED",
    TIMEOUT: "TIMEOUT",
    FORCE_BY_ADMIN: "FORCE_FINISHED",
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

  return { ...updatedSession, correctCount, incorrectCount, essayCount };
}
