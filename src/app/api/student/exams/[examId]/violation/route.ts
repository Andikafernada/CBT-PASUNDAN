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
    const updated = await prisma.examSession.update({
      where: { id: session.id },
      data: {
        violationCount: newViolationCount,
        status: isSuspended ? "SUSPENDED" : session.status,
      },
    });

    return NextResponse.json({
      success: true,
      violationCount: newViolationCount,
      maxViolations: exam.maxViolations,
      isSuspended,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
