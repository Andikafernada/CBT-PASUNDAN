import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// GET /api/admin/teacher/profile — Ambil data ampuan guru
// POST /api/admin/teacher/profile — Simpan/update data ampuan guru

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: { userId: user.id },
      include: {
        subject: true,
        group: true,
      },
    });

    const subjectIds = [...new Set(assignments.filter((a) => a.subjectId).map((a) => a.subjectId!))];
    const groupIds = [...new Set(assignments.filter((a) => a.groupId).map((a) => a.groupId!))];

    const subjects = assignments.filter((a) => a.subject).map((a) => a.subject!);
    const groups = assignments.filter((a) => a.group).map((a) => a.group!);

    // Deduplicate
    const uniqueSubjects = subjects.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    const uniqueGroups = groups.filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i);

    return NextResponse.json({
      hasAssignments: subjectIds.length > 0 || groupIds.length > 0,
      subjectIds,
      groupIds,
      subjects: uniqueSubjects,
      groups: uniqueGroups,
    });
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

    const { subjectIds, groupIds } = await req.json();

    if (!Array.isArray(subjectIds) || !Array.isArray(groupIds)) {
      return NextResponse.json({ error: "subjectIds dan groupIds harus berupa array" }, { status: 400 });
    }

    // Hapus semua ampuan lama, ganti dengan yang baru
    await prisma.teacherAssignment.deleteMany({ where: { userId: user.id } });

    const rows: any[] = [];

    for (const subjectId of subjectIds) {
      rows.push({ userId: user.id, subjectId, groupId: null });
    }
    for (const groupId of groupIds) {
      rows.push({ userId: user.id, subjectId: null, groupId });
    }

    if (rows.length > 0) {
      await prisma.teacherAssignment.createMany({ data: rows });
    }

    return NextResponse.json({ success: true, message: "Data ampuan berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
