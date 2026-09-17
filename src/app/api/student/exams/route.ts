import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine if student is in PKL group (via isPkl flag, bypassExambro, or group name/code)
    let isStudentPkl = false;
    if (user.groupId) {
      const studentGroup = await prisma.group.findUnique({
        where: { id: user.groupId },
        select: { id: true, name: true, code: true, isPkl: true, bypassExambro: true },
      });
      if (studentGroup) {
        isStudentPkl = Boolean(
          studentGroup.isPkl ||
          studentGroup.bypassExambro ||
          /pkl|dudi|magang/i.test(studentGroup.name) ||
          /pkl|dudi|magang/i.test(studentGroup.code)
        );
      }
    }

    // Direct user bypass flag
    const isUserSusulan = Boolean((user as any).bypassExambro && !isStudentPkl);

    // Strict Segregation:
    // PKL students only see category 'PKL', Regular students only see category 'REGULER'
    const targetCategory = isStudentPkl ? "PKL" : "REGULER";

    // Strict Group Segregation:
    // If student has a group (Rombel), ONLY show exams explicitly assigned to that Rombel!
    const groupFilter = user.groupId
      ? {
          examGroups: {
            some: {
              groupId: user.groupId,
            },
          },
        }
      : {
          examGroups: {
            none: {}, // Open to unassigned students
          },
        };

    const exams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        category: targetCategory,
        ...groupFilter,
      },
      include: {
        subject: {
          include: {
            questions: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
        examQuestions: {
          select: { id: true },
        },
        examGroups: user.groupId
          ? {
              where: { groupId: user.groupId },
              select: { sessionName: true, room: true, startTime: true, endTime: true },
            }
          : false,
        examSessions: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            finishReason: true,
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

    // Check parent exam completion status for any supplementary exams
    const parentExamIds = exams
      .filter((e) => e.isSupplementary && e.parentExamId)
      .map((e) => e.parentExamId as string);

    let completedParentIds = new Set<string>();
    if (parentExamIds.length > 0) {
      const parentSessions = await prisma.examSession.findMany({
        where: {
          userId: user.id,
          examId: { in: parentExamIds },
          status: { in: ["COMPLETED", "FORCE_FINISHED"] },
        },
        select: { examId: true },
      });
      completedParentIds = new Set(parentSessions.map((s) => s.examId));
    }

    // Filter out supplementary exams if student already finished the parent exam (unless explicitly assigned as susulan)
    const visibleExams = exams.filter((exam) => {
      if (exam.isSupplementary && exam.parentExamId && completedParentIds.has(exam.parentExamId)) {
        return false;
      }
      return true;
    });

    const formatted = visibleExams.map((exam) => {
      const session = exam.examSessions[0] || null;
      const studentGroupInfo = (exam as any).examGroups?.find((eg: any) => eg.groupId === user.groupId) || (exam as any).examGroups?.[0] || null;
      const effectiveStartTime = studentGroupInfo?.startTime || exam.startTime;
      const effectiveEndTime = studentGroupInfo?.endTime || exam.endTime;

      const totalQuestions = exam.examQuestions.length > 0
        ? exam.examQuestions.length
        : (exam.subject?.questions?.length || 0);

      return {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        description: exam.description,
        subject: exam.subject.name,
        durationMinutes: exam.durationMinutes,
        totalQuestions,
        startTime: exam.startTime,
        endTime: exam.endTime,
        sessionName: studentGroupInfo?.sessionName || null,
        room: studentGroupInfo?.room || (isStudentPkl ? "Online (HP / PKL)" : "Lab Sekolah"),
        effectiveStartTime,
        effectiveEndTime,
        showResult: exam.showResult,
        status: session ? session.status : "NOT_STARTED",
        sessionStatus: session ? session.status : null,
        finishReason: session?.finishReason,
        score: session?.score,
        startedAt: session?.startedAt,
        finishedAt: session?.finishedAt,
        remainingSeconds: session?.remainingSeconds,
        category: exam.category,
        disableAntiCheat: exam.disableAntiCheat,
        isSupplementary: Boolean(exam.isSupplementary),
        isStudentPkl,
        isUserSusulan,
      };
    });

    return NextResponse.json({ exams: formatted });
  } catch (error: any) {
    console.error("Student Exams API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
