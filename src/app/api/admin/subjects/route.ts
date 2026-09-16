import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      include: {
        topics: {
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ subjects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Administrator & Guru" }, { status: 403 });
    }

    const { type, name, code, description, subjectId } = await req.json();

    if (type === "TOPIC") {
      if (!name || !subjectId) {
        return NextResponse.json({ error: "Nama topik dan mata pelajaran wajib diisi" }, { status: 400 });
      }
      const topic = await prisma.topic.create({
        data: { name, code, description, subjectId },
      });
      return NextResponse.json({ success: true, topic });
    } else {
      if (!name || !code) {
        return NextResponse.json({ error: "Nama dan kode mata pelajaran wajib diisi" }, { status: 400 });
      }
      const subject = await prisma.subject.create({
        data: { name, code, description },
      });
      return NextResponse.json({ success: true, subject });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Administrator & Guru" }, { status: 403 });
    }

    const { type, id, name, code, description, subjectId } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "ID dan nama wajib diisi" }, { status: 400 });
    }

    if (type === "TOPIC") {
      const topic = await prisma.topic.update({
        where: { id },
        data: { name, code, description, ...(subjectId ? { subjectId } : {}) },
      });
      return NextResponse.json({ success: true, topic });
    } else {
      const subject = await prisma.subject.update({
        where: { id },
        data: { name, code, description },
      });
      return NextResponse.json({ success: true, subject });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Administrator & Guru" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib disertakan" }, { status: 400 });
    }

    if (type === "TOPIC") {
      await prisma.topic.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Topik berhasil dihapus" });
    } else {
      await prisma.subject.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Mata pelajaran berhasil dihapus" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
