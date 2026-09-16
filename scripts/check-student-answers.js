
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 MEMERIKSA HASIL JAWABAN SISWA PENGUJI (siswadns)...');

  const student = await prisma.user.findUnique({
    where: { username: 'siswadns' }
  });

  if (!student) {
    console.log('❌ Akun siswadns tidak ditemukan.');
    return;
  }

  const session = await prisma.examSession.findFirst({
    where: { userId: student.id },
    include: {
      exam: true,
      answers: {
        include: {
          question: {
            include: { options: true, matchingPairs: true }
          }
        }
      },
      violationLogs: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!session) {
    console.log('⚠️ Belum ada sesi ujian yang ditemukan untuk siswadns.');
    return;
  }

  console.log('\n==================================================');
  console.log('📊 DAFTAR REKAP HASIL UJIAN SISWA');
  console.log('==================================================');
  console.log('👤 Nama Siswa     :', student.name, '(', student.username, ')');
  console.log('📋 Judul Ujian    :', session.exam.title);
  console.log('🚩 Status Ujian   :', session.status);
  console.log('🏆 NILAI AKHIR    :', session.score !== null ? session.score + ' / 100' : 'Belum Selesai (Sedang Dikerjakan)');
  console.log('⏱️ Sisa Waktu     :', Math.floor(session.remainingSeconds / 60), 'menit', session.remainingSeconds % 60, 'detik');
  console.log('⚠️ Pelanggaran    :', session.violationCount, 'kali');
  console.log('==================================================\n');

  console.log('📝 RINCIAN PERTANYAAN & JAWABAN SISWA:');
  console.log('--------------------------------------------------');

  const answers = session.answers;
  answers.forEach((ans, idx) => {
    const q = ans.question;
    console.log(`\n[No. ${idx + 1}] (${q.type}) ${q.content}`);
    console.log(`    Bobot Maks: ${q.points} Poin`);

    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
      const selected = ans.selectedOptionIds ? JSON.parse(ans.selectedOptionIds) : [];
      const chosenOpt = q.options.find(o => selected.includes(o.id));
      const correctOpt = q.options.find(o => o.isCorrect);
      console.log(`    Jawaban Siswa : ${chosenOpt ? chosenOpt.content : '(Kosong)'}`);
      console.log(`    Kunci Benar   : ${correctOpt ? correctOpt.content : '-'}`);
    } else if (q.type === 'COMPLEX_MULTIPLE_CHOICE') {
      const selected = ans.selectedOptionIds ? JSON.parse(ans.selectedOptionIds) : [];
      const chosenOpts = q.options.filter(o => selected.includes(o.id)).map(o => o.content);
      const correctOpts = q.options.filter(o => o.isCorrect).map(o => o.content);
      console.log(`    Jawaban Siswa : ${chosenOpts.join(' | ') || '(Kosong)'}`);
      console.log(`    Kunci Benar   : ${correctOpts.join(' | ')}`);
    } else if (q.type === 'MATCHING') {
      console.log(`    Jawaban Matching Siswa : ${ans.matchingAnswer || '(Kosong)'}`);
    } else if (q.type === 'ESSAY') {
      console.log(`    Jawaban Teks Siswa    : ${ans.textAnswer || '(Kosong)'}`);
      console.log(`    Rubrik Acuan Guru     : ${q.rubric || '-'}`);
    }

    console.log(`    Status Kategori       : ${ans.isDoubtful ? '🟡 Ragu-Ragu' : '⚪ Pas'}`);
    console.log(`    Skor Diberikan        : ${ans.scoreAwarded} / ${q.points}`);
    if (ans.teacherFeedback) {
      console.log(`    💬 Feedback AI        : ${ans.teacherFeedback}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
