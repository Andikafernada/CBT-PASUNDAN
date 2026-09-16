import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendSystemAlert } from "@/lib/alert";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Parallel metrics collection
    const [
      activeSessions,
      submittingSessions,
      completedToday,
      totalExamsToday,
      recentViolations,
      totalStudents,
    ] = await Promise.all([
      prisma.examSession.count({ where: { status: "IN_PROGRESS" } }),
      prisma.examSession.count({ where: { status: "SUBMITTING" } }),
      prisma.examSession.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: todayStart },
        },
      }),
      prisma.exam.count({ where: { isPublished: true } }),
      prisma.violationLog.count({
        where: { timestamp: { gte: fifteenMinutesAgo } },
      }),
      prisma.user.count({ where: { role: "STUDENT" } }),
    ]);

    const memUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMb = Math.round(memUsage.rss / 1024 / 1024);
    const osFreeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const osTotalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const osMemPercent = Math.round(((osTotalMemMb - osFreeMemMb) / osTotalMemMb) * 100);

    // Alerting trigger if system is under severe pressure
    if (heapUsedMb > 1500 || osMemPercent > 92) {
      sendSystemAlert({
        title: "Peringatan Beban Memori Server",
        message: `Penggunaan memori server melonjak: Node Heap ${heapUsedMb}MB, OS RAM ${osMemPercent}%`,
        level: "CRITICAL",
        details: { heapUsedMb, rssMb, osMemPercent, activeSessions },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      examActivity: {
        activeInProgress: activeSessions,
        submitting: submittingSessions,
        completedToday,
        activePublishedExams: totalExamsToday,
        recentViolations15m: recentViolations,
        totalRegisteredStudents: totalStudents,
      },
      resources: {
        heapUsedMb,
        rssMb,
        osMemPercent,
        osFreeMemMb,
        osTotalMemMb,
        loadAvg: os.loadavg().map((l) => Math.round(l * 100) / 100),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
