import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || "ALL";
    const riskFilter = searchParams.get("risk") || "ALL"; // ALL, HIGH, MEDIUM, LOW
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    // Fetch groups for filter dropdown
    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });

    // Build user filter
    const userWhere: any = {
      role: "STUDENT",
    };

    if (groupId !== "ALL") {
      userWhere.groupId = groupId;
    }

    if (search) {
      userWhere.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { nis: { contains: search } },
      ];
    }

    // Fetch students with all exam sessions, violations, reflections, and exams
    const students = await prisma.user.findMany({
      where: userWhere,
      include: {
        group: { select: { id: true, name: true, code: true } },
        examSessions: {
          include: {
            exam: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
            violationLogs: {
              orderBy: { timestamp: "asc" },
            },
            reflection: true,
          },
          orderBy: { startedAt: "asc" },
        },
      },
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
    });

    // Process and aggregate compliance metrics per student
    const studentReports = students.map((student) => {
      let totalViolations = 0;
      let totalLateCount = 0;
      let totalSupplementaryCount = 0;
      let totalCompleted = 0;

      const subjectBreakdowns = student.examSessions.map((session) => {
        const exam = session.exam;
        totalViolations += session.violationCount || session.violationLogs.length || 0;

        if (session.status === "COMPLETED") {
          totalCompleted += 1;
        }

        // Time Compliance Calculation
        let timeStatus: "ON_TIME" | "LATE" | "SUPPLEMENTARY" | "UNKNOWN" = "ON_TIME";
        let lateMinutes = 0;
        let dayDifference = 0;

        if (exam.startTime && session.startedAt) {
          const scheduled = new Date(exam.startTime);
          const actual = new Date(session.startedAt);

          const scheduledDateStr = scheduled.toISOString().split("T")[0];
          const actualDateStr = actual.toISOString().split("T")[0];

          if (scheduledDateStr !== actualDateStr) {
            timeStatus = "SUPPLEMENTARY";
            dayDifference = Math.round(
              (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)
            );
            totalSupplementaryCount += 1;
          } else {
            const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60);
            if (diffMinutes > 15) {
              timeStatus = "LATE";
              lateMinutes = Math.round(diffMinutes);
              totalLateCount += 1;
            } else {
              timeStatus = "ON_TIME";
            }
          }
        }

        return {
          sessionId: session.id,
          examId: exam.id,
          examTitle: exam.title,
          subjectName: exam.subject?.name || "Mata Pelajaran",
          subjectCode: exam.subject?.code || "-",
          status: session.status,
          score: session.score,
          scheduledStart: exam.startTime,
          scheduledEnd: exam.endTime,
          actualStart: session.startedAt,
          actualFinish: session.finishedAt,
          timeStatus,
          lateMinutes,
          dayDifference,
          violationCount: session.violationCount || session.violationLogs.length || 0,
          violations: session.violationLogs.map((v) => ({
            id: v.id,
            type: v.violationType,
            details: v.details,
            timestamp: v.timestamp,
          })),
          reflection: session.reflection
            ? {
                physicalState: session.reflection.physicalState,
                readinessRate: session.reflection.readinessRate,
                honestyPledge: session.reflection.honestyPledge,
                notes: session.reflection.notes,
              }
            : null,
        };
      });

      // Determine Student Risk Level
      let riskLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (totalViolations >= 5 || totalLateCount >= 2 || totalSupplementaryCount >= 2) {
        riskLevel = "HIGH";
      } else if (totalViolations >= 1 || totalLateCount >= 1 || totalSupplementaryCount >= 1) {
        riskLevel = "MEDIUM";
      }

      return {
        id: student.id,
        username: student.username,
        name: student.name,
        nis: student.nis || student.username,
        groupName: student.group?.name || "Reguler",
        groupId: student.groupId,
        totalExamsTaken: student.examSessions.length,
        totalCompleted,
        totalViolations,
        totalLateCount,
        totalSupplementaryCount,
        riskLevel,
        subjectBreakdowns,
      };
    });

    // Filter by Risk Level if specified
    const filteredReports = studentReports.filter((s) => {
      if (riskFilter === "ALL") return true;
      return s.riskLevel === riskFilter;
    });

    // Summary Statistics across entire school/cohort
    const stats = {
      totalStudents: studentReports.length,
      lowRiskCount: studentReports.filter((s) => s.riskLevel === "LOW").length,
      mediumRiskCount: studentReports.filter((s) => s.riskLevel === "MEDIUM").length,
      highRiskCount: studentReports.filter((s) => s.riskLevel === "HIGH").length,
      totalViolationsInSchool: studentReports.reduce((acc, s) => acc + s.totalViolations, 0),
      totalLateLoginsInSchool: studentReports.reduce((acc, s) => acc + s.totalLateCount, 0),
      totalSupplementaryInSchool: studentReports.reduce((acc, s) => acc + s.totalSupplementaryCount, 0),
    };

    return NextResponse.json({
      success: true,
      stats,
      groups,
      students: filteredReports,
    });
  } catch (error: any) {
    console.error("Student Compliance Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
