import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

    const sourceExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: true,
        examGroups: true,
      },
    });

    if (!sourceExam) {
      return NextResponse.json({ error: "Ujian sumber tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      code,
      description,
      cloneType = "REMEDIAL", // REMEDIAL, SUSULAN, or COPY
      copyQuestions = true,
      copyGroups = true,
      token,
      durationMinutes,
      startTime,
      endTime,
    } = body;

    const newTitle = title?.trim() || `[${cloneType}] ${sourceExam.title}`;

    // Generate unique code if not provided
    let targetCode = code?.trim() || `${sourceExam.code}-${cloneType.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Ensure code is unique in database
    const existing = await prisma.exam.findUnique({ where: { code: targetCode } });
    if (existing) {
      targetCode = `${targetCode}-${Date.now().toString().slice(-4)}`;
    }

    const isSupplementary = cloneType === "SUSULAN" || cloneType === "REMEDIAL";

    const newExam = await prisma.exam.create({
      data: {
        title: newTitle,
        code: targetCode,
        description: description ?? (sourceExam.description ? `${sourceExam.description} (${cloneType})` : `Kloning dari ${sourceExam.title}`),
        subjectId: sourceExam.subjectId,
        createdByUserId: user.id,
        durationMinutes: durationMinutes !== undefined && durationMinutes !== null ? Number(durationMinutes) : sourceExam.durationMinutes,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        token: token ? token.trim().toUpperCase() : (cloneType === "REMEDIAL" ? "REMEDIAL" : cloneType === "SUSULAN" ? "SUSULAN" : sourceExam.token),
        isTokenDynamic: Boolean(sourceExam.isTokenDynamic),
        shuffleQuestions: Boolean(sourceExam.shuffleQuestions),
        shuffleOptions: Boolean(sourceExam.shuffleOptions),
        showResult: Boolean(sourceExam.showResult),
        showAnswerKey: Boolean(sourceExam.showAnswerKey),
        minTimeMinutes: sourceExam.minTimeMinutes,
        maxViolations: sourceExam.maxViolations,
        isPublished: true,
        requireKioskBrowser: Boolean(sourceExam.requireKioskBrowser),
        kioskUserAgentPattern: sourceExam.kioskUserAgentPattern,
        category: sourceExam.category,
        disableAntiCheat: Boolean(sourceExam.disableAntiCheat),
        isSupplementary,
        parentExamId: isSupplementary ? sourceExam.id : null,
        ...(copyGroups && sourceExam.examGroups.length > 0
          ? {
              examGroups: {
                create: sourceExam.examGroups.map((eg) => ({
                  groupId: eg.groupId,
                })),
              },
            }
          : {}),
        ...(copyQuestions && sourceExam.examQuestions.length > 0
          ? {
              examQuestions: {
                create: sourceExam.examQuestions.map((eq) => ({
                  questionId: eq.questionId,
                  orderIndex: eq.orderIndex,
                  score: eq.score,
                })),
              },
            }
          : {}),
      },
      include: {
        subject: true,
        examGroups: { include: { group: true } },
        _count: {
          select: {
            examQuestions: true,
            examSessions: true,
          },
        },
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CLONE_EXAM",
        details: `Kloning ujian "${sourceExam.title}" (${sourceExam.code}) menjadi "${newExam.title}" (${newExam.code}) tipe ${cloneType}`,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Ujian berhasil dikloning sebagai "${newExam.title}"`,
      exam: newExam,
    });
  } catch (error: any) {
    console.error("Error in clone exam route:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengkloning ujian" },
      { status: 500 }
    );
  }
}
