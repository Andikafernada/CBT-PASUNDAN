import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getDynamicToken, getDynamicTokenSecondsRemaining } from "@/lib/token";
import { calculateAndFinishSession } from "@/lib/exam-score";

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
      return {
        id: s.id,
        user: s.user,
        status: s.status,
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
      };
    });

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
      },
      sessions: formattedSessions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Action: reset, force_finish, add_time, unlock, reset_login, toggle_dynamic_token, regenerate_token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { action, sessionId, additionalMinutes, isDynamic } = await req.json();
    const user = await getSessionUser();

    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        await prisma.examSession.update({
          where: { id: sessionId },
          data: { remainingSeconds: sess.remainingSeconds + extraSeconds },
        });
      }
      return NextResponse.json({ success: true, message: `Waktu berhasil ditambahkan ${additionalMinutes || 10} menit` });
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
