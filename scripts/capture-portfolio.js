const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://172.16.0.210';
const JWT_SECRET = 'cbt-modern-super-secret-key-pasundan-2026';

const OUTPUT_DIR = path.join(__dirname, '..', 'portfolio_screenshots');
const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9ef88888-bb51-42f3-b2b4-1b248290043c\\portfolio_screenshots';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

async function run() {
  console.log('🚀 Launching Chrome for High-Res Portfolio Capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const page = await browser.newPage();

  async function snap(name, caption) {
    const file1 = path.join(OUTPUT_DIR, `${name}.png`);
    const file2 = path.join(ARTIFACT_DIR, `${name}.png`);
    await page.screenshot({ path: file1, fullPage: false });
    fs.copyFileSync(file1, file2);
    console.log(`📸 [${caption}] saved -> ${name}.png`);
  }

  try {
    // 1. LOGIN PORTAL
    console.log('1. Login Portal...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    await snap('01_login_portal', 'Login Portal CBT SMK Pasundan 2 Bandung');

    // 2. STUDENT DASHBOARD
    console.log('2. Student Dashboard...');
    const studentToken = makeToken({
      userId: 'siswa01-id',
      username: 'siswa01',
      name: 'Ahmad Fauzan',
      role: 'STUDENT',
      groupId: 'cm7a192'
    });
    await page.setCookie({
      name: 'cbt_token',
      value: studentToken,
      domain: '172.16.0.210',
      path: '/'
    });
    await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await snap('02_student_dashboard', 'Dashboard Siswa & Status Ujian');

    // 3. STUDENT EXAM ROOM
    console.log('3. Student Exam Room...');
    // Find first exam
    const examCardBtn = await page.$('button');
    // Navigate to exam page directly if known
    await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if there is an exam link
    const examLinks = await page.$$eval('a, button', els => els.map(e => ({ tag: e.tagName, text: e.innerText, href: e.href })));
    console.log('Found elements on student dashboard:', examLinks.length);

    // 4. ADMIN DASHBOARD
    console.log('4. Admin Dashboard...');
    const adminToken = makeToken({
      userId: 'admin-root-id',
      username: 'root',
      name: 'Administrator CBT',
      role: 'ADMIN'
    });
    await page.setCookie({
      name: 'cbt_token',
      value: adminToken,
      domain: '172.16.0.210',
      path: '/'
    });

    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('03_admin_dashboard', 'Dashboard Administrator & Live Monitoring');

    // 5. QUESTION BANK & REVIEW
    console.log('5. Bank Soal & Review...');
    await page.goto(`${BASE_URL}/admin/questions`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('04_question_bank_management', 'Manajemen Bank Soal & Review Editor KaTeX/Arabic');

    // 6. EXAM SCHEDULE & PROCTORING
    console.log('6. Manajemen Ujian...');
    await page.goto(`${BASE_URL}/admin/exams`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('05_exam_management_proctor', 'Manajemen Jadwal Ujian & Sesi Proktor');

    // 7. GRADES RECAP & EXPORT
    console.log('7. Rekap Nilai Siswa...');
    await page.goto(`${BASE_URL}/admin/grades`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('06_grades_recap_analytics', 'Rekapitulasi Nilai Siswa & Ekspor Data');

    // 8. PRINT EXAM CARDS
    console.log('8. Cetak Kartu Peserta...');
    await page.goto(`${BASE_URL}/admin/print/cards`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('07_print_exam_cards', 'Cetak Kartu Peserta Ujian Format Resmi A4');

    // 9. PRINT ATTENDANCE & MINUTES
    console.log('9. Berita Acara & Presensi...');
    await page.goto(`${BASE_URL}/admin/print/minutes`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await snap('08_print_official_minutes', 'Berita Acara Pelaksanaan Ujian (BAP)');

    console.log('✅ ALL SCREENSHOTS TAKEN SUCCESSFULLY!');
  } catch (e) {
    console.error('Error during capture:', e);
  } finally {
    await browser.close();
  }
}

run();
