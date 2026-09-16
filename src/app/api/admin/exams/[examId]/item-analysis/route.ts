import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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
            question: {
              include: {
                options: true,
                topic: true,
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
    }

    // Fetch all completed sessions with answers
    const sessions = await prisma.examSession.findMany({
      where: { examId, status: "COMPLETED" },
      include: {
        user: {
          select: { id: true, name: true, username: true, group: true },
        },
        answers: true,
      },
      orderBy: { score: "desc" },
    });

    const N = sessions.length;
    const k = exam.examQuestions.length;

    if (N === 0) {
      return NextResponse.json({
        exam: {
          id: exam.id,
          title: exam.title,
          code: exam.code,
          subject: exam.subject.name,
          totalQuestions: k,
        },
        totalParticipants: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        cronbachAlpha: 0,
        reliabilityCategory: "Belum Ada Data Peserta",
        items: [],
      });
    }

    const scores = sessions.map((s) => s.score || 0);
    const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / N) * 100) / 100;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Calculate Variance of Total Test Scores
    const meanScore = averageScore;
    const totalScoreVariance =
      N > 1
        ? scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / (N - 1)
        : 0;

    // Define Upper and Lower 27% Groups
    const groupSize = Math.max(1, Math.round(N * 0.27));
    const upperGroup = sessions.slice(0, groupSize);
    const lowerGroup = sessions.slice(Math.max(groupSize, N - groupSize));

    let sumItemVariance = 0;

    const items = exam.examQuestions.map((eq, index) => {
      const q = eq.question;
      const questionMaxScore = eq.score || 1.0;

      let correctCount = 0;
      let upperCorrect = 0;
      let lowerCorrect = 0;

      // Option selection frequency map
      const optionCounts: Record<string, { total: number; upper: number; lower: number; isCorrect: boolean; content: string }> = {};
      q.options.forEach((opt) => {
        optionCounts[opt.id] = {
          total: 0,
          upper: 0,
          lower: 0,
          isCorrect: opt.isCorrect,
          content: opt.content,
        };
      });

      // Scan all sessions
      sessions.forEach((s) => {
        const ans = s.answers.find((a) => a.questionId === q.id);
        if (ans?.isCorrect) correctCount++;

        // Track selected option
        if (ans?.selectedOptionIds) {
          try {
            const selected = JSON.parse(ans.selectedOptionIds);
            selected.forEach((optId: string) => {
              if (optionCounts[optId]) optionCounts[optId].total++;
            });
          } catch {}
        }
      });

      // Upper group counts
      upperGroup.forEach((s) => {
        const ans = s.answers.find((a) => a.questionId === q.id);
        if (ans?.isCorrect) upperCorrect++;
        if (ans?.selectedOptionIds) {
          try {
            const selected = JSON.parse(ans.selectedOptionIds);
            selected.forEach((optId: string) => {
              if (optionCounts[optId]) optionCounts[optId].upper++;
            });
          } catch {}
        }
      });

      // Lower group counts
      lowerGroup.forEach((s) => {
        const ans = s.answers.find((a) => a.questionId === q.id);
        if (ans?.isCorrect) lowerCorrect++;
        if (ans?.selectedOptionIds) {
          try {
            const selected = JSON.parse(ans.selectedOptionIds);
            selected.forEach((optId: string) => {
              if (optionCounts[optId]) optionCounts[optId].lower++;
            });
          } catch {}
        }
      });

      // 1. Tingkat Kesukaran (P)
      const P = N > 0 ? Math.round((correctCount / N) * 100) / 100 : 0;
      let difficultyCategory = "Sedang";
      let difficultyColor = "blue";
      if (P > 0.7) {
        difficultyCategory = "Mudah";
        difficultyColor = "emerald";
      } else if (P < 0.3) {
        difficultyCategory = "Sukar";
        difficultyColor = "rose";
      }

      // 2. Daya Beda (D)
      let D = 0;
      if (groupSize > 0) {
        D = Math.round(((upperCorrect - lowerCorrect) / groupSize) * 100) / 100;
      }
      let discriminationCategory = "Ditolak / Dibuang";
      let discriminationColor = "rose";
      let statusRecommendation = "DIBUANG";

      if (D >= 0.4) {
        discriminationCategory = "Sangat Baik";
        discriminationColor = "emerald";
        statusRecommendation = "SANGAT_BAIK";
      } else if (D >= 0.3) {
        discriminationCategory = "Baik";
        discriminationColor = "blue";
        statusRecommendation = "BAIK";
      } else if (D >= 0.2) {
        discriminationCategory = "Cukup (Perlu Revisi)";
        discriminationColor = "amber";
        statusRecommendation = "REVISI";
      }

      // Item Variance for Cronbach's Alpha (pi * qi)
      const itemVar = P * (1 - P);
      sumItemVariance += itemVar;

      // Distractor Analysis (Effectiveness of incorrect options)
      const distractors = Object.entries(optionCounts).map(([optId, data]) => {
        const percent = N > 0 ? Math.round((data.total / N) * 100) : 0;
        let isEffective = true;
        if (!data.isCorrect && percent < 5) {
          // Less than 5% chose this distractor -> ineffective
          isEffective = false;
        }
        return {
          optionId: optId,
          content: data.content,
          isCorrect: data.isCorrect,
          selectedCount: data.total,
          selectedPercent: percent,
          upperCount: data.upper,
          lowerCount: data.lower,
          isEffective,
        };
      });

      return {
        number: index + 1,
        questionId: q.id,
        content: q.content,
        topicName: q.topic?.name || "Umum",
        type: q.type,
        correctCount,
        incorrectCount: N - correctCount,
        difficultyIndex: P,
        difficultyCategory,
        difficultyColor,
        discriminationIndex: D,
        discriminationCategory,
        discriminationColor,
        statusRecommendation,
        distractors,
      };
    });

    // Calculate Cronbach's Alpha
    let cronbachAlpha = 0;
    if (k > 1 && totalScoreVariance > 0) {
      cronbachAlpha = (k / (k - 1)) * (1 - sumItemVariance / (totalScoreVariance / 100));
      cronbachAlpha = Math.max(0, Math.min(1, Math.round(cronbachAlpha * 100) / 100));
    }

    let reliabilityCategory = "Kurang Reliabel";
    if (cronbachAlpha >= 0.8) reliabilityCategory = "Sangat Tinggi (Sangat Reliabel)";
    else if (cronbachAlpha >= 0.6) reliabilityCategory = "Tinggi (Reliabel)";
    else if (cronbachAlpha >= 0.4) reliabilityCategory = "Sedang";

    // Summary counts
    const countExcellent = items.filter((i) => i.statusRecommendation === "SANGAT_BAIK").length;
    const countGood = items.filter((i) => i.statusRecommendation === "BAIK").length;
    const countRevision = items.filter((i) => i.statusRecommendation === "REVISI").length;
    const countDiscard = items.filter((i) => i.statusRecommendation === "DIBUANG").length;

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        subject: exam.subject.name,
        totalQuestions: k,
      },
      totalParticipants: N,
      upperGroupSize: groupSize,
      lowerGroupSize: groupSize,
      averageScore,
      highestScore,
      lowestScore,
      cronbachAlpha,
      reliabilityCategory,
      summary: {
        countExcellent,
        countGood,
        countRevision,
        countDiscard,
      },
      items,
    });
  } catch (error: any) {
    console.error("Item Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
