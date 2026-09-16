
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:3000';
const CONCURRENCY_LIMIT = 100; // concurrent workers for smooth connection pooling

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function calculateStats(latencies, errors) {
  const n = latencies.length;
  if (n === 0) return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, errors: errors.length };
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  return {
    total: n + errors.length,
    success: n,
    errors: errors.length,
    min: Math.min(...latencies).toFixed(1),
    avg: (sum / n).toFixed(1),
    p50: percentile(latencies, 50).toFixed(1),
    p90: percentile(latencies, 90).toFixed(1),
    p95: percentile(latencies, 95).toFixed(1),
    p99: percentile(latencies, 99).toFixed(1),
    max: Math.max(...latencies).toFixed(1),
  };
}

async function runPool(items, limit, workerFn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const res = await workerFn(items[currentIndex], currentIndex);
      results[currentIndex] = res;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('================================================================');
  console.log('       ZYACBT MODERN - BACKTEST 800 SISWA DALAM 1 SESI          ');
  console.log('================================================================');

  const exam = await prisma.exam.findFirst({
    where: { code: 'SIM-800' },
    include: { examQuestions: { include: { question: { include: { options: true, matchingPairs: true } } } } }
  });

  if (!exam) {
    console.error('Exam SIM-800 not found! Please run seed first.');
    process.exit(1);
  }

  console.log(`Target Ujian : ${exam.title} (ID: ${exam.id})`);
  console.log(`Token Ujian  : ${exam.token}`);
  console.log(`Jumlah Soal  : ${exam.examQuestions.length} butir soal`);
  console.log(`Jumlah Siswa : 800 Siswa (siswa001 - siswa800)\n`);

  const students = [];
  for (let i = 1; i <= 800; i++) {
    const pad = String(i).padStart(3, '0');
    students.push({
      username: `siswa${pad}`,
      password: 'password123',
      cookie: null,
      sessionId: null,
      questions: [],
    });
  }

  // ============================================================================
  // TAHAP 1: AUTHENTICATION / LOGIN (800 SISWA)
  // ============================================================================
  console.log('--- [TAHAP 1/4] Melakukan Login Serentak 800 Siswa ---');
  const t1Start = performance.now();
  const loginLatencies = [];
  const loginErrors = [];

  await runPool(students, CONCURRENCY_LIMIT, async (student, idx) => {
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: student.username,
          password: student.password,
          deviceFingerprint: `device_sim_${student.username}`,
        }),
      });

      const latency = performance.now() - start;
      const setCookie = res.headers.get('set-cookie');
      if (res.ok && setCookie) {
        loginLatencies.push(latency);
        const match = setCookie.match(/cbt_token=([^;]+)/);
        student.cookie = match ? `cbt_token=${match[1]}` : setCookie.split(';')[0];
      } else {
        const text = await res.text();
        loginErrors.push({ username: student.username, status: res.status, text });
      }
    } catch (err) {
      loginErrors.push({ username: student.username, error: err.message });
    }
  });

  const t1Duration = (performance.now() - t1Start) / 1000;
  const loginStats = calculateStats(loginLatencies, loginErrors);
  console.log(`Hasil Tahap 1 (Login):`);
  console.log(`- Durasi Total   : ${t1Duration.toFixed(2)} detik`);
  console.log(`- Throughput     : ${(800 / t1Duration).toFixed(1)} req/detik`);
  console.log(`- Sukses         : ${loginStats.success} / 800 (${((loginStats.success / 800) * 100).toFixed(1)}%)`);
  console.log(`- Response Time  : Min: ${loginStats.min}ms | Avg: ${loginStats.avg}ms | P50: ${loginStats.p50}ms | P95: ${loginStats.p95}ms | P99: ${loginStats.p99}ms | Max: ${loginStats.max}ms\n`);

  if (loginStats.success < 750) {
    console.error('Terlalu banyak kegagalan login, menghentikan pengujian.');
    process.exit(1);
  }

  // ============================================================================
  // TAHAP 2: START EXAM (800 SISWA MULAI SESI UJIAN)
  // ============================================================================
  console.log('--- [TAHAP 2/4] Melakukan Start Ujian (Membuka Token & Soal) 800 Siswa ---');
  const t2Start = performance.now();
  const startLatencies = [];
  const startErrors = [];

  await runPool(students, CONCURRENCY_LIMIT, async (student) => {
    if (!student.cookie) return;
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': student.cookie,
        },
        body: JSON.stringify({
          token: 'SIM800',
          physicalState: 'FIT',
          readinessRate: 5,
        }),
      });

      const latency = performance.now() - start;
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.session) {
        startLatencies.push(latency);
        student.sessionId = data.session.id;
        student.questions = data.questions || [];
      } else {
        startErrors.push({ username: student.username, status: res.status, err: data.error });
      }
    } catch (err) {
      startErrors.push({ username: student.username, error: err.message });
    }
  });

  const t2Duration = (performance.now() - t2Start) / 1000;
  const startStats = calculateStats(startLatencies, startErrors);
  console.log(`Hasil Tahap 2 (Start Ujian):`);
  console.log(`- Durasi Total   : ${t2Duration.toFixed(2)} detik`);
  console.log(`- Throughput     : ${(800 / t2Duration).toFixed(1)} req/detik`);
  console.log(`- Sukses         : ${startStats.success} / 800 (${((startStats.success / 800) * 100).toFixed(1)}%)`);
  console.log(`- Response Time  : Min: ${startStats.min}ms | Avg: ${startStats.avg}ms | P50: ${startStats.p50}ms | P95: ${startStats.p95}ms | P99: ${startStats.p99}ms | Max: ${startStats.max}ms\n`);

  // ============================================================================
  // TAHAP 3: SAVE ANSWERS (MENJAWAB 10 SOAL OLEH 800 SISWA = 8,000 TRANSAKSI)
  // ============================================================================
  console.log('--- [TAHAP 3/4] Menyimpan Jawaban (10 Soal x 800 Siswa = 8,000 Simpan Jawaban) ---');
  const t3Start = performance.now();
  const answerLatencies = [];
  const answerErrors = [];

  // Siswa menjawab butir soal demi butir soal secara serentak
  for (let qIdx = 0; qIdx < 10; qIdx++) {
    const qBatchStart = performance.now();
    await runPool(students, CONCURRENCY_LIMIT, async (student) => {
      if (!student.cookie || !student.questions || student.questions.length === 0) return;
      const q = student.questions[qIdx] || student.questions[0];

      let payload = {
        questionId: q.id,
        remainingSeconds: 300,
        isDoubtful: false,
      };

      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        const correctOpt = (q.options || []).find(o => o.isCorrect) || (q.options || [])[0];
        payload.selectedOptionIds = correctOpt ? [correctOpt.id] : [];
      } else if (q.type === 'COMPLEX_MULTIPLE_CHOICE') {
        const opts = (q.options || []).slice(0, 2).map(o => o.id);
        payload.selectedOptionIds = opts;
      } else if (q.type === 'MATCHING') {
        const pairs = {};
        if (q.matchingPairs && q.matchingPairs.premises) {
          q.matchingPairs.premises.forEach((p, idx) => {
            const resp = (q.matchingPairs.responses || [])[idx];
            if (resp) pairs[p.id] = resp.text;
          });
        }
        payload.matchingAnswer = pairs;
      } else if (q.type === 'ESSAY') {
        payload.textAnswer = 'Arsitektur cluster PM2 mendistribusikan beban secara merata ke seluruh core CPU dan menjaga server selalu online.';
      }

      const start = performance.now();
      try {
        const res = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/save-answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': student.cookie,
          },
          body: JSON.stringify(payload),
        });

        const latency = performance.now() - start;
        if (res.ok) {
          answerLatencies.push(latency);
        } else {
          const text = await res.text();
          answerErrors.push({ username: student.username, questionId: q.id, status: res.status, text });
        }
      } catch (err) {
        answerErrors.push({ username: student.username, questionId: q.id, error: err.message });
      }
    });

    const qBatchDur = (performance.now() - qBatchStart) / 1000;
    process.stdout.write(`  [Soal ${qIdx + 1}/10] 800 siswa simpan jawaban: ${qBatchDur.toFixed(2)} detik | ${(800 / qBatchDur).toFixed(1)} req/s\r`);
  }
  console.log(''); // New line after progress

  const t3Duration = (performance.now() - t3Start) / 1000;
  const answerStats = calculateStats(answerLatencies, answerErrors);
  console.log(`Hasil Tahap 3 (Simpan 8,000 Jawaban):`);
  console.log(`- Durasi Total   : ${t3Duration.toFixed(2)} detik`);
  console.log(`- Throughput     : ${(8000 / t3Duration).toFixed(1)} req/detik`);
  console.log(`- Sukses         : ${answerStats.success} / 8000 (${((answerStats.success / 8000) * 100).toFixed(1)}%)`);
  console.log(`- Response Time  : Min: ${answerStats.min}ms | Avg: ${answerStats.avg}ms | P50: ${answerStats.p50}ms | P95: ${answerStats.p95}ms | P99: ${answerStats.p99}ms | Max: ${answerStats.max}ms\n`);

  // ============================================================================
  // TAHAP 4: FINISH EXAM (800 SISWA SELESAIKAN UJIAN)
  // ============================================================================
  console.log('--- [TAHAP 4/4] Selesaikan Ujian & Perhitungan Nilai 800 Siswa ---');
  const t4Start = performance.now();
  const finishLatencies = [];
  const finishErrors = [];

  await runPool(students, CONCURRENCY_LIMIT, async (student) => {
    if (!student.cookie) return;
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': student.cookie,
        },
        body: JSON.stringify({}),
      });

      const latency = performance.now() - start;
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        finishLatencies.push(latency);
      } else {
        finishErrors.push({ username: student.username, status: res.status, err: data.error });
      }
    } catch (err) {
      finishErrors.push({ username: student.username, error: err.message });
    }
  });

  const t4Duration = (performance.now() - t4Start) / 1000;
  const finishStats = calculateStats(finishLatencies, finishErrors);
  console.log(`Hasil Tahap 4 (Selesaikan Ujian):`);
  console.log(`- Durasi Total   : ${t4Duration.toFixed(2)} detik`);
  console.log(`- Throughput     : ${(800 / t4Duration).toFixed(1)} req/detik`);
  console.log(`- Sukses         : ${finishStats.success} / 800 (${((finishStats.success / 800) * 100).toFixed(1)}%)`);
  console.log(`- Response Time  : Min: ${finishStats.min}ms | Avg: ${finishStats.avg}ms | P50: ${finishStats.p50}ms | P95: ${finishStats.p95}ms | P99: ${finishStats.p99}ms | Max: ${finishStats.max}ms\n`);

  // ============================================================================
  // VERIFIKASI BASIS DATA (DATABASE INTEGRITY CHECK)
  // ============================================================================
  console.log('--- Verifikasi Data di MariaDB ---');
  const dbCompletedSessions = await prisma.examSession.count({
    where: { examId: exam.id, status: 'COMPLETED' },
  });
  const dbTotalAnswers = await prisma.examAnswer.count({
    where: { session: { examId: exam.id } },
  });
  const scoresAgg = await prisma.examSession.aggregate({
    where: { examId: exam.id, status: 'COMPLETED' },
    _avg: { score: true },
    _max: { score: true },
    _min: { score: true },
  });

  console.log(`- Total Sesi COMPLETED di Database : ${dbCompletedSessions} / 800`);
  console.log(`- Total Jawaban Tersimpan di DB    : ${dbTotalAnswers} / 8000`);
  console.log(`- Rata-rata Nilai Siswa            : ${scoresAgg._avg.score?.toFixed(1) || 0}`);
  console.log(`- Nilai Tertinggi                  : ${scoresAgg._max.score || 0}`);
  console.log(`- Nilai Terendah                   : ${scoresAgg._min.score || 0}\n`);

  const grandTotalReq = loginStats.total + startStats.total + answerStats.total + finishStats.total;
  const grandSuccessReq = loginStats.success + startStats.success + answerStats.success + finishStats.success;
  const grandTotalTime = t1Duration + t2Duration + t3Duration + t4Duration;

  console.log('================================================================');
  console.log('                    RINGKASAN AKHIR BACKTEST                    ');
  console.log('================================================================');
  console.log(`Total HTTP Request Dilayani : ${grandTotalReq} requests`);
  console.log(`Request Berhasil (200 OK)   : ${grandSuccessReq} / ${grandTotalReq} (${((grandSuccessReq / grandTotalReq) * 100).toFixed(2)}%)`);
  console.log(`Total Waktu Simulasi        : ${grandTotalTime.toFixed(2)} detik`);
  console.log(`Rata-rata Keseluruhan RPS   : ${(grandTotalReq / grandTotalTime).toFixed(1)} req/detik`);
  console.log('================================================================');

  await prisma.$disconnect();
}

main().catch(e => { console.error('Backtest Error:', e); process.exit(1); });
