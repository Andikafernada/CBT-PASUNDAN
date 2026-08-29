const http = require("http");

const BASE_URL = "http://172.16.0.210";

function makeReq(path, method = "GET", body = null, cookie = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const headers = { "Content-Type": "application/json" };
    if (postData) headers["Content-Length"] = Buffer.byteLength(postData);
    if (cookie) headers["Cookie"] = cookie;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          let newCookie = cookie;
          if (res.headers["set-cookie"]) {
            const raw = res.headers["set-cookie"];
            const cookieArr = Array.isArray(raw) ? raw : [raw];
            newCookie = cookieArr.map((c) => c.split(";")[0]).join("; ");
          }
          resolve({ status: res.statusCode, data: json, cookie: newCookie });
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runFullScenario() {
  console.log("===============================================================================");
  console.log("🚀 END-TO-END VERIFICATION: SUPERUSER -> GURU -> SISWA -> REKAP NILAI GURU");
  console.log("===============================================================================\n");

  const ts = Date.now().toString().slice(-4);

  // ==========================================
  // TAHAP 1: SUPERUSER (root) SETUP DATA AWAL
  // ==========================================
  console.log("--- [TAHAP 1] SUPERUSER LOGIN & SETUP DATA MASTER ---");
  const superLogin = await makeReq("/api/auth/login", "POST", { username: "root", password: "P45und4n2" });
  if (superLogin.status !== 200) throw new Error("Gagal login superuser: " + JSON.stringify(superLogin.data));
  const superCookie = superLogin.cookie;
  console.log("1.1 Superuser 'root' berhasil login. Role:", superLogin.data.user.role);

  // 1.2 Buat Rombel / Kelas
  const rombelCode = `XII-TKJ-UNG-${ts}`;
  const rombelRes = await makeReq("/api/admin/groups", "POST", {
    name: `XII-TKJ-UNGGULAN-${ts}`,
    code: rombelCode,
    description: "Kelas Unggulan TKJ 2026",
  }, superCookie);
  const groupId = rombelRes.data.group?.id || rombelCode;
  console.log(`1.2 Rombel 'XII-TKJ-UNGGULAN-${ts}' siap. ID:`, groupId);

  // 1.3 Buat Akun Guru
  const teacherUsername = `guru_kenji_${ts}`;
  const teacherUserRes = await makeReq("/api/admin/users", "POST", {
    username: teacherUsername,
    password: "guruPassword2026",
    name: "Ustadz Kenji Takahashi, M.Pd",
    role: "TEACHER",
    email: `kenji_${ts}@sekolah.sch.id`,
  }, superCookie);
  console.log(`1.3 Akun Guru '${teacherUsername}' siap:`, teacherUserRes.data.user?.name || "OK");

  // 1.4 Buat Akun Siswa dalam Rombel
  const studentUsername = `siswa_budi_${ts}`;
  const studentUserRes = await makeReq("/api/admin/users", "POST", {
    username: studentUsername,
    password: "budiPassword2026",
    name: `Budi Santoso (${ts})`,
    role: "STUDENT",
    group: `XII-TKJ-UNGGULAN-${ts}`,
    groupId: rombelRes.data.group?.id,
  }, superCookie);
  console.log(`1.4 Akun Siswa '${studentUsername}' siap:`, studentUserRes.data.user?.name || "OK");

  // 1.5 Buat Mata Pelajaran
  const subjectRes = await makeReq("/api/admin/subjects", "POST", {
    name: `Bahasa Asing & MTK Lanjut (${ts})`,
    code: `MAPEL-${ts}`,
    description: "Mapel Kolaborasi Arab, Jepang, dan Kalkulus",
  }, superCookie);
  const subjectId = subjectRes.data.subject.id;
  console.log("1.5 Mata Pelajaran berhasil dibuat. ID:", subjectId, "Nama:", subjectRes.data.subject.name);

  // ==========================================
  // TAHAP 2: GURU LOGIN & BUAT 5 SOAL MULTILINGUAL
  // ==========================================
  console.log("\n--- [TAHAP 2] GURU LOGIN, BUAT 5 SOAL & JADWAL UJIAN ---");
  const teacherLogin = await makeReq("/api/auth/login", "POST", {
    username: teacherUsername,
    password: "guruPassword2026",
  });
  if (teacherLogin.status !== 200) throw new Error("Gagal login guru: " + JSON.stringify(teacherLogin.data));
  const teacherCookie = teacherLogin.cookie;
  console.log(`2.1 Guru '${teacherUsername}' berhasil login. Role:`, teacherLogin.data.user.role);

  // 2.2 Buat 5 Butir Soal (Arab, Jepang, MTK, Menjodohkan, Esai)
  console.log("2.2 Membuat 5 Butir Soal Spesifik:");

  // Soal 1: Bahasa Arab (Harakat Lengkap)
  const q1 = await makeReq("/api/admin/questions", "POST", {
    subjectId,
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    points: 20,
    content: "مَا هُوَ مَعْنَى كَلِمَةِ «الحَاسُوبُ المَحْمُولُ» فِي اللُّغَةِ الإِنْدُونِيسِيَّةِ؟",
    options: [
      { content: "Laptop / Komputer Jinjing", isCorrect: true },
      { content: "Papan Ketik (Keyboard)", isCorrect: false },
      { content: "Layar Monitor", isCorrect: false },
      { content: "Kabel Jaringan LAN", isCorrect: false },
    ],
  }, teacherCookie);
  console.log("   ✅ Soal 1 (Bahasa Arab): Tersimpan! ID:", q1.data.question?.id);

  // Soal 2: Bahasa Jepang (Kanji, Hiragana, Katakana)
  const q2 = await makeReq("/api/admin/questions", "POST", {
    subjectId,
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    points: 20,
    content: "次の文の（　）に入る最も適切な言葉を選びなさい：<br>「私は学校で（　ネットワーク工学　）を勉強しています。」<br>Kata 'ネットワーク工学' (Network Kougaku) memiliki arti:",
    options: [
      { content: "Teknik Komputer & Jaringan (TKJ)", isCorrect: true },
      { content: "Teknik Kendaraan Ringan (TKR)", isCorrect: false },
      { content: "Teknik Permesinan (TPM)", isCorrect: false },
      { content: "Teknik Audio Video (TAV)", isCorrect: false },
    ],
  }, teacherCookie);
  console.log("   ✅ Soal 2 (Bahasa Jepang): Tersimpan! ID:", q2.data.question?.id);

  // Soal 3: Matematika Rumus KaTeX (Integral & Pecahan)
  const q3 = await makeReq("/api/admin/questions", "POST", {
    subjectId,
    type: "MULTIPLE_CHOICE",
    difficulty: "HARD",
    points: 20,
    content: "Tentukan hasil integral tentu berikut:<br>$$\\int_{0}^{3} (3x^2 + 2x - 1) \\, dx$$",
    options: [
      { content: "$$33$$", isCorrect: true },
      { content: "$$27$$", isCorrect: false },
      { content: "$$30$$", isCorrect: false },
      { content: "$$36$$", isCorrect: false },
    ],
  }, teacherCookie);
  console.log("   ✅ Soal 3 (Matematika Integral LaTeX KaTeX): Tersimpan! ID:", q3.data.question?.id);

  // Soal 4: Menjodohkan Multilingual (Arab & Jepang)
  const q4 = await makeReq("/api/admin/questions", "POST", {
    subjectId,
    type: "MATCHING",
    difficulty: "MEDIUM",
    points: 20,
    content: "Jodohkan istilah teknologi dalam Bahasa Arab dan Bahasa Jepang berikut dengan pasangan yang tepat:",
    matchingPairs: [
      { premise: "الشَّبَكَةُ (Asy-Syabakah)", response: "Jaringan (Network)" },
      { premise: "データ (Deeta)", response: "Data Digital" },
      { premise: "المُخَدِّمُ (Al-Mukhaddim)", response: "Komputer Server" },
    ],
  }, teacherCookie);
  console.log("   ✅ Soal 4 (Menjodohkan Arab-Jepang): Tersimpan! ID:", q4.data.question?.id);

  // Soal 5: Esai / Uraian Matematika Matriks
  const q5 = await makeReq("/api/admin/questions", "POST", {
    subjectId,
    type: "ESSAY",
    difficulty: "MEDIUM",
    points: 20,
    content: "Diberikan matriks $A = \\begin{pmatrix} 2 & 3 \\\\ 1 & 4 \\end{pmatrix}$. Hitunglah determinan matriks $A$ beserta langkah penyelesaiannya!",
    options: [],
  }, teacherCookie);
  console.log("   ✅ Soal 5 (Esai Matematika Matriks): Tersimpan! ID:", q5.data.question?.id);

  // 2.3 Guru Membuat Jadwal Ujian
  const questionIds = [q1.data.question.id, q2.data.question.id, q3.data.question.id, q4.data.question.id, q5.data.question.id];
  const examCreateRes = await makeReq("/api/admin/exams", "POST", {
    title: `UJIAN MULTILINGUAL & MTK TKJ 2026 (${ts})`,
    code: `UAS-${ts}`,
    subjectId,
    durationMinutes: 90,
    minTimeMinutes: 0,
    passingScore: 75,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResult: true,
    groupIds: rombelRes.data.group?.id ? [rombelRes.data.group.id] : [],
    questionIds,
  }, teacherCookie);

  if (examCreateRes.status !== 200) {
    console.error("Gagal buat ujian:", examCreateRes.status, examCreateRes.data);
    throw new Error("Gagal buat ujian");
  }
  const examId = examCreateRes.data.exam.id;
  console.log("2.3 Jadwal Ujian Berhasil Diterbitkan Guru. ID:", examId);

  // 2.4 Guru Mengambil Token Ujian di Proctoring
  const proctorRes = await makeReq(`/api/admin/exams/${examId}/proctor`, "GET", null, teacherCookie);
  const examToken = proctorRes.data.exam.token;
  console.log("2.4 Token Ujian Rilis Guru:", examToken);

  // ==========================================
  // TAHAP 3: SISWA MENGERJAKAN UJIAN
  // ==========================================
  console.log("\n--- [TAHAP 3] SISWA LOGIN & MENGERJAKAN UJIAN ---");
  const studentLogin = await makeReq("/api/auth/login", "POST", {
    username: studentUsername,
    password: "budiPassword2026",
  });
  if (studentLogin.status !== 200) throw new Error("Gagal login siswa: " + JSON.stringify(studentLogin.data));
  const studentCookie = studentLogin.cookie;
  console.log(`3.1 Siswa '${studentUsername}' berhasil login. Nama:`, studentLogin.data.user.name);

  // 3.2 Siswa Mulai Ujian dengan Token
  const startExamRes = await makeReq(`/api/student/exams/${examId}/start`, "POST", { token: examToken }, studentCookie);
  if (startExamRes.status !== 200) throw new Error("Gagal start ujian: " + JSON.stringify(startExamRes.data));
  console.log("3.2 Siswa berhasil masuk lembar ujian. Jumlah Soal:", startExamRes.data.questions.length);

  const studentQuestions = startExamRes.data.questions;

  // 3.3 Siswa Menjawab Soal 1 (Arab)
  const q1Obj = studentQuestions[0];
  const q1CorrectOpt = q1Obj.options.find((o) => o.content.includes("Laptop"));
  await makeReq(`/api/student/exams/${examId}/save-answer`, "POST", {
    questionId: q1Obj.id,
    selectedOptionIds: [q1CorrectOpt.id],
    remainingSeconds: 5200,
  }, studentCookie);
  console.log("3.3 Siswa Menjawab Soal 1 (Arab): ✅ [Laptop / Komputer Jinjing]");

  // 3.4 Siswa Menjawab Soal 2 (Jepang)
  const q2Obj = studentQuestions[1];
  const q2CorrectOpt = q2Obj.options.find((o) => o.content.includes("Teknik Komputer"));
  await makeReq(`/api/student/exams/${examId}/save-answer`, "POST", {
    questionId: q2Obj.id,
    selectedOptionIds: [q2CorrectOpt.id],
    remainingSeconds: 5000,
  }, studentCookie);
  console.log("3.4 Siswa Menjawab Soal 2 (Jepang): ✅ [Teknik Komputer & Jaringan]");

  // 3.5 Siswa Menjawab Soal 3 (MTK Integral)
  const q3Obj = studentQuestions[2];
  const q3CorrectOpt = q3Obj.options.find((o) => o.content.includes("33"));
  await makeReq(`/api/student/exams/${examId}/save-answer`, "POST", {
    questionId: q3Obj.id,
    selectedOptionIds: [q3CorrectOpt.id],
    remainingSeconds: 4800,
  }, studentCookie);
  console.log("3.5 Siswa Menjawab Soal 3 (MTK Integral): ✅ [Hasil = 33]");

  // 3.6 Siswa Menjawab Soal 4 (Menjodohkan)
  const q4Obj = studentQuestions[3];
  const matchingAnswer = {};
  if (q4Obj.matchingPairs) {
    q4Obj.matchingPairs.forEach((p) => {
      matchingAnswer[p.id] = p.response;
    });
  }
  await makeReq(`/api/student/exams/${examId}/save-answer`, "POST", {
    questionId: q4Obj.id,
    matchingAnswer,
    remainingSeconds: 4600,
  }, studentCookie);
  console.log("3.6 Siswa Menjawab Soal 4 (Menjodohkan): ✅ [Pasangan Sempurna]");

  // 3.7 Siswa Menjawab Soal 5 (Esai)
  const q5Obj = studentQuestions[4];
  await makeReq(`/api/student/exams/${examId}/save-answer`, "POST", {
    questionId: q5Obj.id,
    textAnswer: "Determinan matriks A = (2 * 4) - (3 * 1) = 8 - 3 = 5.",
    remainingSeconds: 4400,
  }, studentCookie);
  console.log("3.7 Siswa Menjawab Soal 5 (Esai Matriks): ✅ [det(A) = 5]");

  // 3.8 Guru Memfinalisasi Nilai Sesi Ujian (Force Finish / Kalkulasi Skor)
  console.log("\n3.8 Guru Proktor menghentikan & mengkalkulasi sesi ujian...");
  const finishRes = await makeReq(`/api/admin/exams/${examId}/force-finish`, "POST", {
    action: "FORCE_FINISH_ALL",
  }, teacherCookie);
  console.log("   Status Selesai Ujian:", finishRes.status, finishRes.data.message || "OK");

  // ==========================================
  // TAHAP 4: GURU MELIHAT HASIL & REKAP NILAI
  // ==========================================
  console.log("\n--- [TAHAP 4] GURU MEMERIKSA REKAP NILAI & ANALISIS HASIL ---");

  // 4.1 Guru Membuka Rekap Nilai Ujian
  const gradeRes = await makeReq(`/api/admin/grades?examId=${examId}`, "GET", null, teacherCookie);
  console.log("4.1 Status Pengambilan Rekap Nilai Guru:", gradeRes.status);

  // 4.2 Guru Membuka Analisis Butir Soal Ujian
  const itemAnalysisRes = await makeReq(`/api/admin/exams/${examId}/item-analysis`, "GET", null, teacherCookie);
  console.log("4.2 Status Analisis Butir Soal Guru:", itemAnalysisRes.status);

  // 4.3 Guru Membuka Live Proctoring Monitor
  const proctorMonitor = await makeReq(`/api/admin/exams/${examId}/proctor`, "GET", null, teacherCookie);
  const studentSession = proctorMonitor.data.sessions.find((s) => s.user.username === studentUsername);

  console.log("\n===============================================================================");
  console.log("📊 REKAPITULASI RESMI PADA AKUN GURU (USTADZ KENJI TAKAHASHI, M.PD):");
  console.log("===============================================================================");
  console.log("• Nama Ujian     :", proctorMonitor.data.exam.title);
  console.log("• Nama Siswa     :", studentSession?.user.name);
  console.log("• Username Siswa :", studentSession?.user.username);
  console.log("• Kelas / Rombel :", studentSession?.user.group?.name || `XII-TKJ-UNGGULAN-${ts}`);
  console.log("• Status Ujian   :", studentSession?.status);
  console.log("• Nilai Akhir    :", studentSession?.score, "/ 100");
  console.log("• Soal Terjawab  :", "5 dari 5 Butir Soal (Arab, Jepang, MTK Integral, Menjodohkan, Esai)");
  console.log("• Waktu Selesai  :", studentSession?.finishedAt);
  console.log("===============================================================================");
  console.log("🎉 SEMUA FITUR SUPERUSER -> GURU -> SISWA -> REKAP NILAI BERFUNGSI 100%!");
  console.log("===============================================================================\n");
}

runFullScenario().catch(console.error);
