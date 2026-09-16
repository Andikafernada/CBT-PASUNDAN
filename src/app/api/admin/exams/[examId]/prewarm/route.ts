import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prewarmExamCache } from "@/lib/exam-cache";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await params;
    const result = await prewarmExamCache(examId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal melakukan pre-warm cache ujian" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Berhasil memanaskan cache ujian ke Redis (${result.questionCount} butir soal, ${result.durationMs}ms)`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
