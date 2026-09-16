/**
 * CBT HEBAT SMK PASUNDAN 2 Bandung — Development by Andika Fernanda
 * Redis Exam Cache Pre-Warming Service (Anti-Thundering Herd)
 */

import { prisma } from "./prisma";
import { setCache, deleteCache } from "./redis";

export async function prewarmExamCache(examId: string): Promise<{
  success: boolean;
  questionCount: number;
  durationMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        examGroups: true,
        examQuestions: {
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    content: true,
                    orderIndex: true,
                  },
                  orderBy: { orderIndex: "asc" },
                },
                matchingPairs: {
                  select: {
                    id: true,
                    premise: true,
                    response: true,
                  },
                },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return { success: false, questionCount: 0, durationMs: 0, error: "Exam not found" };
    }

    const cacheKey = `cbt:exam:${examId}:bundle`;
    // Cache bundle for 8 hours (28800 seconds)
    await setCache(cacheKey, exam, 28800);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    return {
      success: true,
      questionCount: exam.examQuestions.length,
      durationMs,
    };
  } catch (err: any) {
    return {
      success: false,
      questionCount: 0,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      error: err?.message || "Cache warming failed",
    };
  }
}

export async function invalidateExamCache(examId: string): Promise<void> {
  const cacheKey = `cbt:exam:${examId}:bundle`;
  await deleteCache(cacheKey);
}
