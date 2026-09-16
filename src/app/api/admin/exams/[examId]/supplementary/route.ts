import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/admin/exams/[examId]/supplementary — List semua ujian susulan dari ujian ini
// POST /api/admin/exams/[examId]/supplementary — Buat ujian susulan baru

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

    const supplementaryExams = await prisma.exam.findMany({
      where: { parentExamId: examId, isSupplementary: true },
      include: {
        subject: true,
        examGroups: { include: { group: true } },
        _count: { select: { examQuestions: true, examSessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ supplementaryExams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const parentExam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: true,
        examGroups: true,
      },
    });

    if (!parentExam) {
      return NextResponse.json({ error: "Ujian induk tidak ditemukan" }, { status: 404 });
    }

    const { title, code, startTime, endTime, durationMinutes, token, useParentQuestions, questionIds, groupIds } = await req.json();

    if (!title || !code) {
      return NextResponse.json({ error: "Judul dan kode ujian susulan wajib diisi" }, { status: 400 });
    }

    // Tentukan soal: gunakan soal induk atau soal baru
    const finalQuestionIds: string[] = useParentQuestions
      ? parentExam.examQuestions.map((eq) => eq.questionId)
      : (questionIds || []);

    // Tentukan kelas: gunakan kelas induk atau kelas baru
    const finalGroupIds: string[] = groupIds?.length
      ? groupIds
      : parentExam.examGroups.map((eg) => eg.groupId);

    const supplementaryExam = await prisma.exam.create({
      data: {
        title,
        code,
        description: `Ujian Susulan dari: ${parentExam.title}`,
        subjectId: parentExam.subjectId,
        createdByUserId: user.id,
        durationMinutes: Number(durationMinutes) || parentExam.durationMinutes,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        token: token || parentExam.token,
        shuffleQuestions: parentExam.shuffleQuestions,
        shuffleOptions: parentExam.shuffleOptions,
        showResult: parentExam.showResult,
        showAnswerKey: parentExam.showAnswerKey,
        minTimeMinutes: 0,
        maxViolations: parentExam.maxViolations,
        isPublished: true,
        isSupplementary: true,
        parentExamId: examId,
        ...(finalGroupIds.length > 0
          ? { examGroups: { create: finalGroupIds.map((gid) => ({ groupId: gid })) } }
          : {}),
        ...(finalQuestionIds.length > 0
          ? {
              examQuestions: {
                create: finalQuestionIds.map((qid, idx) => ({
                  questionId: qid,
                  orderIndex: idx + 1,
                  score: 1.0,
                })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ujian susulan berhasil dibuat",
      exam: supplementaryExam,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
