import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const VALID_LIKERT = ["SS", "S", "N", "TS", "STS"];

// GET: Cek apakah siswa sudah mengisi kuesioner untuk ujian ini
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json({ error: "examId parameter is required" }, { status: 400 });
    }

    const existing = await prisma.learningSurvey.findUnique({
      where: {
        examId_userId: {
          examId,
          userId: user.id,
        },
      },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({
      isCompleted: !!existing,
      submittedAt: existing?.submittedAt || null,
    });
  } catch (error: any) {
    console.error("Error checking survey status:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}

// POST: Simpan jawaban kuesioner pembelajaran siswa
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { examId, answers } = body;

    if (!examId) {
      return NextResponse.json({ error: "examId wajib diisi" }, { status: 400 });
    }

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Jawaban kuesioner wajib diisi" }, { status: 400 });
    }

    // Validasi 7 butir Likert
    for (let i = 1; i <= 7; i++) {
      const key = `q${i}`;
      const val = answers[key];
      if (!val || !VALID_LIKERT.includes(val)) {
        return NextResponse.json(
          { error: `Pertanyaan nomor ${i} wajib dijawab dengan pilihan SS, S, N, TS, atau STS.` },
          { status: 400 }
        );
      }
    }

    // Ambil data ujian & mata pelajaran
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, subjectId: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Ujian tidak ditemukan" }, { status: 404 });
    }

    // Simpan ke database (non-anonim: terikat ke userId, examId, subjectId)
    const survey = await prisma.learningSurvey.upsert({
      where: {
        examId_userId: {
          examId,
          userId: user.id,
        },
      },
      create: {
        examId,
        subjectId: exam.subjectId,
        userId: user.id,
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        q6: answers.q6,
        q7: answers.q7,
        q8Suggestion: answers.q8Suggestion?.trim() || null,
      },
      update: {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        q4: answers.q4,
        q5: answers.q5,
        q6: answers.q6,
        q7: answers.q7,
        q8Suggestion: answers.q8Suggestion?.trim() || null,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      surveyId: survey.id,
      message: "Kuesioner pembelajaran berhasil disimpan.",
    });
  } catch (error: any) {
    console.error("Error saving survey:", error);
    return NextResponse.json({ error: "Gagal menyimpan kuesioner: " + error.message }, { status: 500 });
  }
}
