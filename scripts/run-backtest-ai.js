
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateAndFinishSession } = require('../src/lib/exam-score');

async function runBacktest() {
  console.log('🚀 MEMULAI BACKTEST FITUR AI AUTO-GRADER...');

  // 1. Cari atau buat Subject & Question Esai dengan Rubrik
  let subject = await prisma.subject.findFirst();
  if (!subject) {
    subject = await prisma.subject.create({
      data: { name: 'Jaringan Komputer Test', code: 'JARKOM-TEST' }
    });
  }

  const question = await prisma.question.create({
    data: {
      subjectId: subject.id,
      type: 'ESSAY',
      content: 'Jelaskan perbedaan mendasar antara protokol TCP dan UDP dalam pengiriman data jaringan!',
      rubric: 'TCP bersifat connection-oriented menggunakan 3-way handshake untuk meyakinkan pengiriman data yang andal. Sedangkan UDP bersifat connectionless, lebih cepat, dan tanpa jaminan pengiriman.',
      points: 10.0,
      difficulty: 'MEDIUM'
    }
  });

  console.log('✅ [1/4] Soal Esai Uji Coba Berhasil Dibuat:');
  console.log('    ID Soal:', question.id);
  console.log('    Rubrik Acuan:', question.rubric);

  // 2. Buat Ujian Uji Coba (Exam)
  const exam = await prisma.exam.create({
    data: {
      title: 'Ujian Backtest AI Auto-Grader',
      code: 'BACKTEST-' + Date.now(),
      subjectId: subject.id,
      durationMinutes: 60,
      token: 'AITEST',
      isPublished: true,
      examQuestions: {
        create: [{ questionId: question.id, orderIndex: 0, score: 10.0 }]
      }
    }
  });

  console.log('✅ [2/4] Ujian Backtest Berhasil Dibuat (Exam ID:', exam.id, ')');

  // 3. Cari User Siswa & Sesi Ujian (ExamSession)
  let student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!student) {
    student = await prisma.user.findFirst({ where: { username: 'siswa1' } });
  }

  const session = await prisma.examSession.create({
    data: {
      examId: exam.id,
      userId: student.id,
      status: 'IN_PROGRESS',
      remainingSeconds: 3600
    }
  });

  // Simulasi Siswa Menjawab Soal Esai
  const studentAnswerText = 'Protokol TCP bersifat connection-oriented yang menggunakan 3-way handshake sehingga meyakinkan dan andal dalam pengiriman data. Sementara UDP bersifat connectionless, sangat cepat, tetapi tanpa jaminan pengiriman data.';

  const answer = await prisma.examAnswer.create({
    data: {
      sessionId: session.id,
      questionId: question.id,
      textAnswer: studentAnswerText
    }
  });

  console.log('✅ [3/4] Sesi Ujian & Jawaban Siswa Berhasil Disimpan:');
  console.log('    Siswa:', student.name, '(', student.username, ')');
  console.log('    Teks Jawaban Siswa:', studentAnswerText);

  // 4. Jalankan Scoring Engine dengan AI Auto-Grader (Submit Exam)
  console.log('⏳ [4/4] Mengeksekusi Auto-Scoring Engine AI...');
  const result = await calculateAndFinishSession(session.id, 'SELF');

  // Ambil Jawaban Terupdate
  const updatedAnswer = await prisma.examAnswer.findUnique({
    where: { id: answer.id }
  });

  console.log('\n==================================================');
  console.log('🎉 HASIL BACKTEST SIMULASI UJIAN SELESAI!');
  console.log('==================================================');
  console.log('📊 Status Sesi Ujian :', result.status);
  console.log('🏆 Nilai Akhir Siswa  :', result.score, '/ 100');
  console.log('🤖 Poin Poin Esai    :', updatedAnswer.scoreAwarded, '/ 10.0');
  console.log('🏷️ Status AI Graded  :', updatedAnswer.isAiGraded ? 'YA (Terverifikasi AI)' : 'TIDAK');
  console.log('💬 AI Feedback       :', updatedAnswer.teacherFeedback);
  console.log('==================================================\n');

  // Cleanup data test
  await prisma.examSession.delete({ where: { id: session.id } });
  await prisma.exam.delete({ where: { id: exam.id } });
  await prisma.question.delete({ where: { id: question.id } });
  console.log('🧹 Data Uji Coba Backtest Berhasil Dibersihkan (Clean State).');
}

runBacktest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
