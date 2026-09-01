import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { verifyExamToken } from "@/lib/token";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await req.json().catch(() => ({}));
    const { token, physicalState, readinessRate, honestyPledge, notes } = body;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        examGroups: true,
        examQuestions: {
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    content: true,
                    orderIndex: true,
                  },
                },
                matchingPairs: {
                  select: {
                    id: true,
                    premise: true,
                    response: true,
                  },
                },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam || !exam.isPublished) {
      return NextResponse.json(
        { error: "Ujian tidak ditemukan atau belum dipublikasikan" },
        { status: 404 }
      );
    }

    // Target Group / Class Restriction (e.g. X-TKJ, XII-MIPA)
    if (exam.examGroups && exam.examGroups.length > 0) {
      const isEligibleGroup = user.groupId && exam.examGroups.some((eg) => eg.groupId === user.groupId);
      if (!isEligibleGroup) {
        return NextResponse.json(
          { error: "Akses ditolak: Akun Anda tidak terdaftar pada Rombel / Kelas peserta ujian ini." },
          { status: 403 }
        );
      }
    }

    // Schedule (Start Time & End Time) Validation
    const currentTime = new Date();
    if (exam.startTime && currentTime < new Date(exam.startTime)) {
      return NextResponse.json(
        {
          error: `Ujian ini belum dibuka. Jadwal pengerjaan dimulai pada: ${new Date(exam.startTime).toLocaleString("id-ID")}`,
          isNotStarted: true,
        },
        { status: 403 }
      );
    }

    if (exam.endTime && currentTime > new Date(exam.endTime)) {
      return NextResponse.json(
        {
          error: `Batas waktu pelaksanaan ujian telah berakhir pada: ${new Date(exam.endTime).toLocaleString("id-ID")}`,
          isExpired: true,
        },
        { status: 403 }
      );
    }

    // Kiosk Exam Browser Security Validation (Exambro / Safe Exam Browser)
    if (exam.requireKioskBrowser) {
      const userAgent = req.headers.get("user-agent") || "";
      const sebHeader = req.headers.get("x-safeexambrowser-requesthash");
      const pattern = new RegExp(exam.kioskUserAgentPattern || "Exambro|SafeExamBrowser", "i");
      const isKiosk = pattern.test(userAgent) || !!sebHeader;
      if (!isKiosk) {
        return NextResponse.json(
          {
            error: "Ujian ini dikunci khusus untuk aplikasi Exambro / Safe Exam Browser (SEB)! Silakan buka kembali ujian melalui aplikasi resmi.",
            isKioskRequired: true,
          },
          { status: 403 }
        );
      }
    }

    // Check existing session first
    let session = await prisma.examSession.findUnique({
      where: {
        examId_userId: {
          examId: exam.id,
          userId: user.id,
        },
      },
      include: {
        answers: true,
      },
    });

    // Check if token is required (only when starting a new session or if token is explicitly provided)
    if (exam.token && exam.token.trim() !== "") {
      const isNewSession = !session || session.status !== "IN_PROGRESS";
      if (isNewSession || (token && token.trim() !== "")) {
        const isValidToken = token && verifyExamToken(token, exam);
        if (!isValidToken) {
          return NextResponse.json(
            { error: "Token Ujian tidak valid atau salah" },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();
    const totalSeconds = exam.durationMinutes * 60;

    if (!session) {
      // Create new session
      session = await prisma.examSession.create({
        data: {
          examId: exam.id,
          userId: user.id,
          status: "IN_PROGRESS",
          startedAt: now,
          remainingSeconds: totalSeconds,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
          userAgent: req.headers.get("user-agent") || "",
        },
        include: {
          answers: true,
        },
      });
    } else if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Anda sudah menyelesaikan ujian ini", status: "COMPLETED" },
        { status: 403 }
      );
    } else if (session.status === "SUSPENDED" || session.status === "TERMINATED") {
      return NextResponse.json(
        { error: "Sesi ujian Anda telah dibekukan oleh pengawas karena pelanggaran", status: session.status },
        { status: 403 }
      );
    } else {
      // Resume active session
      if (session.remainingSeconds <= 0) {
        await prisma.examSession.update({
          where: { id: session.id },
          data: { status: "COMPLETED", finishedAt: now, remainingSeconds: 0 },
        });
        return NextResponse.json(
          { error: "Waktu pengerjaan ujian telah habis", status: "COMPLETED" },
          { status: 403 }
        );
      }
    }

    // Save Student Reflection if provided
    if (physicalState || readinessRate) {
      await prisma.studentReflection.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          physicalState: physicalState || "FIT",
          readinessRate: Number(readinessRate) || 5,
          honestyPledge: honestyPledge !== false,
          notes: notes || null,
        },
        update: {
          physicalState: physicalState || "FIT",
          readinessRate: Number(readinessRate) || 5,
          honestyPledge: honestyPledge !== false,
          notes: notes || null,
        },
      }).catch((e) => console.error("Reflection save error:", e));
    }

    // Map existing answers by questionId
    const answersMap = new Map();
    session.answers.forEach((ans) => {
      let selectedOptionIds: string[] = [];
      let matchingAnswer: any = {};
      try {
        if (ans.selectedOptionIds) selectedOptionIds = JSON.parse(ans.selectedOptionIds);
      } catch {}
      try {
        if (ans.matchingAnswer) matchingAnswer = JSON.parse(ans.matchingAnswer);
      } catch {}

      answersMap.set(ans.questionId, {
        selectedOptionIds,
        textAnswer: ans.textAnswer || "",
        matchingAnswer,
        isDoubtful: ans.isDoubtful,
      });
    });

    // Format questions (with automatic subject questions fallback if examQuestions is empty)
    let rawExamQuestions = exam.examQuestions;
    if (!rawExamQuestions || rawExamQuestions.length === 0) {
      const subjectQuestions = await prisma.question.findMany({
        where: { subjectId: exam.subjectId },
        include: {
          options: {
            select: {
              id: true,
              content: true,
              orderIndex: true,
            },
            orderBy: { orderIndex: "asc" },
          },
          matchingPairs: {
            select: {
              id: true,
              premise: true,
              response: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      rawExamQuestions = subjectQuestions.map((q, idx) => ({
        id: `auto_${q.id}`,
        examId: exam.id,
        questionId: q.id,
        orderIndex: idx + 1,
        score: q.points || 1.0,
        question: q,
      })) as any;
    }

    let questions = rawExamQuestions.map((eq: any, index: number) => {
      const q = eq.question;
      let options = [...(q.options || [])];
      if (exam.shuffleOptions) {
        options = options.sort(() => Math.random() - 0.5);
      }

      // For matching pairs, provide randomized responses list
      const premises = (q.matchingPairs || []).map((p: any) => ({ id: p.id, text: p.premise }));
      const responses = (q.matchingPairs || [])
        .map((p: any) => ({ id: p.id, text: p.response }))
        .sort(() => Math.random() - 0.5);

      const existingAns = answersMap.get(q.id);

      return {
        id: q.id,
        number: index + 1,
        type: q.type,
        content: q.content,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        videoUrl: q.videoUrl,
        points: eq.score || 1.0,
        options,
        matchingData: {
          premises,
          responses,
        },
        answer: existingAns || {
          selectedOptionIds: [],
          textAnswer: "",
          matchingAnswer: {},
          isDoubtful: false,
        },
      };
    });

    if (exam.shuffleQuestions && questions.length > 0) {
      // Deterministic shuffle based on student ID to maintain same order on reconnect
      const seed = user.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      questions = questions.sort((a, b) => {
        const hashA = (a.id.charCodeAt(0) * seed) % 100;
        const hashB = (b.id.charCodeAt(0) * seed) % 100;
        return hashA - hashB;
      });
      // Re-number
      questions = questions.map((q, idx) => ({ ...q, number: idx + 1 }));
    }

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        subject: exam.subject.name,
        durationMinutes: exam.durationMinutes,
        remainingSeconds: session.remainingSeconds,
        minTimeMinutes: exam.minTimeMinutes,
        maxViolations: exam.maxViolations,
      },
      session: {
        id: session.id,
        status: session.status,
        violationCount: session.violationCount,
      },
      questions,
    });
  } catch (error: any) {
    console.error("Start Exam API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
