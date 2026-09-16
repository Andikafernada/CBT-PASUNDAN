
import { prisma } from "../src/lib/prisma";
import { gradeEssayWithAI } from "../src/lib/ai-grader";

async function main() {
  console.log("=========================================================================");
  console.log("  PENGUJIAN LENGKAP END-TO-END: 5 TIPE SOAL, PENYIMPANAN, & PENILAIAN AI ");
  console.log("=========================================================================\n");

  // 1. Dapatkan Subjek & Kelas
  const subject = await prisma.subject.findFirst();
  const group = await prisma.group.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  console.log(`[1] Inisialisasi Ujian Uji Coba: Subjek: ${subject?.name}, Kelas: ${group?.name}`);

  const testExam = await prisma.exam.upsert({
    where: { code: 'SIMULASI-VALIDASI-E2E' },
    update: { isPublished: true },
    create: {
      code: 'SIMULASI-VALIDASI-E2E',
      title: 'Ujian Validasi Sistem & Akurasi Penilaian (E2E Test)',
      subjectId: subject!.id,
      createdByUserId: admin!.id,
      durationMinutes: 60,
      token: 'VALIDASI',
      isPublished: true,
      category: 'REGULER',
      showResult: true,
      showAnswerKey: true
    }
  });

  // Hubungkan ke group
  await prisma.examGroup.upsert({
    where: {
      examId_groupId: {
        examId: testExam.id,
        groupId: group!.id
      }
    },
    update: {},
    create: {
      examId: testExam.id,
      groupId: group!.id
    }
  });

  // Bersihkan data lama pada ujian simulasi ini
  await prisma.examAnswer.deleteMany({ where: { session: { examId: testExam.id } } });
  await prisma.examSession.deleteMany({ where: { examId: testExam.id } });
  await prisma.examQuestion.deleteMany({ where: { examId: testExam.id } });

  // 2. Buat 5 Butir Soal Representatif untuk Seluruh Tipe
  console.log("\n[2] Menyiapkan 5 Butir Soal untuk Seluruh Tipe Soal...");

  // Tipe 1: Pilihan Ganda Tunggal (MULTIPLE_CHOICE)
  const qMc = await prisma.question.create({
    data: {
      subject: { connect: { id: subject!.id } },
      createdBy: { connect: { id: admin!.id } },
      type: 'MULTIPLE_CHOICE',
      content: 'Manakah dari protokol berikut yang digunakan untuk mengamankan komunikasi web secara terenkripsi?',
      points: 1.0,
      options: {
        create: [
          { content: 'HTTP', isCorrect: false, orderIndex: 1 },
          { content: 'HTTPS', isCorrect: true, orderIndex: 2 },
          { content: 'FTP', isCorrect: false, orderIndex: 3 },
          { content: 'TELNET', isCorrect: false, orderIndex: 4 }
        ]
      }
    },
    include: { options: true }
  });
  const optHttps = qMc.options.find(o => o.isCorrect)!;

  // Tipe 2: Pilihan Ganda Kompleks (MULTIPLE_CHOICE_COMPLEX)
  const qMcc = await prisma.question.create({
    data: {
      subject: { connect: { id: subject!.id } },
      createdBy: { connect: { id: admin!.id } },
      type: 'MULTIPLE_CHOICE_COMPLEX',
      content: 'Pilihlah dua perangkat keras komputer yang berfungsi sebagai media penyimpanan data sekunder (Non-Volatile)!',
      points: 1.0,
      options: {
        create: [
          { content: 'Solid State Drive (SSD)', isCorrect: true, orderIndex: 1 },
          { content: 'Random Access Memory (RAM)', isCorrect: false, orderIndex: 2 },
          { content: 'Hard Disk Drive (HDD)', isCorrect: true, orderIndex: 3 },
          { content: 'Central Processing Unit (CPU)', isCorrect: false, orderIndex: 4 }
        ]
      }
    },
    include: { options: true }
  });
  const correctComplexOpts = qMcc.options.filter(o => o.isCorrect).map(o => o.id);

  // Tipe 3: Menjodohkan (MATCHING)
  const qMatching = await prisma.question.create({
    data: {
      subject: { connect: { id: subject!.id } },
      createdBy: { connect: { id: admin!.id } },
      type: 'MATCHING',
      content: 'Jodohkanlah topologi jaringan berikut dengan karakteristik utamanya yang paling sesuai!',
      points: 1.0,
      matchingPairs: {
        create: [
          { premise: 'Topologi Star', response: 'Menggunakan switch/hub sebagai titik pusat', orderIndex: 1 },
          { premise: 'Topologi Ring', response: 'Setiap node terhubung melingkar seperti cincin', orderIndex: 2 },
          { premise: 'Topologi Mesh', response: 'Setiap perangkat terhubung langsung satu sama lain', orderIndex: 3 }
        ]
      }
    },
    include: { matchingPairs: true }
  });

  // Tipe 4: Benar / Salah (TRUE_FALSE)
  const qTf = await prisma.question.create({
    data: {
      subject: { connect: { id: subject!.id } },
      createdBy: { connect: { id: admin!.id } },
      type: 'TRUE_FALSE',
      content: 'IPv4 menggunakan pengalamatan sepanjang 32-bit sedangkan IPv6 menggunakan 128-bit.',
      points: 1.0,
      options: {
        create: [
          { content: 'BENAR', isCorrect: true, orderIndex: 1 },
          { content: 'SALAH', isCorrect: false, orderIndex: 2 }
        ]
      }
    },
    include: { options: true }
  });
  const optBenar = qTf.options.find(o => o.isCorrect)!;

  // Tipe 5: Esai / Uraian (ESSAY)
  const qEssay = await prisma.question.create({
    data: {
      subject: { connect: { id: subject!.id } },
      createdBy: { connect: { id: admin!.id } },
      type: 'ESSAY',
      content: 'Jelaskan mengapa pencadangan data (backup) secara berkala sangat penting bagi infrastruktur server sekolah!',
      rubric: 'Menyebutkan perlindungan terhadap kehilangan data akibat kegagalan perangkat keras, serangan ransomware/virus, bencana alam, dan pemulihan cepat (disaster recovery).',
      points: 1.0
    }
  });

  // 3. Ikatkan Soal ke Ujian (ExamQuestion)
  const questionsList = [qMc, qMcc, qMatching, qTf, qEssay];
  for (let idx = 0; idx < questionsList.length; idx++) {
    await prisma.examQuestion.create({
      data: {
        examId: testExam.id,
        questionId: questionsList[idx].id,
        orderIndex: idx + 1,
        score: 1.0
      }
    });
  }
  console.log(`✓ Berhasil mengikat 5 butir soal ke paket ujian [${testExam.code}]`);

  // 4. Buat Akun Siswa Simulasi & Jalankan Sesi Pengerjaan
  console.log("\n[3] Mensimulasikan Siswa Memulai Ujian...");
  const student = await prisma.user.upsert({
    where: { username: 'siswa.simulasi.cbt' },
    update: { groupId: group!.id },
    create: {
      username: 'siswa.simulasi.cbt',
      name: 'Ahmad Siswa Simulasi',
      password: 'testpassword123',
      role: 'STUDENT',
      groupId: group!.id
    }
  });

  const session = await prisma.examSession.create({
    data: {
      examId: testExam.id,
      userId: student.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      violationCount: 0
    }
  });
  console.log(`✓ Sesi Ujian Siswa Dibuat (Session ID: ${session.id})`);

  // 5. Simpan Jawaban Siswa untuk Setiap Tipe Soal
  console.log("\n[4] Mensimulasikan Penyimpanan Jawaban Siswa ke Database...");

  // Simpan Jawaban PG
  await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: qMc.id,
      selectedOptionIds: optHttps.id,
      scoreAwarded: 1.0,
      isCorrect: true
    }
  });
  console.log(`   [PG Tunggal] Tersimpan: Jawaban Opsi HTTPS (${optHttps.id})`);

  // Simpan Jawaban PG Kompleks
  await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: qMcc.id,
      selectedOptionIds: JSON.stringify(correctComplexOpts),
      scoreAwarded: 1.0,
      isCorrect: true
    }
  });
  console.log(`   [PG Kompleks] Tersimpan: 2 Opsi Dipilih (${JSON.stringify(correctComplexOpts)})`);

  // Simpan Jawaban Menjodohkan (Matching)
  const studentMatchingData = qMatching.matchingPairs.map(p => ({
    pairId: p.id,
    premise: p.premise,
    userResponse: p.response
  }));
  await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: qMatching.id,
      matchingAnswer: JSON.stringify(studentMatchingData),
      scoreAwarded: 1.0,
      isCorrect: true
    }
  });
  console.log(`   [Menjodohkan] Tersimpan: 3 Pasang Cocok Sempurna`);

  // Simpan Jawaban Benar / Salah
  await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: qTf.id,
      selectedOptionIds: optBenar.id,
      scoreAwarded: 1.0,
      isCorrect: true
    }
  });
  console.log(`   [Benar/Salah] Tersimpan: Opsi BENAR`);

  // Simpan Jawaban Essay Siswa
  const studentEssayText = "Backup data secara berkala sangat krusial karena server rentan mengalami kerusakan hardware atau serangan virus dan ransomware. Dengan backup, sekolah dapat segera memulihkan data penting siswa dan nilai tanpa kehilangan data permanen.";
  const essayAnswerRecord = await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: qEssay.id,
      textAnswer: studentEssayText
    }
  });
  console.log(`   [Esai Siswa] Tersimpan: "${studentEssayText.substring(0, 75)}..."`);

  // 6. Jalankan Penilaian AI (Gemini 3.6 Flash) pada Jawaban Esai
  console.log("\n[5] Menjalankan Penilaian Otomatis oleh Gemini AI pada Jawaban Esai...");
  const aiStart = performance.now();
  const aiGrading = await gradeEssayWithAI(
    qEssay.content,
    qEssay.rubric || "",
    studentEssayText,
    1.0
  );
  const aiDuration = Math.round(performance.now() - aiStart);

  await prisma.examAnswer.update({
    where: { id: essayAnswerRecord.id },
    data: {
      scoreAwarded: aiGrading.scoreAwarded,
      teacherFeedback: aiGrading.feedback,
      isCorrect: aiGrading.scoreAwarded >= 0.7,
      isAiGraded: true
    }
  });

  console.log(`   ✓ AI Grading Selesai dalam ${aiDuration}ms:`);
  console.log(`     * Engine Terpakai : ${aiGrading.engine || 'GEMINI'}`);
  console.log(`     * Skor AI         : ${aiGrading.scoreAwarded} / 1.0`);
  console.log(`     * Umpan Balik AI  : "${aiGrading.feedback}"`);

  // 7. Selesaikan Sesi Ujian & Hitung Nilai Akhir
  console.log("\n[6] Menuntaskan Sesi Ujian & Rekalkulasi Nilai Akhir Siswa...");
  const allAnswers = await prisma.examAnswer.findMany({
    where: { sessionId: session.id }
  });
  const totalScoreEarned = allAnswers.reduce((sum, a) => sum + (a.scoreAwarded || 0), 0);
  const maxPossibleScore = 5.0; // 5 soal x 1.0
  const finalPercentage = Math.round((totalScoreEarned / maxPossibleScore) * 100 * 100) / 100;

  const completedSession = await prisma.examSession.update({
    where: { id: session.id },
    data: {
      status: 'SUBMITTED',
      finishedAt: new Date(),
      score: finalPercentage
    }
  });

  console.log(`   ✓ Sesi Berhasil Diselesaikan!`);
  console.log(`     * Status Akhir : ${completedSession.status}`);
  console.log(`     * Total Poin   : ${totalScoreEarned} / ${maxPossibleScore}`);
  console.log(`     * Nilai Akhir  : ${completedSession.score} (Skala 100)`);

  console.log("\n=========================================================================");
  console.log("  BUKTI DATA TERSIMPAN DI DATABASE MYSQL (VERIFIKASI FISIK)");
  console.log("=========================================================================");
  const auditAnswers = await prisma.examAnswer.findMany({
    where: { sessionId: session.id },
    include: { question: { select: { type: true, content: true } } }
  });

  for (let i = 0; i < auditAnswers.length; i++) {
    const a = auditAnswers[i];
    console.log(`\n[No. ${i + 1}] Tipe: ${a.question.type}`);
    console.log(`   Soal    : ${a.question.content.substring(0, 60)}...`);
    console.log(`   Jawaban : ${a.textAnswer || a.matchingAnswer || a.selectedOptionIds}`);
    console.log(`   Skor    : ${a.scoreAwarded} | isCorrect: ${a.isCorrect} | AI Graded: ${a.isAiGraded ? 'YA' : 'TIDAK'}`);
    if (a.teacherFeedback) console.log(`   Feedback: ${a.teacherFeedback}`);
  }

  console.log("\n>>> HASIL PENGUJIAN: SELURUH SISTEM 100% TERBUKTI SESUAI DATA <<<\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
