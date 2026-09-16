import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteCachePattern } from "@/lib/redis";

async function resolveDefaultTopicId(subjectId: string): Promise<string> {
  let topic = await prisma.topic.findFirst({
    where: { subjectId },
    orderBy: { createdAt: "asc" },
  });
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        subjectId,
        name: "Materi Umum",
        code: "GEN",
      },
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

    if (user.role === "TEACHER") {
      where.createdByUserId = user.id;
    }

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
      topicId,
      type,
      content,
      difficulty,
      points,
      options,
      matchingPairs,
      rubric,
    } = body;

    if (!subjectId) {
      return NextResponse.json({ error: "Mata pelajaran (subjectId) wajib dipilih" }, { status: 400 });
    }
    const safeContent = (content && typeof content === "string") ? content.trim() : "";
    if (!safeContent) {
      return NextResponse.json({ error: "Teks butir soal tidak boleh kosong" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: "Tipe butir soal wajib ditentukan" }, { status: 400 });
    }

    let finalTopicId = topicId;
    if (!finalTopicId) {
      finalTopicId = await resolveDefaultTopicId(subjectId);
    }

    const question = await prisma.question.create({
      data: {
        subjectId,
        topicId: finalTopicId,
        type: type || "MULTIPLE_CHOICE",
        content: safeContent,
        difficulty: difficulty || "MEDIUM",
        points: Number(points) || 1.0,
        rubric: rubric || null,
        createdByUserId: user.id,
        ...(options && options.length > 0
          ? {
              options: {
                create: options.map((opt: any, idx: number) => ({
                  content: opt.content,
                  isCorrect: Boolean(opt.isCorrect),
                  orderIndex: idx,
                })),
              },
            }
          : {}),
        ...(matchingPairs && matchingPairs.length > 0
          ? {
              matchingPairs: {
                create: matchingPairs.map((pair: any, idx: number) => ({
                  premise: pair.premise,
                  response: pair.response,
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

    // 🔒 Redis Cache Invalidation on Question Create
    deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

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
    const { id, subjectId, content, difficulty, points, options, matchingPairs, rubric } = body;

    if (!id || !content) {
      return NextResponse.json({ error: "ID dan konten soal wajib diisi" }, { status: 400 });
    }

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

    if (matchingPairs && Array.isArray(matchingPairs)) {
      await prisma.matchingPair.deleteMany({ where: { questionId: id } });
      if (matchingPairs.length > 0) {
        await prisma.matchingPair.createMany({
          data: matchingPairs.map((pair: any, idx: number) => ({
            questionId: id,
            premise: pair.premise,
            response: pair.response,
            orderIndex: idx,
          })),
        });
      }
    }

    const updateData: any = {
      content,
      difficulty: difficulty || "MEDIUM",
      points: Number(points) || 1.0,
      rubric: rubric !== undefined ? rubric : undefined,
    };

    if (subjectId) {
      updateData.subjectId = subjectId;
      updateData.topicId = await resolveDefaultTopicId(subjectId);
    }

    const updated = await prisma.question.update({
      where: { id },
      data: updateData,
      include: { options: true, matchingPairs: true },
    });

    // 🔒 Redis Cache Invalidation on Question Update
    deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

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
    const type = searchParams.get("type");
    const deleteAll = searchParams.get("deleteAll") === "true";
    const idsParam = searchParams.get("ids");

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const selectedIds: string[] = body?.ids || (idsParam ? idsParam.split(",").filter(Boolean) : []);

    // 1. BULK ALL: Hapus Seluruh Butir Soal di Bank Soal
    if (deleteAll) {
      const whereClause: any = {};
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }
      const count = await prisma.question.count({ where: whereClause });
      if (count === 0) {
        return NextResponse.json({ error: "Bank soal sudah kosong, tidak ada butir soal untuk dihapus" }, { status: 404 });
      }
      const deleted = await prisma.question.deleteMany({ where: whereClause });

      // 🔒 Redis Cache Invalidation
      deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Berhasil mengosongkan seluruh bank soal (${deleted.count} butir soal dihapus)`,
        deletedCount: deleted.count,
      });
    }

    // 2. BULK SELECTION: Hapus Butir Soal yang Dipilih (Checkbox)
    if (selectedIds.length > 0) {
      const whereClause: any = { id: { in: selectedIds } };
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }
      const deleted = await prisma.question.deleteMany({ where: whereClause });

      // 🔒 Redis Cache Invalidation
      deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deleted.count} butir soal yang dipilih`,
        deletedCount: deleted.count,
      });
    }

    // 3. BULK CATEGORY: Hapus Berdasarkan Kategori Mata Pelajaran
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

      // 🔒 Redis Cache Invalidation
      deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deleted.count} butir soal pada mata pelajaran ini`,
        deletedCount: deleted.count,
      });
    }

    // 4. BULK CATEGORY: Hapus Berdasarkan Kategori Tipe Soal (PG, Esai, dll)
    if (type) {
      const whereClause: any = { type };
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }
      const count = await prisma.question.count({ where: whereClause });
      if (count === 0) {
        return NextResponse.json({ error: `Tidak ada butir soal dengan tipe ${type}` }, { status: 404 });
      }
      const deleted = await prisma.question.deleteMany({ where: whereClause });

      // 🔒 Redis Cache Invalidation
      deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deleted.count} butir soal dengan tipe ${type}`,
        deletedCount: deleted.count,
      });
    }

    // 5. SINGLE: Hapus 1 Soal Berdasarkan ID
    if (!id) {
      return NextResponse.json({ error: "Parameter id, subjectId, type, ids, atau deleteAll wajib disertakan" }, { status: 400 });
    }

    if (user.role === "TEACHER") {
      const existing = await prisma.question.findUnique({ where: { id } });
      if (existing && existing.createdByUserId && existing.createdByUserId !== user.id) {
        return NextResponse.json({ error: "Anda hanya berhak menghapus butir soal yang Anda buat sendiri" }, { status: 403 });
      }
    }

    await prisma.question.delete({ where: { id } });

    // 🔒 Redis Cache Invalidation
    deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

    return NextResponse.json({ success: true, message: "Butir soal berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
