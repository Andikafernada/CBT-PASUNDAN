import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalStudents,
      totalQuestions,
      totalExams,
      activeSessionsCount,
      recentSessions,
      subjects,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.question.count(),
      prisma.exam.count(),
      prisma.examSession.count({ where: { status: "IN_PROGRESS" } }),
      prisma.examSession.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { name: true, username: true, group: true } },
          exam: { select: { title: true, code: true } },
        },
      }),
      prisma.subject.findMany({
        include: {
          _count: { select: { topics: true, exams: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalQuestions,
        totalExams,
        activeSessionsCount,
      },
      recentSessions,
      subjects,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
