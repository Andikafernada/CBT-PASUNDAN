import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { verifyExamToken } from "@/lib/token";
import { getCache, setCache } from "@/lib/redis";
import { getMatchingResponseToken } from "@/lib/exam-token-crypto";
import { calculateAndFinishSession } from "@/lib/exam-score";

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

    // ⚡ HIGH CONCURRENCY: Redis Cache-Aside Pattern
    const examCacheKey = `cbt:exam:${examId}:bundle`;
    let exam = await getCache<any>(examCacheKey);

    if (!exam) {
      exam = await prisma.exam.findUnique({
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

      if (exam) {
        // Cache selama 2 jam (7200 detik)
        await setCache(examCacheKey, exam, 7200);
      }
    }

    if (!exam || !exam.isPublished) {
      return NextResponse.json(
        { error: "Ujian tidak ditemukan atau belum dipublikasikan" },
        { status: 404 }
      );
    }

    // Strict Two-Way Segregation: REGULER vs PKL
    let isStudentPkl = false;
    if (user.groupId) {
      const studentGroup = await prisma.group.findUnique({
        where: { id: user.groupId },
        select: { id: true, name: true, code: true, isPkl: true, bypassExambro: true },
      });
      if (studentGroup) {
        isStudentPkl = Boolean(
          studentGroup.isPkl ||
          studentGroup.bypassExambro ||
          /pkl|dudi|magang/i.test(studentGroup.name) ||
          /pkl|dudi|magang/i.test(studentGroup.code)
        );
      }
    }

    const examCategory = exam.category || "REGULER";
    if (examCategory === "PKL" && !isStudentPkl) {
      return NextResponse.json(
        { error: "Akses ditolak: Ujian ini khusus untuk siswa PKL / Magang Kerja. Siswa reguler tidak diizinkan masuk." },
        { status: 403 }
      );
    }
    if (examCategory === "REGULER" && isStudentPkl) {
      return NextResponse.json(
        { error: "Akses ditolak: Ujian ini khusus untuk siswa Reguler di sekolah. Siswa PKL tidak diizinkan masuk." },
        { status: 403 }
      );
    }

    // Supplementary Exam Validation: Students who already completed the parent exam cannot retake supplementary
    if (exam.isSupplementary && exam.parentExamId) {
      const parentSession = await prisma.examSession.findUnique({
        where: { examId_userId: { examId: exam.parentExamId, userId: user.id } },
      });
      if (parentSession && (parentSession.status === "COMPLETED" || parentSession.status === "FORCE_FINISHED")) {
        return NextResponse.json(
          { error: "Akses ditolak: Anda telah menyelesaikan ujian utama, sehingga tidak diizinkan mengikuti ujian susulan ini." },
          { status: 403 }
        );
      }
    }

    // Target Group / Class Restriction (e.g. X-TKJ, XII-MIPA)
    if (exam.examGroups && exam.examGroups.length > 0) {
      const isEligibleGroup = user.groupId && exam.examGroups.some((eg: any) => eg.groupId === user.groupId);
      if (!isEligibleGroup) {
        return NextResponse.json(
          { error: "Akses ditolak: Akun Anda tidak terdaftar pada Rombel / Kelas peserta ujian ini." },
          { status: 403 }
        );
      }
    }

    // ⏱️ IDE 4: Session Schedule & Time Validation (Sesi 1, Sesi 2, Sesi 3 per Rombel/Kelas)
    const currentTime = new Date();
    const studentGroupRel = user.groupId
      ? exam.examGroups?.find((eg: any) => eg.groupId === user.groupId)
      : null;

    if (studentGroupRel && (studentGroupRel.startTime || studentGroupRel.endTime)) {
      const sessionLabel = studentGroupRel.sessionName || "Sesi Khusus";
      const roomLabel = studentGroupRel.room ? ` di ${studentGroupRel.room}` : "";

      if (studentGroupRel.startTime && currentTime < new Date(studentGroupRel.startTime)) {
        const timeStr = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(studentGroupRel.startTime));

        return NextResponse.json(
          {
            error: `Ujian belum dibuka untuk kelas Anda. Jadwal pengerjaan kelas Anda adalah: ${sessionLabel} (Mulai Pukul ${timeStr} WIB)${roomLabel}.`,
            isNotStarted: true,
            sessionName: studentGroupRel.sessionName,
            sessionStartTime: studentGroupRel.startTime,
          },
          { status: 403 }
        );
      }

      if (studentGroupRel.endTime && currentTime > new Date(studentGroupRel.endTime)) {
        const timeStr = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(studentGroupRel.endTime));

        return NextResponse.json(
          {
            error: `Waktu pelaksanaan ujian untuk kelas Anda (${sessionLabel}) telah berakhir pada pukul ${timeStr} WIB. Silakan hubungi proktor/pengawas ruang jika Anda memerlukan ujian susulan.`,
            isExpired: true,
            sessionName: studentGroupRel.sessionName,
            sessionEndTime: studentGroupRel.endTime,
          },
          { status: 403 }
        );
      }
    } else {
      // Fallback ke Jam Global Ujian jika tidak ada jadwal sesi khusus
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
    }
    // Kiosk Exam Browser Security Validation (with Selective Bypass for PKL, Susulan, & HP)
    const isBypassed = Boolean(
      (user as any).bypassExambro ||
      isStudentPkl ||
      user.group?.isPkl ||
      (user.group as any)?.bypassExambro ||
      exam.isSupplementary ||
      exam.disableAntiCheat
    );
    if (exam.requireKioskBrowser && !isBypassed) {
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

    // If session is already finished, immediately return status without demanding a token
    if (session && (session.status === "COMPLETED" || session.status === "TIMEOUT" || session.status === "FORCE_FINISHED")) {
      const isForceFinished =
        session.status === "FORCE_FINISHED" ||
        session.finishReason === "FORCE_BY_ADMIN" ||
        session.finishReason === "PROCTOR_FORCE";
      return NextResponse.json(
        {
          error: isForceFinished ? "Ujian ini telah diselesaikan oleh pengawas/admin" : "Anda sudah menyelesaikan ujian ini",
          status: session.status,
          finishReason: session.finishReason,
          isForceFinished,
          isFinished: true,
          examTitle: exam.title,
          subjectName: exam.subject?.name,
        },
        { status: 403 }
      );
    }

    // Check if token is required (only when starting a brand new session or if token is explicitly provided)
    if (exam.token && exam.token.trim() !== "") {
      const isNewSession = !session;
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
      // Create new session with strict startedAt
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
    } else if (session.status === "SUSPENDED" || session.status === "TERMINATED") {
      return NextResponse.json(
        { error: "Sesi ujian Anda telah dibekukan oleh pengawas karena pelanggaran", status: session.status },
        { status: 403 }
      );
    } else {
      // 🔒 Absolute Server Time Authority on Resume: Calculate remaining strictly from startedAt
      const elapsedSeconds = Math.floor((now.getTime() - new Date(session.startedAt).getTime()) / 1000);
      const authoritativeRemaining = Math.max(0, totalSeconds - elapsedSeconds);

      if (authoritativeRemaining <= 0) {
        await calculateAndFinishSession(session.id, "TIMEOUT");
        return NextResponse.json(
          { error: "Waktu pengerjaan ujian telah habis", status: "COMPLETED" },
          { status: 403 }
        );
      }

      session.remainingSeconds = authoritativeRemaining;
      prisma.examSession.update({
        where: { id: session.id },
        data: { remainingSeconds: authoritativeRemaining },
      }).catch(() => {});
    }

    // Save Student Reflection if provided (non-blocking)
    if (physicalState || readinessRate) {
      prisma.studentReflection.upsert({
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

    // Map existing answers by questionId with token normalization
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

      // Normalize matching answer to use obfuscated tokens for this session
      if (matchingAnswer && typeof matchingAnswer === "object") {
        const secureMatching: Record<string, string> = {};
        for (const [pId, val] of Object.entries(matchingAnswer)) {
          if (val === pId) {
            secureMatching[pId] = getMatchingResponseToken(pId, session.id);
          } else {
            secureMatching[pId] = val as string;
          }
        }
        matchingAnswer = secureMatching;
      }

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

      rawExamQuestions = subjectQuestions.map((q: any, idx: number) => ({
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

      // 🔒 DATA LEAK FIX: Obfuscate matching pair response tokens per session
      // Siswa tidak dapat mencocokkan premise.id dan response.id dari inspeksi payload/DOM
      const premises = (q.matchingPairs || []).map((p: any) => ({ id: p.id, text: p.premise }));
      const responses = (q.matchingPairs || [])
        .map((p: any) => ({
          id: getMatchingResponseToken(p.id, session.id),
          text: p.response,
        }))
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
      const seed = user.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      questions = questions.sort((a: any, b: any) => {
        const hashA = (a.id.charCodeAt(0) * seed) % 100;
        const hashB = (b.id.charCodeAt(0) * seed) % 100;
        return hashA - hashB;
      });
      // Re-number
      questions = questions.map((q: any, idx: number) => ({ ...q, number: idx + 1 }));
    }

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        subject: exam.subject?.name || "Ujian",
        durationMinutes: exam.durationMinutes,
        remainingSeconds: session.remainingSeconds,
        minTimeMinutes: exam.minTimeMinutes,
        maxViolations: exam.maxViolations,
        requireKioskBrowser: exam.requireKioskBrowser,
        category: exam.category || "REGULER",
        disableAntiCheat: Boolean(exam.disableAntiCheat || exam.maxViolations === 0),
      },
      session: {
        id: session.id,
        status: session.status,
        violationCount: session.violationCount,
        studentName: user.name,
        studentUsername: user.username,
        studentNis: user.nis || user.username,
      },
      questions,
    });
  } catch (error: any) {
    console.error("Start Exam API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
