import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { calculateAndFinishSession } from "@/lib/exam-score";

// GET /api/admin/exams/[examId]/force-finish
// Mengembalikan daftar semua siswa beserta statusnya untuk ujian ini
// (Hadir, Tidak Hadir, In Progress, Force Finished, Timeout)
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
        examGroups: { include: { group: { include: { users: { where: { role: "STUDENT" } } } } } },
        examQuestions: true,
      },
    });

    if (!exam) return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });

    const sessions = await prisma.examSession.findMany({
      where: { examId },
      include: {
        user: { select: { id: true, name: true, username: true, nis: true, groupId: true, group: true } },
        answers: { select: { questionId: true } },
      },
    });

    const sessionByUserId = new Map(sessions.map((s) => [s.userId, s]));

    // Kumpulkan semua siswa dari kelas yang ditarget ujian
    const allStudents: any[] = [];
    for (const eg of exam.examGroups) {
      for (const student of eg.group.users) {
        if (!allStudents.find((s) => s.id === student.id)) {
          allStudents.push({ ...student, groupName: eg.group.name });
        }
      }
    }

    const rows = allStudents.map((student) => {
      const session = sessionByUserId.get(student.id);
      let attendanceStatus = "TIDAK_HADIR";
      if (session) {
        if (["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session.status)) {
          attendanceStatus = session.status === "COMPLETED" ? "HADIR" :
            session.status === "FORCE_FINISHED" ? "DIPAKSA_SELESAI" : "WAKTU_HABIS";
        } else {
          attendanceStatus = "SEDANG_MENGERJAKAN";
        }
      }

      return {
        student: {
          id: student.id,
          name: student.name,
          username: student.username,
          nis: student.nis,
          groupName: student.groupName,
        },
        session: session ? {
          id: session.id,
          status: session.status,
          finishReason: session.finishReason,
          score: session.score,
          remainingSeconds: session.remainingSeconds,
          answeredCount: session.answers.length,
          totalQuestions: exam.examQuestions.length,
          startedAt: session.startedAt,
          finishedAt: session.finishedAt,
        } : null,
        attendanceStatus,
      };
    });

    // Siswa yang punya sesi tapi tidak ada di grup (akses langsung via token)
    for (const session of sessions) {
      if (!rows.find((r) => r.student.id === session.userId)) {
        rows.push({
          student: {
            id: session.user.id,
            name: session.user.name,
            username: session.user.username,
            nis: session.user.nis,
            groupName: session.user.group?.name || "-",
          },
          session: {
            id: session.id,
            status: session.status,
            finishReason: session.finishReason,
            score: session.score,
            remainingSeconds: session.remainingSeconds,
            answeredCount: session.answers.length,
            totalQuestions: exam.examQuestions.length,
            startedAt: session.startedAt,
            finishedAt: session.finishedAt,
          },
          attendanceStatus: ["COMPLETED", "FORCE_FINISHED", "TIMEOUT"].includes(session.status)
            ? (session.status === "COMPLETED" ? "HADIR" : session.status === "FORCE_FINISHED" ? "DIPAKSA_SELESAI" : "WAKTU_HABIS")
            : "SEDANG_MENGERJAKAN",
        });
      }
    }

    const summary = {
      total: rows.length,
      hadir: rows.filter((r) => r.attendanceStatus === "HADIR").length,
      sedangMengerjakan: rows.filter((r) => r.attendanceStatus === "SEDANG_MENGERJAKAN").length,
      dipaksaSelesai: rows.filter((r) => r.attendanceStatus === "DIPAKSA_SELESAI").length,
      waktuHabis: rows.filter((r) => r.attendanceStatus === "WAKTU_HABIS").length,
      tidakHadir: rows.filter((r) => r.attendanceStatus === "TIDAK_HADIR").length,
    };

    return NextResponse.json({ exam: { id: exam.id, title: exam.title }, summary, students: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/exams/[examId]/force-finish
// action: FORCE_FINISH_ONE (1 siswa), FORCE_FINISH_ALL (semua IN_PROGRESS), AUTO_TIMEOUT_CHECK
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, sessionId } = await req.json();

    if (action === "FORCE_FINISH_ONE") {
      if (!sessionId) return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });

      const result = await calculateAndFinishSession(sessionId, "FORCE_BY_ADMIN");
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PROCTOR_ACTION",
          details: `Force-finish sesi ${sessionId} oleh ${user.name} (${user.username})`,
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: "Ujian siswa berhasil dihentikan dan nilai dihitung", score: (result as any)?.score });
    }

    if (action === "FORCE_FINISH_ALL") {
      // Force finish semua sesi IN_PROGRESS di ujian ini
      const inProgressSessions = await prisma.examSession.findMany({
        where: { examId, status: "IN_PROGRESS" },
        select: { id: true },
      });

      let finishedCount = 0;
      for (const s of inProgressSessions) {
        await calculateAndFinishSession(s.id, "FORCE_BY_ADMIN");
        finishedCount++;
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PROCTOR_ACTION",
          details: `Force-finish semua (${finishedCount}) sesi ujian ${examId} oleh ${user.name}`,
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: `${finishedCount} sesi ujian berhasil dihentikan dan dinilai`, finishedCount });
    }

    if (action === "AUTO_TIMEOUT_CHECK") {
      // Auto finish sesi yang waktu sudah habis (remainingSeconds <= 0) tapi status masih IN_PROGRESS
      const timedOutSessions = await prisma.examSession.findMany({
        where: { examId, status: "IN_PROGRESS", remainingSeconds: { lte: 0 } },
        select: { id: true },
      });

      let timeoutCount = 0;
      for (const s of timedOutSessions) {
        await calculateAndFinishSession(s.id, "TIMEOUT");
        timeoutCount++;
      }

      return NextResponse.json({ success: true, timeoutCount });
    }

    return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
