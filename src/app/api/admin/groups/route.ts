import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, description, isPkl } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Nama dan kode rombel wajib diisi" }, { status: 400 });
    }

    // Auto-detect PKL if not explicitly set
    const pklDetected = Boolean(isPkl ?? (/pkl/i.test(name) || /pkl/i.test(code)));

    const group = await prisma.group.create({
      data: {
        name,
        code,
        description,
        isPkl: pklDetected,
        bypassExambro: Boolean(body.bypassExambro || pklDetected),
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, code, description, isPkl } = body;

    if (!id) {
      return NextResponse.json({ error: "ID rombel wajib disertakan" }, { status: 400 });
    }

    const updated = await prisma.group.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(code ? { code } : {}),
        ...(typeof description !== "undefined" ? { description } : {}),
        ...(typeof isPkl === "boolean" ? { isPkl } : {}),
        ...(typeof body.bypassExambro === "boolean" ? { bypassExambro: body.bypassExambro } : {}),
      },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
