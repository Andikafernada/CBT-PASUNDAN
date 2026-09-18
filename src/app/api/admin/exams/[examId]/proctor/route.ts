import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { getSessionUser } from "@/lib/auth";

import { getDynamicToken, getDynamicTokenSecondsRemaining } from "@/lib/token";

import { calculateAndFinishSession } from "@/lib/exam-score";

import { invalidateExamCache } from "@/lib/exam-cache";



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

        examGroups: true,

        examQuestions: {

          include: { question: true },

        },

      },

    });



    if (!exam) {

      return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });

    }



    const sessions = await prisma.examSession.findMany({

      where: { examId },

      include: {

        user: {

          select: {

            id: true,

            name: true,

            username: true,

            nis: true,

            group: true,

          },

        },

        answers: {

          select: {

            questionId: true,

            isDoubtful: true,

            isCorrect: true,

            scoreAwarded: true,

          },

        },

        violationLogs: {

          orderBy: { timestamp: "desc" },

          take: 5,

        },

      },

      orderBy: { startedAt: "desc" },

    });



    const formattedSessions = sessions.map((s) => {

      const answeredCount = s.answers.length;

      const doubtfulCount = s.answers.filter((a) => a.isDoubtful).length;

      const groupSchedule = exam.examGroups?.find((eg: any) => eg.groupId === s.user.group?.id);

      const room = groupSchedule?.room || null;

      const sessionName = groupSchedule?.sessionName || null;



      return {

        id: s.id,

        user: s.user,

        status: s.status,
        track: (Boolean((s.user as any).bypassExambro || s.user.group?.isPkl || (s.user.group as any)?.bypassExambro || /pkl|dudi|magang/i.test(s.user.group?.name || "") || /pkl|dudi|magang/i.test(s.user.group?.code || "")) ? "PKL" : Boolean((s.user as any).bypassExambro) ? "SUSULAN" : "REGULER"),
        isPkl: Boolean((s.user as any).bypassExambro || s.user.group?.isPkl || (s.user.group as any)?.bypassExambro || /pkl|dudi|magang/i.test(s.user.group?.name || "") || /pkl|dudi|magang/i.test(s.user.group?.code || "")),
        isSusulan: Boolean((s.user as any).bypassExambro && !(s.user.group?.isPkl || /pkl|dudi|magang/i.test(s.user.group?.name || ""))),

        startedAt: s.startedAt,

        finishedAt: s.finishedAt,

        remainingSeconds: s.remainingSeconds,

        score: s.score,

        violationCount: s.violationCount,

        ipAddress: s.ipAddress,

        userAgent: s.userAgent,

        answeredCount,

        doubtfulCount,

        totalQuestions: exam.examQuestions.length,

        progressPercent:

          exam.examQuestions.length > 0

            ? Math.round((answeredCount / exam.examQuestions.length) * 100)

            : 0,

        recentViolations: s.violationLogs,

        room,

        sessionName,

        isLoginLocked: Boolean((s.user as any).isLoginLocked),

      };

    });



    const roomsList = Array.from(new Set(

      (exam.examGroups || []).map((eg: any) => eg.room).filter(Boolean)

    ));

    const sessionsList = Array.from(new Set(

      (exam.examGroups || []).map((eg: any) => eg.sessionName).filter(Boolean)

    ));



    const activeToken = exam.isTokenDynamic ? getDynamicToken(exam.id) : exam.token;

    const tokenSecondsLeft = exam.isTokenDynamic ? getDynamicTokenSecondsRemaining() : null;



    return NextResponse.json({

      exam: {

        id: exam.id,

        title: exam.title,

        code: exam.code,

        token: activeToken,

        staticToken: exam.token,

        isTokenDynamic: exam.isTokenDynamic,

        tokenSecondsLeft,

        durationMinutes: exam.durationMinutes,

        totalQuestions: exam.examQuestions.length,

        category: exam.category || "REGULER",

        disableAntiCheat: Boolean(exam.disableAntiCheat),

        maxViolations: exam.maxViolations,

      },

      sessions: formattedSessions,

      roomsList,

      sessionsList,

    });

  } catch (error: any) {

    return NextResponse.json({ error: error.message }, { status: 500 });

  }

}



// Action: reset, force_finish, add_time, unlock, reset_login, toggle_dynamic_token, regenerate_token, toggle_anti_cheat

