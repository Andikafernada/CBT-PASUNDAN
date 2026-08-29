import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Helper: resolusi subjectId ke default topic (buat topic jika belum ada)
async function resolveDefaultTopicId(subjectId: string): Promise<string> {
  let topic = await prisma.topic.findFirst({
    where: { subjectId, name: "_default" },
  });
  if (!topic) {
    topic = await prisma.topic.create({
      data: { subjectId, name: "_default", code: "_default", description: "Default topic (hidden)" },
    });
  }
  return topic.id;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses dibatasi" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");

    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;

    // Filter akses berdasarkan peran:
    if (user.role === "TEACHER") {
      // Guru HANYA dapat melihat, mereview, mengedit, dan menghapus butir soal yang dia buat / upload sendiri
      where.createdByUserId = user.id;
    }
    // Jika role ADMIN atau OPERATOR: tidak ada pembatasan createdByUserId, melihat seluruh bank soal lintas guru

    const questions = await prisma.question.findMany({
      where,
      include: {
        subject: true,
        createdBy: {
          select: { id: true, name: true, username: true, role: true },
        },
        options: { orderBy: { orderIndex: "asc" } },
        matchingPairs: { orderBy: { orderIndex: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("GET Questions Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses dibatasi" }, { status: 403 });
    }

    const body = await req.json();
    const {
      subjectId,
      topicId, // backward compat
      type,
      content,
      difficulty,
      points,
      options,
      matchingPairs,
      audioUrl,
      videoUrl,
      imageUrl,
    } = body;

    const finalSubjectId = subjectId || (topicId
      ? (await prisma.topic.findUnique({ where: { id: topicId }, select: { subjectId: true } }))?.subjectId
      : null);

    if (!finalSubjectId || !content) {
      return NextResponse.json(
        { error: "Mata pelajaran dan konten soal wajib diisi" },
        { status: 400 }
      );
    }

    // Resolve ke default topic untuk backward compat
    const finalTopicId = topicId || (await resolveDefaultTopicId(finalSubjectId));

    const question = await prisma.question.create({
      data: {
        subjectId: finalSubjectId,
        topicId: finalTopicId,
        createdByUserId: user.id, // Simpan ID pembuat soal
        type: type || "MULTIPLE_CHOICE",
        content,
        difficulty: difficulty || "MEDIUM",
        points: Number(points) || 1.0,
        audioUrl,
        videoUrl,
        imageUrl,
        ...(options && options.length > 0
          ? {
              options: {
                create: options.map((opt: any, idx: number) => ({
                  content: opt.content || opt.text || "",
                  isCorrect: Boolean(opt.isCorrect),
                  orderIndex: idx,
                })),
              },
            }
          : {}),
        ...(matchingPairs && matchingPairs.length > 0
          ? {
              matchingPairs: {
                create: matchingPairs.map((p: any, idx: number) => ({
                  premise: p.premise,
                  response: p.response,
                  orderIndex: idx,
                })),
              },
            }
          : {}),
      },
      include: {
        options: true,
        matchingPairs: true,
      },
    });

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    console.error("POST Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses dibatasi" }, { status: 403 });
    }

    const body = await req.json();
    const { id, subjectId, content, difficulty, points, options } = body;

    if (!id || !content) {
      return NextResponse.json({ error: "ID dan konten soal wajib diisi" }, { status: 400 });
    }

    // Guru hanya bisa mengedit soal miliknya sendiri
    if (user.role === "TEACHER") {
      const existing = await prisma.question.findUnique({ where: { id } });
      if (existing && existing.createdByUserId && existing.createdByUserId !== user.id) {
        return NextResponse.json({ error: "Anda hanya berhak mengedit butir soal yang Anda buat sendiri" }, { status: 403 });
      }
    }

    if (options && options.length > 0) {
      await prisma.questionOption.deleteMany({ where: { questionId: id } });
      await prisma.questionOption.createMany({
        data: options.map((opt: any, idx: number) => ({
          questionId: id,
          content: opt.content,
          isCorrect: Boolean(opt.isCorrect),
          orderIndex: idx,
        })),
      });
    }

    const updateData: any = {
      content,
      difficulty: difficulty || "MEDIUM",
      points: Number(points) || 1.0,
    };

    if (subjectId) {
      updateData.subjectId = subjectId;
      updateData.topicId = await resolveDefaultTopicId(subjectId);
    }

    const updated = await prisma.question.update({
      where: { id },
      data: updateData,
      include: { options: true },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    console.error("PUT Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses dibatasi" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");

    // 1. Bulk Delete by Subject ID
    if (subjectId) {
      const whereClause: any = { subjectId };
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }

      const count = await prisma.question.count({ where: whereClause });
      if (count === 0) {
        return NextResponse.json({ error: "Tidak ada butir soal yang ditemukan pada mata pelajaran ini" }, { status: 404 });
      }

      const deleted = await prisma.question.deleteMany({ where: whereClause });

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deleted.count} butir soal pada mata pelajaran ini`,
        deletedCount: deleted.count,
      });
    }

    // 2. Single Question Delete by ID
    if (!id) {
      return NextResponse.json({ error: "ID soal atau Subject ID wajib disertakan" }, { status: 400 });
    }

    // Guru hanya bisa menghapus soal buatannya sendiri
    if (user.role === "TEACHER") {
      const existing = await prisma.question.findUnique({ where: { id } });
      if (existing && existing.createdByUserId && existing.createdByUserId !== user.id) {
        return NextResponse.json({ error: "Anda hanya berhak menghapus butir soal yang Anda buat sendiri" }, { status: 403 });
      }
    }

    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Soal berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
