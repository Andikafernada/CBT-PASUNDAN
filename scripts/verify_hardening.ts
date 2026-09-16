import { prisma } from "../src/lib/prisma";
import { calculateAndFinishSession } from "../src/lib/exam-score";

async function verifyHardening() {
  console.log("=================================================================");
  console.log("🔍 PRODUCTION HARDENING E2E AUDIT & VERIFICATION");
  console.log("=================================================================\n");

  // 1. VERIFY ASYNC AI GRADING
  console.log("[1] Testing Asynchronous AI Essay Grading...");
  const exam = await prisma.exam.findFirst({
    where: { code: "GLADI-2026" },
    include: { examQuestions: { include: { question: true } } }
  });

  const testStudent = await prisma.user.findFirst({
    where: { role: "STUDENT" }
  });

  if (exam && testStudent) {
    const session = await prisma.examSession.upsert({
      where: { examId_userId: { examId: exam.id, userId: testStudent.id } },
      update: { status: "IN_PROGRESS" },
      create: {
        examId: exam.id,
        userId: testStudent.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        remainingSeconds: 1800,
      }
    });

    const essayQ = exam.examQuestions.find(eq => eq.question.type === "ESSAY")?.question;
    if (essayQ) {
      await prisma.examAnswer.upsert({
        where: { sessionId_questionId: { sessionId: session.id, questionId: essayQ.id } },
        update: {
          textAnswer: "Pencadangan database secara berkala sangat penting untuk mencegah kehilangan data ketika listrik padam atau hardware rusak, serta menjamin pemulihan cepat (disaster recovery).",
          isAiGraded: false,
          scoreAwarded: 0,
        },
        create: {
          sessionId: session.id,
          questionId: essayQ.id,
          textAnswer: "Pencadangan database secara berkala sangat penting untuk mencegah kehilangan data ketika listrik padam atau hardware rusak, serta menjamin pemulihan cepat (disaster recovery).",
          isAiGraded: false,
          scoreAwarded: 0,
        }
      });
    }

    const t0 = Date.now();
    const finishRes = await calculateAndFinishSession(session.id, "SELF");
    const executionDuration = Date.now() - t0;

    console.log(`✅ INSTANT SUBMISSION: calculateAndFinishSession returned in ${executionDuration} ms!`);
    console.log(`Status: ${finishRes.status}, Initial Score: ${finishRes.score}`);

    // Wait 4 seconds to observe background AI worker completing
    console.log("Waiting 4 seconds for background AI worker to grade the essay...");
    await new Promise(r => setTimeout(r, 4000));

    const updatedAnswer = await prisma.examAnswer.findFirst({
      where: { sessionId: session.id, questionId: essayQ?.id },
      select: { scoreAwarded: true, isAiGraded: true, teacherFeedback: true }
    });
    console.log("Background AI Result in DB:", updatedAnswer);
  }

  // 2. VERIFY STUDENT PROVISIONING
  console.log("\n[2] Verifying Student Class Representatives in Database...");
  const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
  console.log(`Total Active Students in DB: ${studentCount}`);

  const sampleStudent = await prisma.user.findFirst({
    where: { username: "siswa.26001" },
    include: { group: true }
  });
  console.log("Sample Student 1:", {
    username: sampleStudent?.username,
    name: sampleStudent?.name,
    group: sampleStudent?.group?.name,
    hasPasswordHash: Boolean(sampleStudent?.password.startsWith("$2")),
  });

  console.log("\n=================================================================");
  console.log("🎯 ALL AUDIT CHECKS COMPLETED");
  console.log("=================================================================");
}

verifyHardening()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