export async function POST(

  req: NextRequest,

  { params }: { params: Promise<{ examId: string }> }

) {

  try {

    const { examId } = await params;

    const body = await req.json();

    const { action, sessionId, additionalMinutes, isDynamic, sessionIds, disableAntiCheat } = body;

    const user = await getSessionUser();



    if (!user || user.role === "STUDENT") {

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    }



    if (action === "TOGGLE_ANTI_CHEAT") {

      const shouldDisable = Boolean(disableAntiCheat);

      const updated = await prisma.exam.update({

        where: { id: examId },

        data: { disableAntiCheat: shouldDisable },

      });



      // Invalidate Redis cache so student sessions get the updated flag immediately

      await invalidateExamCache(examId);



      // If anti-cheat is being disabled (Emergency Mode), auto-unlock all currently suspended students!

      let unlockedCount = 0;

      if (shouldDisable) {

        const unlockRes = await prisma.examSession.updateMany({

          where: { examId, status: "SUSPENDED" },

          data: { status: "IN_PROGRESS", violationCount: 0 },

        });

        unlockedCount = unlockRes.count;

      }



      await prisma.auditLog.create({

        data: {

          userId: user.id,

          action: "TOGGLE_ANTI_CHEAT",

          details: `Proktor ${user.name} mengubah status anti-cheat ujian ${examId} menjadi: ${shouldDisable ? "NONAKTIF (Mode Bebas Pelanggaran PKL)" : "AKTIF"}. ${unlockedCount} siswa otomatis dibuka kuncinya.`,

        },

      }).catch(() => {});



      return NextResponse.json({

        success: true,

        disableAntiCheat: updated.disableAntiCheat,

        unlockedCount,

        message: shouldDisable

          ? `Fitur pelanggaran dinonaktifkan (Mode Bebas Pelanggaran PKL). ${unlockedCount > 0 ? `${unlockedCount} siswa yang terkunci telah dibuka otomatis.` : ''}`

          : "Fitur pelanggaran (Anti-Cheat) telah diaktifkan kembali.",

      });

    }



    if (action === "TOGGLE_DYNAMIC_TOKEN") {

      await prisma.exam.update({

        where: { id: examId },

        data: { isTokenDynamic: !!isDynamic },

      });

      return NextResponse.json({

        success: true,

        message: isDynamic

          ? "Token Dinamis 15-Menit Aktif"

          : "Token Statis Aktif",

      });

    }



    if (action === "REGENERATE_TOKEN") {

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      let newToken = "";

      for (let i = 0; i < 6; i++) {

        newToken += chars.charAt(Math.floor(Math.random() * chars.length));

      }

      await prisma.exam.update({

        where: { id: examId },

        data: { token: newToken },

      });

      return NextResponse.json({ success: true, message: `Token berhasil diperbarui: ${newToken}`, newToken });

    }



    if (action === "RESET") {

      // Delete session so student can start fresh

      await prisma.examSession.delete({

        where: { id: sessionId },

      });

      return NextResponse.json({ success: true, message: "Sesi ujian peserta berhasil direset" });

    }



    if (action === "UNLOCK") {

      // Unfreeze suspended student

      await prisma.examSession.update({

        where: { id: sessionId },

        data: { status: "IN_PROGRESS", violationCount: 0 },

      });

      return NextResponse.json({ success: true, message: "Sesi peserta berhasil diaktifkan kembali" });

    }

    if (action === "RESET_VIOLATIONS") {
      await prisma.examSession.update({
        where: { id: sessionId },
        data: { violationCount: 0 },
      });
      return NextResponse.json({ success: true, message: "Hitungan pelanggaran peserta berhasil direset ke 0" });
    }



    if (action === "FORCE_FINISH") {

      const result = await calculateAndFinishSession(sessionId, "PROCTOR_FORCE");

      const finalScore = result?.score ?? 0;

      return NextResponse.json({

        success: true,

        message: `Ujian peserta berhasil dihentikan paksa. Nilai akhir: ${finalScore}`,

        score: finalScore,

      });

    }



    if (action === "ADD_TIME") {
      const extraSeconds = (Number(additionalMinutes) || 10) * 60;
      const sess = await prisma.examSession.findUnique({ where: { id: sessionId } });
      if (sess) {
        // 🔒 Shifting startedAt forward by extraSeconds ensures all dynamic elapsed time calculations
        // (in /status, /save-answer, /save-answer-bulk, /start) naturally retain the extra granted time!
        const originalStart = sess.startedAt ? new Date(sess.startedAt).getTime() : Date.now();
        const adjustedStart = new Date(originalStart + extraSeconds * 1000);
        await prisma.examSession.update({
          where: { id: sessionId },
          data: {
            startedAt: adjustedStart,
            remainingSeconds: sess.remainingSeconds + extraSeconds,
          },
        });
      }
      return NextResponse.json({ success: true, message: `Waktu berhasil ditambahkan ${additionalMinutes || 10} menit` });
    }



    if (action === "RESET_ALL_LOGINS" || action === "RESET_LOGIN_BULK") {

      const { sessionIds } = body;

      let targetUserIds: string[] = [];



      if (Array.isArray(sessionIds) && sessionIds.length > 0) {

        const targetSessions = await prisma.examSession.findMany({

          where: { id: { in: sessionIds } },

          select: { userId: true },

        });

        targetUserIds = targetSessions.map((s) => s.userId);

      } else {

        const allSessions = await prisma.examSession.findMany({

          where: { examId },

          select: { userId: true },

        });

        targetUserIds = allSessions.map((s) => s.userId);

      }



      const res = await prisma.user.updateMany({

        where: { id: { in: targetUserIds } },

        data: { deviceFingerprint: null, isLoginLocked: false },

      });



      await prisma.auditLog.create({

        data: {

          userId: user.id,

          action: "RESET_LOGIN_BULK",

          details: `Proktor ${user.name} mereset kunci login massal ${res.count} siswa pada ujian ${examId}`,

        },

      }).catch(() => {});



      return NextResponse.json({

        success: true,

        count: res.count,

        message: `Kunci login ${res.count} siswa berhasil direset. Siswa dapat login kembali sekarang.`,

      });

    }



    if (action === "RESET_LOGIN") {

      const sess = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { user: true } });

      if (sess?.user) {

        await prisma.user.update({

          where: { id: sess.user.id },

          data: { deviceFingerprint: null, isLoginLocked: false },

        });



        await prisma.auditLog.create({

          data: {

            userId: user.id,

            action: "RESET_LOGIN",

            details: `Proktor ${user.name} mereset kunci login siswa ${sess.user.name} (${sess.user.username})`,

          },

        }).catch(() => {});

      }

      return NextResponse.json({ success: true, message: "Kunci login perangkat siswa berhasil direset. Siswa dapat login di perangkat baru." });

    }



    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });

  } catch (error: any) {

    return NextResponse.json({ error: error.message }, { status: 500 });

  }

}

