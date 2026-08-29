import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find published exams accessible to the student's group or all groups
    const exams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        OR: [
          {
            examGroups: {
              none: {}, // If no groups assigned, open to all
            },
          },
          ...(user.groupId
            ? [
                {
                  examGroups: {
                    some: {
                      groupId: user.groupId,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        subject: true,
        examQuestions: {
          select: { id: true },
        },
        examSessions: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            score: true,
            startedAt: true,
            finishedAt: true,
            remainingSeconds: true,
            violationCount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = exams.map((exam) => {
      const session = exam.examSessions[0] || null;
      return {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        description: exam.description,
        subject: exam.subject.name,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.examQuestions.length,
        startTime: exam.startTime,
        endTime: exam.endTime,
        showResult: exam.showResult,
        status: session ? session.status : "NOT_STARTED",
        score: session?.score,
        startedAt: session?.startedAt,
        finishedAt: session?.finishedAt,
        remainingSeconds: session?.remainingSeconds,
      };
    });

    return NextResponse.json({ exams: formatted });
  } catch (error: any) {
    console.error("Student Exams API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
