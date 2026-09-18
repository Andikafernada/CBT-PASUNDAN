import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperReviewer = user.username === "andikafernanda";

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

    // 🌟 SUPER REVIEWER: If user is andikafernanda, see ALL published exams across all classes
    const examWhereClause = isSuperReviewer
      ? { isPublished: true }
      : {
          isPublished: true,
          category: targetCategory,
          ...groupFilter,
        };

    const exams = await prisma.exam.findMany({
      where: examWhereClause,
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
    if (parentExamIds.length > 0 && !isSuperReviewer) {
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

    // Filter out supplementary exams if student already finished parent exam
    const visibleExams = exams.filter((exam) => {
      if (!isSuperReviewer && exam.isSupplementary && exam.parentExamId && completedParentIds.has(exam.parentExamId)) {
        return false;
      }
      return true;
    });

    const formatted = visibleExams.map((exam) => {
      const session = exam.examSessions[0] || null;

      const questionCount =
        exam.examQuestions.length > 0
          ? exam.examQuestions.length
          : (exam.subject?.questions?.length || 0);

      // Detect Grade Level (Kelas X, XI, XII)
      const titleSearch = `${exam.title} ${exam.subject?.name || ""}`.toLowerCase();
      let gradeLevel = "LAINNYA";
      if (/kelas\s*(?:10|x\b)|-\s*kelas\s*x\b/i.test(titleSearch)) {
        gradeLevel = "X";
      } else if (/kelas\s*(?:11|xi\b)|-\s*kelas\s*xi\b/i.test(titleSearch)) {
        gradeLevel = "XI";
      } else if (/kelas\s*(?:12|xii\b)|-\s*kelas\s*xii\b/i.test(titleSearch)) {
        gradeLevel = "XII";
      }

      // Sesi rombel info (jika ada)
      const groupInfo = Array.isArray(exam.examGroups) && exam.examGroups.length > 0 ? exam.examGroups[0] : null;

      return {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        description: exam.description,
        subject: exam.subject ? { id: exam.subject.id, name: exam.subject.name, code: exam.subject.code } : null,
        durationMinutes: exam.durationMinutes,
        questionCount,
        category: exam.category,
        isSupplementary: exam.isSupplementary,
        gradeLevel,
        // Auto-hint token for super reviewer
        token: isSuperReviewer ? exam.token : undefined,
        sessionName: groupInfo?.sessionName || null,
        room: groupInfo?.room || null,
        effectiveStartTime: groupInfo?.startTime || exam.startTime || null,
        effectiveEndTime: groupInfo?.endTime || exam.endTime || null,
        session: session
          ? {
              id: session.id,
              status: session.status,
              score: session.score,
              startedAt: session.startedAt,
              finishedAt: session.finishedAt,
              remainingSeconds: session.remainingSeconds,
              violationCount: session.violationCount,
              finishReason: session.finishReason,
            }
          : null,
      };
    });

    return NextResponse.json({
      exams: formatted,
      isSuperReviewer,
    });
  } catch (error: any) {
    console.error("Error fetching student exams:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
