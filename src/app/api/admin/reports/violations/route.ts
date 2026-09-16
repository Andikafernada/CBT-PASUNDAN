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
    const examId = searchParams.get("examId");
    const groupId = searchParams.get("groupId");

    // Fetch exams for filter dropdown
    const exams = await prisma.exam.findMany({
      select: { id: true, title: true, code: true, maxViolations: true },
      orderBy: { createdAt: "desc" },
    });

    // Fetch groups for filter dropdown
    const groups = await prisma.group.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });

    const activeExamId = examId || (exams.length > 0 ? exams[0].id : null);

    if (!activeExamId) {
      return NextResponse.json({ exams, groups, violations: [] });
    }

    const whereClause: any = {
      examId: activeExamId,
      violationCount: { gt: 0 },
    };

    if (groupId && groupId !== "ALL") {
      whereClause.user = { groupId };
    }

    // Query sessions that have recorded violations
    const sessions = await prisma.examSession.findMany({
      where: whereClause,
      include: {
        user: {
          include: { group: true },
        },
        violationLogs: {
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: [
        { violationCount: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Format violation report for Wali Kelas / BK
    const reportData = sessions.map((s, idx) => {
      // Determine device category
      const isMobile = s.userAgent && /Android|iPhone|Mobile/i.test(s.userAgent);
      const isLab = s.ipAddress && (s.ipAddress.startsWith("172.16.") || s.ipAddress.startsWith("192.168."));
      const deviceType = isMobile ? "📱 Smartphone (PKL / Daring)" : "💻 PC Desktop (Lab Komputer)";

      return {
        number: idx + 1,
        sessionId: s.id,
        studentName: s.user.name,
        username: s.user.username,
        nis: s.user.nis || "-",
        groupName: s.user.group?.name || "Reguler",
        groupId: s.user.groupId,
        deviceType,
        ipAddress: s.ipAddress || "127.0.0.1",
        violationCount: s.violationCount,
        status: s.status, // IN_PROGRESS, SUSPENDED, COMPLETED, etc.
        finishReason: s.finishReason,
        logs: s.violationLogs.map((log) => ({
          time: log.timestamp,
          type: log.violationType,
          details: log.details,
        })),
      };
    });

    return NextResponse.json({
      exams,
      groups,
      activeExamId,
      totalViolatingStudents: reportData.length,
      violations: reportData,
    });
  } catch (error: any) {
    console.error("Violation Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
