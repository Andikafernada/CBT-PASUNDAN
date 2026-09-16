import { prisma } from "../src/lib/prisma";

async function runLoadTest() {
  console.log("🔥 STARTING FULL 50-STUDENT CONCURRENCY & STRESS TEST");
  console.log("Database: zyacbt_modern on 172.16.0.211 | Web Server: 172.16.0.210\n");

  const exam = await prisma.exam.findFirst({
    where: { code: "GLADI-2026" },
    include: { examQuestions: { include: { question: { include: { options: true } } } } }
  });

  if (!exam) throw new Error("Exam GLADI-2026 not found");

  // Generate 50 temporary test students
  console.log("Preparing 50 simulated concurrent student accounts...");
  const mockStudents: any[] = [];
  for (let i = 1; i <= 50; i++) {
    const pad = String(i).padStart(2, "0");
    const username = `simulasi_student_${pad}`;
    const user = await prisma.user.upsert({
      where: { username },
      update: { isLoginLocked: false, deviceFingerprint: null },
      create: {
        username,
        name: `Siswa Simulasi ${pad}`,
        password: "password123",
        role: "STUDENT",
        nis: `100${pad}`,
      }
    });
    mockStudents.push(user);
  }

  console.log(`Successfully primed ${mockStudents.length} student accounts.`);
  console.log("Launching simultaneous exam starts & autosaves...");

  const startTime = Date.now();
  const latencies: number[] = [];
  let successes = 0;
  let failures = 0;

  const runStudent = async (student: any, index: number) => {
    const t0 = Date.now();
    try {
      // 1. Session start
      const session = await prisma.examSession.upsert({
        where: {
          examId_userId: {
            examId: exam.id,
            userId: student.id,
          }
        },
        update: {
          status: "IN_PROGRESS",
          violationCount: 0,
        },
        create: {
          examId: exam.id,
          userId: student.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          remainingSeconds: 1800,
          ipAddress: `172.16.2.${(index % 40) + 1}`,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ConcurrencyTest/1.0",
        }
      });

      // 2. Autosave 2 questions concurrently per student
      for (const eq of exam.examQuestions.slice(0, 2)) {
        const q = eq.question;
        const opt = q?.options?.[0]?.id;
        if (opt) {
          await prisma.examAnswer.upsert({
            where: {
              sessionId_questionId: {
                sessionId: session.id,
                questionId: q.id,
              }
            },
            update: { selectedOptionIds: opt },
            create: {
              sessionId: session.id,
              questionId: q.id,
              selectedOptionIds: opt,
            }
          });
        }
      }

      latencies.push(Date.now() - t0);
      successes++;
    } catch (err: any) {
      failures++;
      console.error(`Student ${student.username} failed:`, err.message);
    }
  };

  // Launch ALL 50 simultaneously
  await Promise.all(mockStudents.map((s, idx) => runStudent(s, idx)));

  const totalDuration = Date.now() - startTime;
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  latencies.sort((a, b) => a - b);
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || maxLatency;

  console.log("\n========================================================");
  console.log("📊 50-STUDENT REALTIME CONCURRENCY AUDIT REPORT");
  console.log("========================================================");
  console.log(`Total Students Simulated : ${mockStudents.length}`);
  console.log(`Successful Sessions      : ${successes} (${Math.round((successes / mockStudents.length) * 100)}%)`);
  console.log(`Failed Sessions          : ${failures}`);
  console.log(`Total Batch Execution    : ${totalDuration} ms (~${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`Average Student Latency  : ${avgLatency} ms`);
  console.log(`Fastest Response         : ${minLatency} ms`);
  console.log(`Slowest Response (p100)  : ${maxLatency} ms`);
  console.log(`95% Completed Under      : ${p95Latency} ms`);
  console.log(`Database Ops Rate        : ${((mockStudents.length * 3) / (totalDuration / 1000)).toFixed(1)} queries/sec`);
  console.log("========================================================");

  if (failures === 0 && avgLatency < 1000) {
    console.log("🎯 EXCELLENT: System effortlessly handled 50 concurrent students under 1 second!");
  }

  // Cleanup sessions created during this test
  await prisma.examAnswer.deleteMany({
    where: { session: { userId: { in: mockStudents.map(s => s.id) } } }
  });
  await prisma.examSession.deleteMany({
    where: { userId: { in: mockStudents.map(s => s.id) } }
  });
  await prisma.user.deleteMany({
    where: { username: { startsWith: "simulasi_student_" } }
  });
  console.log("🧹 Test artifacts cleanly purged from database.");
}

runLoadTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
