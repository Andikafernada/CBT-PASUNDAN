
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. AUDIT BUTIR SOAL & OPSI ===");
  const typeCounts = await prisma.question.groupBy({
    by: ['type'],
    _count: { id: true }
  });
  console.log("Distribusi Jenis Soal di Database:");
  for (const t of typeCounts) {
    console.log(`  - ${t.type}: ${t._count.id} butir soal`);
  }

  const totalQuestions = await prisma.question.count();
  const totalOptions = await prisma.questionOption.count();
  const totalPairs = await prisma.matchingPair.count();
  console.log(`Total Soal: ${totalQuestions}, Total Opsi PG/Kompleks/TF: ${totalOptions}, Total Pasangan Menjodohkan: ${totalPairs}`);

  // Cek apakah ada soal PG tanpa opsi
  const mcWithoutOptions = await prisma.question.count({
    where: {
      type: { in: ['MULTIPLE_CHOICE', 'MULTIPLE_CHOICE_COMPLEX', 'TRUE_FALSE'] },
      options: { none: {} }
    }
  });
  console.log(`Soal Pilihan Ganda / TF tanpa opsi: ${mcWithoutOptions} (Harus 0)`);

  // Cek apakah ada soal Matching tanpa matching pairs
  const matchingWithoutPairs = await prisma.question.count({
    where: {
      type: 'MATCHING',
      matchingPairs: { none: {} }
    }
  });
  console.log(`Soal Menjodohkan tanpa pairs: ${matchingWithoutPairs} (Harus 0)`);

  console.log("\n=== 2. AUDIT PAKET UJIAN & KETERIKATAN SOAL ===");
  const exams = await prisma.exam.findMany({
    select: {
      id: true,
      title: true,
      code: true,
      _count: {
        select: {
          examQuestions: true,
          examSessions: true
        }
      }
    }
  });
  const examsWithZeroQuestions = exams.filter(e => e._count.examQuestions === 0);
  const examsWithQuestions = exams.filter(e => e._count.examQuestions > 0);
  console.log(`Total Paket Ujian: ${exams.length}`);
  console.log(`Paket Ujian dengan butir soal terikat: ${examsWithQuestions.length}`);
  console.log(`Paket Ujian dengan 0 butir soal: ${examsWithZeroQuestions.length}`);
  if (examsWithQuestions.length > 0) {
    console.log("Contoh ujian yang sudah terikat soal:");
    for (const eq of examsWithQuestions.slice(0, 5)) {
      console.log(`  - [${eq.code}] ${eq.title}: ${eq._count.examQuestions} soal, ${eq._count.examSessions} sesi siswa`);
    }
  }

  console.log("\n=== 3. AUDIT RIWAYAT SESI & JAWABAN SISWA (AKTUAL) ===");
  const sessions = await prisma.examSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: { select: { name: true, username: true } },
      exam: { select: { title: true, code: true } },
      answers: {
        include: {
          question: { select: { type: true } }
        }
      }
    }
  });

  console.log(`Ditemukan ${sessions.length} sesi pengerjaan terakhir:`);
  for (const s of sessions) {
    const byType = {};
    for (const a of s.answers) {
      const t = a.question.type;
      byType[t] = (byType[t] || 0) + 1;
    }
    console.log(`Sesi [${s.id}] Siswa: ${s.user.name} | Status: ${s.status} | Nilai: ${s.score}`);
    console.log(`   Ujian: ${s.exam.title} (${s.exam.code})`);
    console.log(`   Total Jawaban Tersimpan: ${s.answers.length} butir -> Rincian tipe:`, JSON.stringify(byType));
  }

  console.log("\n=== 4. AUDIT PENILAIAN AI PADA JAWABAN ESSAY ===");
  const essayAnswers = await prisma.studentAnswer.findMany({
    where: {
      question: { type: 'ESSAY' },
      essayAnswer: { not: null }
    },
    take: 10,
    orderBy: { updatedAt: 'desc' },
    include: {
      question: { select: { content: true } },
      session: { select: { user: { select: { name: true } } } }
    }
  });

  console.log(`Ditemukan ${essayAnswers.length} jawaban essay terakhir:`);
  for (const ea of essayAnswers) {
    console.log(`- ID Jawaban: ${ea.id}`);
    console.log(`  Siswa: ${ea.session.user.name}`);
    console.log(`  Soal: "${ea.question.content?.substring(0, 50)}..."`);
    console.log(`  Jawaban Siswa: "${ea.essayAnswer?.substring(0, 60)}..."`);
    console.log(`  Skor: ${ea.score} | Dinilai AI: ${ea.aiGraded ? 'YA' : 'TIDAK'} | Feedback AI: ${ea.aiFeedback || '-'}`);
  }

  console.log("\n=== 5. AUDIT JAWABAN MENJODOHKAN (MATCHING) ===");
  const matchingAnswers = await prisma.studentAnswer.findMany({
    where: {
      question: { type: 'MATCHING' },
      matchingAnswer: { not: null }
    },
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      question: { select: { content: true } }
    }
  });
  console.log(`Ditemukan ${matchingAnswers.length} jawaban menjodohkan tersimpan:`);
  for (const ma of matchingAnswers) {
    console.log(`- ID: ${ma.id}, Skor: ${ma.score}`);
    console.log(`  Data Matching Siswa:`, JSON.stringify(ma.matchingAnswer));
  }
}

main().finally(() => prisma.$disconnect());
