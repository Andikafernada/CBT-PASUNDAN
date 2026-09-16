const bcrypt = require('bcryptjs');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('--- Starting Seeding for 800 Students Backtest ---');

  // 1. Group
  let group = await prisma.group.findFirst({ where: { code: 'SESI-800' } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        code: 'SESI-800',
        name: 'Sesi Akbar 800 Peserta',
      }
    });
    console.log('Created Group:', group.code);
  } else {
    console.log('Existing Group found:', group.code);
  }

  // 2. 800 Student Accounts
  console.log('Ensuring 800 student accounts exist...');
  const existingCount = await prisma.user.count({
    where: { username: { startsWith: 'siswa' } }
  });

  if (existingCount < 800) {
    // Delete partial if any
    await prisma.examAnswer.deleteMany({ where: { session: { user: { username: { startsWith: 'siswa' } } } } });
    await prisma.examSession.deleteMany({ where: { user: { username: { startsWith: 'siswa' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'siswa' } } });

    const studentBatch = [];
    for (let i = 1; i <= 800; i++) {
      const pad = String(i).padStart(3, '0');
      studentBatch.push({
        username: `siswa${pad}`,
        name: `Peserta Ujian ${pad}`,
        password: bcrypt.hashSync('password123', 10),
        role: 'STUDENT',
        groupId: group.id,
        isActive: true,
        isLoginLocked: false,
        deviceFingerprint: null,
      });
    }

    const created = await prisma.user.createMany({
      data: studentBatch,
      skipDuplicates: true,
    });
    console.log(`Created ${created.count} student accounts.`);
  } else {
    console.log(`Already have ${existingCount} student accounts.`);
    // Reset login locks & fingerprints for fresh test
    await prisma.user.updateMany({
      where: { username: { startsWith: 'siswa' } },
      data: { isLoginLocked: false, deviceFingerprint: null }
    });
  }

  // 3. Subject
  let subject = await prisma.subject.findFirst({ where: { code: 'SIM-800' } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        code: 'SIM-800',
        name: 'Simulasi CBT 800 Siswa',
      }
    });
    console.log('Created Subject:', subject.code);
  } else {
    console.log('Existing Subject found:', subject.code);
  }

  // 4. Questions
  // Check if subject already has questions
  const qCount = await prisma.question.count({ where: { subjectId: subject.id } });
  if (qCount < 10) {
    console.log('Creating 10 questions with varied types...');
    // Clean old ones if partial
    await prisma.question.deleteMany({ where: { subjectId: subject.id } });

    // Q1-Q5: PILIHAN_GANDA
    for (let i = 1; i <= 5; i++) {
      await prisma.question.create({
        data: {
          subjectId: subject.id,
          type: 'MULTIPLE_CHOICE',
          content: `<p>Soal nomor ${i}: Berapakah hasil dari ${i * 10} + ${i * 5}?</p>`,
          points: 10.0,
          difficulty: 'MEDIUM',
          options: {
            create: [
              { content: `Opsi A: ${(i * 10) + (i * 5)}`, isCorrect: true, orderIndex: 0 },
              { content: `Opsi B: ${(i * 10) + (i * 5) + 5}`, isCorrect: false, orderIndex: 1 },
              { content: `Opsi C: ${(i * 10) + (i * 5) - 5}`, isCorrect: false, orderIndex: 2 },
              { content: `Opsi D: ${(i * 10) + (i * 5) + 10}`, isCorrect: false, orderIndex: 3 },
            ]
          }
        }
      });
    }

    // Q6-Q7: COMPLEX_MULTIPLE_CHOICE
    for (let i = 6; i <= 7; i++) {
      await prisma.question.create({
        data: {
          subjectId: subject.id,
          type: 'COMPLEX_MULTIPLE_CHOICE',
          content: `<p>Soal nomor ${i}: Manakah pernyataan yang benar mengenai protokol jaringan? (Pilih 2)</p>`,
          points: 10.0,
          difficulty: 'MEDIUM',
          options: {
            create: [
              { content: 'HTTP menggunakan port standar 80', isCorrect: true, orderIndex: 0 },
              { content: 'HTTPS menggunakan port standar 443', isCorrect: true, orderIndex: 1 },
              { content: 'DNS menggunakan port standar 22', isCorrect: false, orderIndex: 2 },
              { content: 'SSH menggunakan port standar 53', isCorrect: false, orderIndex: 3 },
            ]
          }
        }
      });
    }

    // Q8: TRUE_FALSE
    await prisma.question.create({
      data: {
        subjectId: subject.id,
        type: 'TRUE_FALSE',
        content: '<p>Soal nomor 8: MariaDB adalah sistem manajemen basis data relasional open source.</p>',
        points: 10.0,
        difficulty: 'EASY',
        options: {
          create: [
            { content: 'Benar', isCorrect: true, orderIndex: 0 },
            { content: 'Salah', isCorrect: false, orderIndex: 1 },
          ]
        }
      }
    });

    // Q9: MATCHING
    await prisma.question.create({
      data: {
        subjectId: subject.id,
        type: 'MATCHING',
        content: '<p>Soal nomor 9: Jodohkan protokol dengan layer OSI yang sesuai.</p>',
        points: 10.0,
        difficulty: 'HARD',
        matchingPairs: {
          create: [
            { premise: 'HTTP', response: 'Application Layer', orderIndex: 0 },
            { premise: 'TCP', response: 'Transport Layer', orderIndex: 1 },
            { premise: 'IP', response: 'Network Layer', orderIndex: 2 },
          ]
        }
      }
    });

    // Q10: ESSAY
    await prisma.question.create({
      data: {
        subjectId: subject.id,
        type: 'ESSAY',
        content: '<p>Soal nomor 10: Jelaskan keunggulan arsitektur sistem berbasis cluster PM2!</p>',
        rubric: 'Menjelaskan high availability, load balancing, multi-core CPU utilization',
        points: 10.0,
        difficulty: 'MEDIUM',
      }
    });

    console.log('Created 10 questions successfully.');
  }

  // 5. Exam
  let exam = await prisma.exam.findFirst({ where: { code: 'SIM-800' } });
  if (exam) {
    // Delete existing sessions so test starts clean
    await prisma.examAnswer.deleteMany({ where: { session: { examId: exam.id } } });
    await prisma.examSession.deleteMany({ where: { examId: exam.id } });
    console.log('Cleared existing sessions for exam SIM-800.');
  } else {
    exam = await prisma.exam.create({
      data: {
        title: 'Ujian Simulasi Akbar 800 Siswa',
        code: 'SIM-800',
        description: 'Simulasi beban serentak 800 siswa 1 sesi',
        subjectId: subject.id,
        durationMinutes: 10,
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() + 86400000), // 24 hours ahead
        token: 'SIM800',
        isTokenDynamic: false,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResult: true,
        showAnswerKey: false,
        isPublished: true,
      }
    });
    console.log('Created Exam:', exam.title, '(ID:', exam.id, ')');
  }

  // Link Group to Exam
  const groupLink = await prisma.examGroup.findUnique({
    where: { examId_groupId: { examId: exam.id, groupId: group.id } }
  });
  if (!groupLink) {
    await prisma.examGroup.create({
      data: {
        examId: exam.id,
        groupId: group.id,
      }
    });
    console.log('Linked Group to Exam.');
  }

  // Link all 10 questions to Exam
  const questions = await prisma.question.findMany({
    where: { subjectId: subject.id },
    orderBy: { createdAt: 'asc' }
  });

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    await prisma.examQuestion.upsert({
      where: { examId_questionId: { examId: exam.id, questionId: q.id } },
      create: {
        examId: exam.id,
        questionId: q.id,
        orderIndex: idx + 1,
        score: q.points,
      },
      update: {
        orderIndex: idx + 1,
        score: q.points,
      }
    });
  }
  console.log(`Linked ${questions.length} questions to Exam.`);

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log('EXAM_ID:', exam.id);
  console.log('TOKEN: SIM800');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
