import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exams = await prisma.exam.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      code,
      description,
      subjectId,
      durationMinutes,
      startTime,
      endTime,
      token,
      isTokenDynamic,
      shuffleQuestions,
      shuffleOptions,
      showResult,
      showAnswerKey,
      minTimeMinutes,
      maxViolations,
      isPublished,
      requireKioskBrowser,
      groupIds,
      questionIds,
    } = body;

    if (!title || !code || !subjectId) {
      return NextResponse.json(
        { error: "Judul, kode ujian, dan mata pelajaran wajib diisi" },
        { status: 400 }
      );
    }

    let finalQuestionIds = questionIds;
    if (!finalQuestionIds || finalQuestionIds.length === 0) {
      const subjectQuestions = await prisma.question.findMany({
        where: { subjectId },
        select: { id: true },
      });
      finalQuestionIds = subjectQuestions.map((q) => q.id);
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        code,
        description,
        subjectId,
        createdByUserId: user.id,
        durationMinutes: Number(durationMinutes) || 60,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        token: token || "ZYACBT",
        isTokenDynamic: Boolean(isTokenDynamic),
        shuffleQuestions: Boolean(shuffleQuestions ?? true),
        shuffleOptions: Boolean(shuffleOptions ?? true),
        showResult: Boolean(showResult ?? false),
        showAnswerKey: Boolean(showAnswerKey ?? false),
        minTimeMinutes: Number(minTimeMinutes) || 0,
        maxViolations: Number(maxViolations) || 3,
        isPublished: Boolean(isPublished ?? true),
        requireKioskBrowser: Boolean(requireKioskBrowser ?? false),
        ...(groupIds && groupIds.length > 0
          ? {
              examGroups: {
                create: groupIds.map((groupId: string) => ({ groupId })),
              },
            }
          : {}),
        ...(finalQuestionIds && finalQuestionIds.length > 0
          ? {
              examQuestions: {
                create: finalQuestionIds.map((qid: string, idx: number) => ({
                  questionId: qid,
                  orderIndex: idx + 1,
                  score: 1.0,
                })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error("Create Exam Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      code,
      description,
      subjectId,
      durationMinutes,
      startTime,
      endTime,
      token,
      isTokenDynamic,
      shuffleQuestions,
      shuffleOptions,
      showResult,
      showAnswerKey,
      minTimeMinutes,
      maxViolations,
      isPublished,
      requireKioskBrowser,
      groupIds,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID ujian wajib disertakan" }, { status: 400 });
    }

    // Update group relations if provided
    if (groupIds) {
      await prisma.examGroup.deleteMany({ where: { examId: id } });
      if (groupIds.length > 0) {
        await prisma.examGroup.createMany({
          data: groupIds.map((groupId: string) => ({ examId: id, groupId })),
        });
      }
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(code ? { code } : {}),
        description,
        ...(subjectId ? { subjectId } : {}),
        ...(durationMinutes ? { durationMinutes: Number(durationMinutes) } : {}),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        token,
        isTokenDynamic: Boolean(isTokenDynamic),
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        showResult: Boolean(showResult),
        showAnswerKey: Boolean(showAnswerKey),
        minTimeMinutes: Number(minTimeMinutes) || 0,
        maxViolations: Number(maxViolations) || 3,
        ...(typeof isPublished === "boolean" ? { isPublished } : {}),
        ...(typeof requireKioskBrowser === "boolean" ? { requireKioskBrowser } : {}),
      },
    });

    return NextResponse.json({ success: true, exam: updatedExam });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID ujian wajib disertakan" }, { status: 400 });
    }

    await prisma.exam.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Ujian berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
