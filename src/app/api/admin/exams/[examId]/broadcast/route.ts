import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getCache, setCache, deleteCache } from "@/lib/redis";

// In-memory fallback if Redis is unavailable
const memoryBroadcasts: Record<string, { id: string; message: string; sender: string; timestamp: number }> = {};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;

    let broadcastData: any = await getCache<any>(`cbt:exam:${examId}:broadcast`);

    if (!broadcastData && memoryBroadcasts[examId]) {
      const mem = memoryBroadcasts[examId];
      if (Date.now() - mem.timestamp < 30 * 60 * 1000) {
        broadcastData = mem;
      } else {
        delete memoryBroadcasts[examId];
      }
    }

    return NextResponse.json({ broadcast: broadcastData || null });
  } catch {
    return NextResponse.json({ broadcast: null });
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

    const body = await req.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Pesan pengumuman tidak boleh kosong" }, { status: 400 });
    }

    const broadcast = {
      id: `bc_${Date.now()}`,
      message: message.trim(),
      sender: user.name || user.username,
      timestamp: Date.now(),
    };

    await setCache(`cbt:exam:${examId}:broadcast`, broadcast, 1800);
    memoryBroadcasts[examId] = broadcast;

    return NextResponse.json({
      success: true,
      broadcast,
      message: "Pengumuman berhasil disiarkan ke seluruh siswa yang aktif.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menyiarkan pengumuman" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteCache(`cbt:exam:${examId}:broadcast`);
    delete memoryBroadcasts[examId];

    return NextResponse.json({ success: true, message: "Pengumuman telah dinonaktifkan." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
