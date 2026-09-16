import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisClient, isRedisAvailable } from "@/lib/redis";
import { getSessionUser } from "@/lib/auth";
import { getDynamicToken, getDynamicTokenSecondsRemaining } from "@/lib/token";
import { calculateAndFinishSession } from "@/lib/exam-score";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const isStaff = user && (user.role === "ADMIN" || user.role === "OPERATOR");

    const { searchParams } = new URL(req.url);
    const selectedExamId = searchParams.get("examId");

    // 1. Fetch available exams today or active exams
    const exams = await prisma.exam.findMany({
      where: { isPublished: true },
      include: {
        subject: true,
        examGroups: true,
        _count: { select: { examSessions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    let activeExam = null;
    if (selectedExamId) {
      activeExam = exams.find((e) => e.id === selectedExamId) || null;
    }
    if (!activeExam && exams.length > 0) {
      activeExam = exams[0];
    }

    // 2. Fetch Sessions for the active exam
    let sessions: any[] = [];
    if (activeExam) {
      sessions = await prisma.examSession.findMany({
        where: { examId: activeExam.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              nis: true,
              isLoginLocked: true,
              deviceFingerprint: true,
              lastLoginAt: true,
              group: { select: { id: true, name: true, code: true } },
            },
          },
          _count: { select: { answers: true } },
        },
        orderBy: [{ user: { name: "asc" } }],
      });
    }

    // 3. Cluster Sessions into 7 Labs (40 PCs each = 280 PCs total)
    const labBuckets: Record<number, any[]> = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: []
    };

    sessions.forEach((s, idx) => {
      const groupName = s.user?.group?.name?.toUpperCase() || "";
      const groupCode = s.user?.group?.code?.toUpperCase() || "";
      let labNum = 0;

      // 1. Prioritas utama: Cek konfigurasi Ruang Lab pada Jadwal Sesi Ujian (Ide 4)
      const groupSchedule = activeExam?.examGroups?.find((eg: any) => eg.groupId === s.user?.group?.id);
      if (groupSchedule?.room) {
        const match = groupSchedule.room.match(/\d+/);
        if (match) {
          const parsed = parseInt(match[0], 10);
          if (parsed >= 1 && parsed <= 7) {
            labNum = parsed;
          }
        }
      }

      // 2. Fallback: Nama rombel mengandung teks LAB X
      if (labNum === 0) {
        for (let i = 1; i <= 7; i++) {
          if (groupName.includes(`LAB ${i}`) || groupName.includes(`LAB${i}`) || groupCode.includes(`L${i}`)) {
            labNum = i;
            break;
          }
        }
      }

      if (labNum === 0) {
        labNum = (Math.floor(idx / 40) % 7) + 1;
      }

      labBuckets[labNum].push({
        ...s,
        seatNumber: (labBuckets[labNum].length + 1).toString().padStart(2, "0"),
      });
    });

    const now = Date.now();
    const durationMinutes = activeExam?.durationMinutes || 60;
    const durationMs = durationMinutes * 60 * 1000;

    // 4. Calculate per-lab metrics
    const labsData = [];
    for (let labId = 1; labId <= 7; labId++) {
      const labStudents = labBuckets[labId] || [];
      const capacity = 40;
      const connectedCount = labStudents.length;
      const inProgressCount = labStudents.filter((s) => s.status === "IN_PROGRESS").length;
      const completedCount = labStudents.filter((s) => ["COMPLETED", "TIMEOUT", "FORCE_FINISHED"].includes(s.status)).length;
      const lockedCount = labStudents.filter((s) => s.user?.isLoginLocked || s.status === "SUSPENDED" || (s.violationCount || 0) >= 3).length;

      const zombies = labStudents.filter((s) => {
        if (s.status !== "IN_PROGRESS") return false;
        const startedTime = new Date(s.startedAt).getTime();
        return now - startedTime > durationMs + 5 * 60 * 1000;
      });

      const scores = labStudents
        .filter((s) => s.score !== null && s.score !== undefined && ["COMPLETED", "TIMEOUT", "FORCE_FINISHED"].includes(s.status))
        .map((s) => s.score);
      const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "-";

      labsData.push({
        labId,
        labName: `LAB KOMPUTER ${labId.toString().padStart(2, "0")}`,
        capacity,
        connectedCount,
        occupancyPercent: Math.min(100, Math.round((connectedCount / capacity) * 100)),
        inProgressCount,
        completedCount,
        lockedCount,
        zombieCount: zombies.length,
        avgScore,
        status: lockedCount > 0 || zombies.length > 0 ? "WARNING" : connectedCount > 0 ? "ACTIVE" : "IDLE",
        // Only provide individual student records if authenticated as staff
        students: isStaff
          ? labStudents.map((s) => ({
              sessionId: s.id,
              userId: s.user?.id || s.userId || "",
              name: s.user?.name || "Siswa",
              username: s.user?.username || "-",
              nis: s.user?.nis || "-",
              seatNumber: s.seatNumber,
              groupName: s.user?.group?.name || "-",
              status: s.status,
              score: s.score,
              remainingSeconds: s.remainingSeconds,
              violationCount: s.violationCount,
              isLocked: Boolean(s.user?.isLoginLocked),
              isZombie: zombies.some((z) => z.id === s.id),
              answersCount: s._count?.answers || 0,
            }))
          : [],
      });
    }

    // 5. System Telemetry
    const memUsage = process.memoryUsage();
    const osFreeMem = os.freemem();
    const osTotalMem = os.totalmem();
    const osMemPercent = Math.round(((osTotalMem - osFreeMem) / osTotalMem) * 100);
    const cpuLoads = os.loadavg();

    let redisHealthy = false;
    if (redisClient && isRedisAvailable) {
      try {
        const ping = await redisClient.ping();
        redisHealthy = ping === "PONG";
      } catch {
        redisHealthy = false;
      }
    }

    // 6. Token Info
    let currentToken = activeExam?.token || "ZYACBT";
    let tokenRemainingSec = 0;
    if (activeExam?.isTokenDynamic) {
      currentToken = getDynamicToken(activeExam.id);
      tokenRemainingSec = getDynamicTokenSecondsRemaining();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      activeExam: activeExam
        ? {
            id: activeExam.id,
            title: activeExam.title,
            code: activeExam.code,
            subjectName: activeExam.subject?.name || "-",
            durationMinutes: activeExam.durationMinutes,
            isTokenDynamic: activeExam.isTokenDynamic,
            token: currentToken,
            tokenRemainingSeconds: tokenRemainingSec,
          }
        : null,
      examsList: isStaff
        ? exams.map((e) => ({
            id: e.id,
            title: e.title,
            subjectName: e.subject?.name || "-",
            totalSessions: e._count.examSessions,
          }))
        : [],
      summary: {
        totalLabs: 7,
        totalCapacity: 280,
        totalConnected: sessions.length,
        totalInProgress: sessions.filter((s) => s.status === "IN_PROGRESS").length,
        totalCompleted: sessions.filter((s) => ["COMPLETED", "TIMEOUT", "FORCE_FINISHED"].includes(s.status)).length,
        totalLocked: sessions.filter((s) => s.user?.isLoginLocked || s.status === "SUSPENDED").length,
        totalZombies: labsData.reduce((acc, l) => acc + l.zombieCount, 0),
      },
      labs: labsData,
      telemetry: {
        serverTimeWIB: (() => {
          try { return new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }); }
          catch { return new Date().toISOString().substring(11, 19); }
        })(),
        serverDateWIB: (() => {
          try { return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "full" }); }
          catch { return new Date().toISOString().substring(0, 10); }
        })(),
        osRamPercent: isStaff ? osMemPercent : 0,
        osRamUsedMb: isStaff ? Math.round((osTotalMem - osFreeMem) / 1024 / 1024) : 0,
        osRamTotalMb: isStaff ? Math.round(osTotalMem / 1024 / 1024) : 0,
        nodeHeapMb: isStaff ? Math.round(memUsage.heapUsed / 1024 / 1024) : 0,
        cpuLoad1m: isStaff ? Math.round(cpuLoads[0] * 100) / 100 : 0,
        redisStatus: redisHealthy ? "HEALTHY" : "DOWN",
        dbStatus: "HEALTHY",
      },
    });
  } catch (error: any) {
    console.error("Command Center GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to load command center" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, examId, labId, message, userIds } = body;

    // 1. RESET_LAB_LOGINS (Enhanced: Device Fingerprint + Session Suspended + Violation Counter + Redis Cache)
    if (action === "RESET_LAB_LOGINS" || action === "UNLOCK_STUDENT") {
      let targetUserIds: string[] = userIds || [];

      if ((!targetUserIds || targetUserIds.length === 0) && examId) {
        const sessions = await prisma.examSession.findMany({
          where: { examId },
          select: { userId: true },
        });
        targetUserIds = sessions.map((s) => s.userId);
      }

      if (targetUserIds.length > 0) {
        // 1. Reset user device lock and fingerprint
        await prisma.user.updateMany({
          where: { id: { in: targetUserIds } },
          data: {
            isLoginLocked: false,
            deviceFingerprint: null,
          },
        });

        // 2. Unfreeze suspended sessions & reset violationCount to 0
        const sessionFilter: any = {
          userId: { in: targetUserIds },
          status: { in: ["SUSPENDED", "IN_PROGRESS"] },
        };
        if (examId && examId !== "ALL") {
          sessionFilter.examId = examId;
        }

        await prisma.examSession.updateMany({
          where: sessionFilter,
          data: {
            status: "IN_PROGRESS",
            violationCount: 0,
          },
        });

        // 3. Purge Redis session locks if available
        if (redisClient && isRedisAvailable) {
          for (const uid of targetUserIds) {
            try {
              await redisClient.del(`lock:login:${uid}`);
              await redisClient.del(`session:user:${uid}`);
              if (examId) {
                await redisClient.del(`exam:session:${examId}:${uid}`);
              }
            } catch {}
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil membuka kunci login, sidik jari perangkat, dan pelanggaran untuk ${targetUserIds.length} siswa di ${labId ? `LAB ${labId}` : "seluruh Lab"}.`,
      });
    }

    // 2. BROADCAST_LAB
    if (action === "BROADCAST_LAB") {
      if (!message || !message.trim()) {
        return NextResponse.json({ error: "Pesan broadcast tidak boleh kosong" }, { status: 400 });
      }

      const broadcastData = {
        id: `broadcast-${Date.now()}`,
        examId: examId || "ALL",
        labId: labId || "ALL",
        message: message.trim(),
        sender: user.name || "Super User / Proktor Utama",
        createdAt: new Date().toISOString(),
      };

      if (redisClient && isRedisAvailable) {
        const cacheKey = examId ? `broadcast:exam:${examId}` : "broadcast:global";
        await redisClient.set(cacheKey, JSON.stringify(broadcastData), "EX", 1800); // 30 min
      }

      return NextResponse.json({
        success: true,
        message: `Pengumuman berhasil di-broadcast ke ${labId ? `LAB ${labId}` : "semua 7 Lab Komputer"}.`,
        broadcast: broadcastData,
      });
    }

    // 3. FORCE_FINISH_LAB
    if (action === "FORCE_FINISH_LAB") {
      if (!examId) {
        return NextResponse.json({ error: "Exam ID diperlukan" }, { status: 400 });
      }

      let sessionQuery: any = {
        examId,
        status: "IN_PROGRESS",
      };

      if (userIds && userIds.length > 0) {
        sessionQuery.userId = { in: userIds };
      }

      const activeSessions = await prisma.examSession.findMany({
        where: sessionQuery,
        select: { id: true },
      });

      let finishedCount = 0;
      for (const s of activeSessions) {
        await calculateAndFinishSession(s.id, "FORCE_BY_ADMIN");
        finishedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil menyelesaikan ujian secara massal untuk ${finishedCount} siswa di ${labId ? `LAB ${labId}` : "Lab"}.`,
      });
    }

    // 4. AUTO_HEAL_ZOMBIES
    if (action === "AUTO_HEAL_ZOMBIES") {
      const activeExams = await prisma.exam.findMany({
        where: { isPublished: true },
        select: { id: true, durationMinutes: true },
      });

      let totalHealed = 0;
      const now = Date.now();

      for (const exam of activeExams) {
        const limitMs = (exam.durationMinutes + 5) * 60 * 1000;
        const expiredSessions = await prisma.examSession.findMany({
          where: {
            examId: exam.id,
            status: "IN_PROGRESS",
          },
        });

        for (const s of expiredSessions) {
          const startedTime = new Date(s.startedAt).getTime();
          if (now - startedTime > limitMs) {
            await calculateAndFinishSession(s.id, "TIMEOUT");
            totalHealed++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: totalHealed > 0
          ? `Auto-Healer berhasil menutup dan menghitung nilai ${totalHealed} sesi gantung (zombie).`
          : "Sistem bersih: Tidak ditemukan sesi gantung / zombie session.",
        healedCount: totalHealed,
      });
    }

        // 5. TRIGGER_BACKUP
    if (action === "TRIGGER_BACKUP") {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execPromise = promisify(exec);

      try {
        const { stdout } = await execPromise("/usr/local/bin/backup-cbt-db.sh");
        return NextResponse.json({
          success: true,
          message: "Backup database berhasil dibuat dan diamankan di server (/var/backups/cbt-database).",
          output: stdout,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Gagal menjalankan backup: ${err.message}`,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("Command Center POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute action" }, { status: 500 });
  }
}
