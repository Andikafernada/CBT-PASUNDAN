import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const { violationType, details } = await req.json();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    const session = await prisma.examSession.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: user.id,
        },
      },
    });

    if (!session || !exam) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }

    // 🛡️ EMERGENCY DISABLE / PKL TOLERANCE MODE:
    // If anti-cheat is disabled for this exam, suppress all violations and suspensions!
    if (exam.disableAntiCheat || exam.maxViolations === 0) {
      // Optional: still log violation for teacher analytics without penalizing the student
      prisma.violationLog.create({
        data: {
          sessionId: session.id,
          violationType: violationType || "TAB_SWITCH",
          details: `[TOLERANSI PKL / BEBAS PELANGGARAN] ${details || "Peringatan keluar aplikasi"}`,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        violationCount: 0,
        maxViolations: 0,
        isSuspended: false,
        disabled: true,
        message: "Fitur pelanggaran dinonaktifkan (Mode Bebas Pelanggaran PKL).",
      });
    }

    const newViolationCount = session.violationCount + 1;
    const isSuspended = newViolationCount >= exam.maxViolations;

    // Record violation log
    await prisma.violationLog.create({
      data: {
        sessionId: session.id,
        violationType: violationType || "TAB_SWITCH",
        details: details || "Peringatan keluar aplikasi / tab switch",
      },
    });

    // Update session
    await prisma.examSession.update({
      where: { id: session.id },
      data: {
        violationCount: newViolationCount,
        status: isSuspended ? "SUSPENDED" : session.status,
        finishReason: isSuspended ? "VIOLATION" : session.finishReason,
      },
    });

    return NextResponse.json({
      success: true,
      violationCount: newViolationCount,
      maxViolations: exam.maxViolations,
      isSuspended,
      message: isSuspended 
        ? "Akun Anda telah ditangguhkan karena melampaui batas pelanggaran." 
        : `Peringatan pelanggaran (${newViolationCount}/${exam.maxViolations}).`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
