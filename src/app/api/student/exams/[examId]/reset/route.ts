import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperReviewer = user.username === "andikafernanda";
    if (!isSuperReviewer) {
      return NextResponse.json(
        { error: "Akses ditolak: Fitur reset sesi hanya tersedia untuk akun Super Reviewer." },
        { status: 403 }
      );
    }

    const { examId } = await params;

    // 1. Hapus ExamSession (otomatis cascade ke ExamAnswer dan StudentReflection)
    await prisma.examSession.deleteMany({
      where: {
        examId,
        userId: user.id,
      },
    });

    // 2. Hapus LearningSurvey agar bisa menguji alur kuesioner dari awal lagi jika diinginkan
    await prisma.learningSurvey.deleteMany({
      where: {
        examId,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sesi ujian dan kuesioner berhasil di-reset untuk pengujian ulang.",
    });
  } catch (error: any) {
    console.error("Error resetting exam session for super reviewer:", error);
    return NextResponse.json({ error: "Gagal me-reset sesi ujian: " + error.message }, { status: 500 });
  }
}
