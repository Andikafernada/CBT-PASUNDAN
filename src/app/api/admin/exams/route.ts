import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { prewarmExamCache, invalidateExamCache } from "@/lib/exam-cache";

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
      groupsData,
      questionIds,
      category,
      disableAntiCheat,
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
        category: category === "PKL" ? "PKL" : "REGULER",
        disableAntiCheat: Boolean(disableAntiCheat),
        createdByUserId: user.id,
        durationMinutes: Number(durationMinutes) || 60,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        token: token || "HEBAT",
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
                create: groupsData && Array.isArray(groupsData) && groupsData.length > 0
                  ? groupsData.map((g: any) => ({
                      groupId: g.groupId,
                      sessionName: g.sessionName || null,
                      room: g.room || null,
                      startTime: g.startTime ? new Date(g.startTime) : null,
                      endTime: g.endTime ? new Date(g.endTime) : null,
                    }))
                  : groupIds.map((groupId: string) => ({ groupId })),
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

    // ⚡ Pre-warm cache on publish to prevent thundering herd
    if (exam.isPublished) {
      prewarmExamCache(exam.id).catch(() => {});
    }

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
      groupsData,
      category,
      disableAntiCheat,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID ujian wajib disertakan" }, { status: 400 });
    }

    // Update group relations if provided (supports session scheduling & room assignment)
    if (groupIds || groupsData) {
      await prisma.examGroup.deleteMany({ where: { examId: id } });
      const recordsToCreate = groupsData && Array.isArray(groupsData) && groupsData.length > 0
        ? groupsData.map((g: any) => ({
            examId: id,
            groupId: g.groupId,
            sessionName: g.sessionName || null,
            room: g.room || null,
            startTime: g.startTime ? new Date(g.startTime) : null,
            endTime: g.endTime ? new Date(g.endTime) : null,
          }))
        : (groupIds || []).map((groupId: string) => ({ examId: id, groupId }));

      if (recordsToCreate.length > 0) {
        await prisma.examGroup.createMany({
          data: recordsToCreate,
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
        ...(category ? { category: category === "PKL" ? "PKL" : "REGULER" } : {}),
        ...(typeof disableAntiCheat === "boolean" ? { disableAntiCheat } : {}),
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

    // ⚡ Pre-warm or invalidate cache based on publish status
    if (updatedExam.isPublished) {
      prewarmExamCache(updatedExam.id).catch(() => {});
    } else {
      invalidateExamCache(updatedExam.id).catch(() => {});
    }

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
    const idsParam = searchParams.get("ids");
    const allParam = searchParams.get("all") === "true";

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const selectedIds: string[] = body?.ids || (idsParam ? idsParam.split(",").filter(Boolean) : (id ? [id] : []));
    const deleteAll: boolean = body?.all === true || allParam;

    // 1. BULK ALL: Hapus Seluruh Jadwal Ujian
    if (deleteAll) {
      const whereClause: any = {};
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }
      const count = await prisma.exam.count({ where: whereClause });
      if (count === 0) {
        return NextResponse.json({ error: "Tidak ada jadwal ujian untuk dihapus" }, { status: 404 });
      }

      const allExams = await prisma.exam.findMany({ where: whereClause, select: { id: true } });
      for (const ex of allExams) {
        invalidateExamCache(ex.id).catch(() => {});
      }

      const deleted = await prisma.exam.deleteMany({ where: whereClause });
      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus seluruh jadwal ujian (${deleted.count} ujian dihapus)`,
        deletedCount: deleted.count,
      });
    }

    // 2. BULK SELECTION: Hapus Ujian yang Dipilih
    if (selectedIds.length > 0) {
      for (const exId of selectedIds) {
        invalidateExamCache(exId).catch(() => {});
      }

      const whereClause: any = { id: { in: selectedIds } };
      if (user.role === "TEACHER") {
        whereClause.createdByUserId = user.id;
      }

      const deleted = await prisma.exam.deleteMany({ where: whereClause });
      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deleted.count} jadwal ujian yang dipilih`,
        deletedCount: deleted.count,
      });
    }

    return NextResponse.json({ error: "Pilih setidaknya 1 jadwal ujian untuk dihapus" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids, action, data, all } = body;

    let targetIds: string[] = ids || [];

    if (all) {
      const whereClause: any = {};
      if (user.role === "TEACHER") whereClause.createdByUserId = user.id;
      const allExams = await prisma.exam.findMany({ where: whereClause, select: { id: true } });
      targetIds = allExams.map((e) => e.id);
    }

    if (!targetIds || targetIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada jadwal ujian yang dipilih" }, { status: 400 });
    }

    // 1. Bulk Publish
    if (action === "publish") {
      await prisma.exam.updateMany({
        where: { id: { in: targetIds } },
        data: { isPublished: true },
      });
      // Prewarm in background
      for (const eid of targetIds) {
        prewarmExamCache(eid).catch(() => {});
      }
      return NextResponse.json({
        success: true,
        message: `Berhasil mempublikasikan ${targetIds.length} jadwal ujian`,
        count: targetIds.length,
      });
    }

    // 2. Bulk Unpublish
    if (action === "unpublish") {
      await prisma.exam.updateMany({
        where: { id: { in: targetIds } },
        data: { isPublished: false },
      });
      for (const eid of targetIds) {
        invalidateExamCache(eid).catch(() => {});
      }
      return NextResponse.json({
        success: true,
        message: `Berhasil menyembunyikan (draft) ${targetIds.length} jadwal ujian`,
        count: targetIds.length,
      });
    }

    // 3. Bulk Update Token
    if (action === "setToken") {
      const token = (data?.token || "").trim().toUpperCase();
      if (!token) {
        return NextResponse.json({ error: "Token baru tidak boleh kosong" }, { status: 400 });
      }
      await prisma.exam.updateMany({
        where: { id: { in: targetIds } },
        data: { token },
      });
      for (const eid of targetIds) {
        invalidateExamCache(eid).catch(() => {});
      }
      return NextResponse.json({
        success: true,
        message: `Token untuk ${targetIds.length} ujian berhasil diubah ke: ${token}`,
        count: targetIds.length,
      });
    }

    // 4. Bulk Anti-Cheat Toggle
    if (action === "setAntiCheat") {
      const disableAntiCheat = Boolean(data?.disableAntiCheat);
      await prisma.exam.updateMany({
        where: { id: { in: targetIds } },
        data: { disableAntiCheat },
      });
      for (const eid of targetIds) {
        invalidateExamCache(eid).catch(() => {});
      }
      return NextResponse.json({
        success: true,
        message: `Status anti-cheat untuk ${targetIds.length} ujian berhasil diperbarui (${disableAntiCheat ? "Bebas Pelanggaran Aktif" : "Anti-Cheat Ketat"})`,
        count: targetIds.length,
      });
    }

    // 5. Bulk Pre-warm Redis
    if (action === "prewarm") {
      let successCount = 0;
      let totalQuestions = 0;
      for (const eid of targetIds) {
        try {
          const res = await prewarmExamCache(eid);
          if (res.success) {
            successCount++;
            totalQuestions += res.questionCount || 0;
          }
        } catch {}
      }
      return NextResponse.json({
        success: true,
        message: `⚡ Cache Redis berhasil dipanaskan untuk ${successCount} dari ${targetIds.length} ujian (${totalQuestions} butir soal termuat di RAM)`,
        count: successCount,
        totalQuestions,
      });
    }

    return NextResponse.json({ error: "Aksi massal tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
