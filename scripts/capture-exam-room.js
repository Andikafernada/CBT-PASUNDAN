const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://172.16.0.210';
const JWT_SECRET = 'cbt-modern-super-secret-key-pasundan-2026';

const OUTPUT_DIR = path.join(__dirname, '..', 'portfolio_screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9ef88888-bb51-42f3-b2b4-1b248290043c\\portfolio_screenshots';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

async function run() {
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  const exam = await prisma.exam.findFirst({
    include: {
      examQuestions: true
    }
  });

  if (!student || !exam) {
    console.log('No student or exam found');
    return;
  }

  console.log(`Using Student: ${student.name} (${student.username}) & Exam: ${exam.title} (${exam.id})`);

  // Ensure an ExamSession exists for this student & exam
  let session = await prisma.examSession.findFirst({
    where: { examId: exam.id, userId: student.id }
  });

  if (!session) {
    session = await prisma.examSession.create({
      data: {
        examId: exam.id,
        userId: student.id,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        remainingSeconds: exam.durationMinutes * 60,
      }
    });
  } else if (session.status === 'COMPLETED') {
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: 'IN_PROGRESS', remainingSeconds: 2400 }
    });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const page = await browser.newPage();

  const studentToken = makeToken({
    userId: student.id,
    username: student.username,
    name: student.name,
    role: 'STUDENT',
    groupId: student.groupId
  });

  await page.setCookie({
    name: 'cbt_token',
    value: studentToken,
    domain: '172.16.0.210',
    path: '/'
  });

  // Navigate to exam page
  await page.goto(`${BASE_URL}/student/exam/${exam.id}`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  const snap1 = path.join(OUTPUT_DIR, '09_student_exam_room_active.png');
  const snap2 = path.join(ARTIFACT_DIR, '09_student_exam_room_active.png');
  await page.screenshot({ path: snap1, fullPage: false });
  fs.copyFileSync(snap1, snap2);
  console.log('📸 [Ruang Ujian Siswa Aktif] saved -> 09_student_exam_room_active.png');

  // Also capture Exam Result page
  await page.goto(`${BASE_URL}/student/exam/${exam.id}/result`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  const res1 = path.join(OUTPUT_DIR, '10_exam_result_certificate.png');
  const res2 = path.join(ARTIFACT_DIR, '10_exam_result_certificate.png');
  await page.screenshot({ path: res1, fullPage: false });
  fs.copyFileSync(res1, res2);
  console.log('📸 [Hasil & Sertifikat Ujian Siswa] saved -> 10_exam_result_certificate.png');

  await browser.close();
  await prisma.$disconnect();
  console.log('🎉 ALL EXAM SCREENS CAPTURED!');
}

run().catch(console.error);
