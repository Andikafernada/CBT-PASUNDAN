import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Unauthorized. Hak akses Admin atau Operator diperlukan." }, { status: 401 });
    }

    const body = await req.json();
    const { userIds, groupId, examId, scope } = body;

    let targetUserIds: string[] = [];

    if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else if (groupId) {
      const students = await prisma.user.findMany({
        where: { groupId, role: "STUDENT" },
        select: { id: true },
      });
      targetUserIds = students.map((s) => s.id);
    } else if (examId) {
      const sessions = await prisma.examSession.findMany({
        where: { examId },
        select: { userId: true },
      });
      targetUserIds = sessions.map((s) => s.userId);
    } else if (scope === "ALL_LOCKED" || scope === "ALL") {
      const lockedStudents = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          OR: [
            { deviceFingerprint: { not: null } },
            { isLoginLocked: true },
          ],
        },
        select: { id: true },
      });
      targetUserIds = lockedStudents.map((s) => s.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "Tidak ada siswa yang perlu di-reset perangkatnya.",
      });
    }

    const result = await prisma.user.updateMany({
      where: {
        id: { in: targetUserIds },
      },
      data: {
        deviceFingerprint: null,
        isLoginLocked: false,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RESET_LOGIN_BULK",
        details: `Reset massal ${result.count} perangkat siswa oleh ${user.username} (${user.role})`,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Berhasil mereset login & perangkat ${result.count} siswa. Siswa dapat login kembali sekarang.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal melakukan reset massal perangkat" }, { status: 500 });
  }
}
