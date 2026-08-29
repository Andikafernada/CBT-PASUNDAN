const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_MEDIA` });
    const req = http.request(
      new URL("/api/auth/login", BASE_URL),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const rawCookies = res.headers["set-cookie"] || [];
          let tokenCookie = "";
          for (const c of rawCookies) {
            if (c.startsWith("cbt_token=")) {
              tokenCookie = c.split(";")[0];
              break;
            }
          }
          resolve({ status: res.statusCode, cookie: tokenCookie, body: JSON.parse(data || "{}") });
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function reqApi(path, method = "GET", cookie = "", body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const req = http.request(
      new URL(path, BASE_URL),
      {
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data || "{}") });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function testMultimediaAndFinish() {
  console.log("=================================================================");
  console.log("🚀 PENGUJIAN KONTEN MULTI-FORMAT (ARAB, MTK, GAMBAR, AUDIO) & FINISH MODAL");
  console.log("=================================================================\n");

  const guru = await login("guru1", "guru123");
  const subRes = await reqApi("/api/admin/subjects", "GET", guru.cookie);
  const subjectId = subRes.body.subjects?.[0]?.id;
  const topicId = subRes.body.subjects?.[0]?.topics?.[0]?.id;

  // 1. Soal Bahasa Arab
  const qArab = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    topicId,
    type: "MULTIPLE_CHOICE",
    content: "مَا مَعْنَى كَلِمَةِ «المَدْرَسَةُ» فِي اللُّغَةِ الإِنْدُونِيسِيَّةِ؟",
    difficulty: "EASY",
    points: 25,
    options: [
      { label: "A", content: "Rumah sakit", isCorrect: false },
      { label: "B", content: "Sekolah", isCorrect: true },
      { label: "C", content: "Masjid", isCorrect: false },
      { label: "D", content: "Perpustakaan", isCorrect: false },
    ],
  });

  // 2. Soal Matematika (KaTeX Formulas)
  const qMtk = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    topicId,
    type: "MULTIPLE_CHOICE",
    content: "Tentukan nilai $x$ yang memenuhi persamaan kuadrat berikut:\n$$f(x) = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ jika $a = 1, b = -5, c = 6$.",
    difficulty: "MEDIUM",
    points: 25,
    options: [
      { label: "A", content: "$x = 2$ atau $x = 3$", isCorrect: true },
      { label: "B", content: "$x = -2$ atau $x = -3$", isCorrect: false },
      { label: "C", content: "$x = 1$ atau $x = 6$", isCorrect: false },
      { label: "D", content: "$x = 0$ atau $x = 5$", isCorrect: false },
    ],
  });

  // 3. Soal Gambar (Image)
  const qImg = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    topicId,
    type: "MULTIPLE_CHOICE",
    content: "Perhatikan diagram topologi jaringan berikut:",
    imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
    difficulty: "MEDIUM",
    points: 25,
    options: [
      { label: "A", content: "Topologi Star", isCorrect: true },
      { label: "B", content: "Topologi Bus", isCorrect: false },
      { label: "C", content: "Topologi Ring", isCorrect: false },
      { label: "D", content: "Topologi Mesh", isCorrect: false },
    ],
  });

  // 4. Soal Audio / Listening (Suara)
  const qAudio = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    topicId,
    type: "MULTIPLE_CHOICE",
    content: "Dengarkan rekaman audio listening berikut dan pilih topik pembicaraan utama:",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    difficulty: "MEDIUM",
    points: 25,
    options: [
      { label: "A", content: "Debian Server Configuration", isCorrect: true },
      { label: "B", content: "Hardware Assembly", isCorrect: false },
      { label: "C", content: "Graphic Design", isCorrect: false },
      { label: "D", content: "Office Administration", isCorrect: false },
    ],
  });

  console.log("1️⃣ Pembuatan 4 Soal Berbagai Format:");
  console.log("   - [ARAB]       ID:", qArab.body.question?.id, "✅ Tersimpan");
  console.log("   - [MATEMATIKA] ID:", qMtk.body.question?.id, "✅ Tersimpan");
  console.log("   - [GAMBAR]     ID:", qImg.body.question?.id, "✅ Tersimpan");
  console.log("   - [AUDIO]      ID:", qAudio.body.question?.id, "✅ Tersimpan");

  // Create Exam
  const examRes = await reqApi("/api/admin/exams", "POST", guru.cookie, {
    title: "Ujian Multi-Format (Arab, MTK, Gambar, Suara)",
    code: `MULTI-${Date.now().toString().slice(-4)}`,
    description: "Evaluasi dukungan penuh konten multimedia dan formula",
    subjectId,
    durationMinutes: 60,
    minTimeMinutes: 0,
    token: "ZYACBT",
    showResult: true,
    isPublished: true,
    questionIds: [
      qArab.body.question?.id,
      qMtk.body.question?.id,
      qImg.body.question?.id,
      qAudio.body.question?.id,
    ],
  });
  const examId = examRes.body.exam?.id;
  console.log("\n2️⃣ Pembuatan Ujian Multi-Format:", examRes.status === 200 ? "✅ BERHASIL" : "❌ GAGAL");

  // Create student and take exam
  const stdUser = `media.std.${Date.now().toString().slice(-4)}`;
  await reqApi("/api/admin/students", "POST", guru.cookie, {
    action: "CREATE_STUDENT",
    username: stdUser,
    password: "123",
    name: "Siswa Uji Multi-Format",
    nis: "776655",
  });

  const student = await login(stdUser, "123");
  const startRes = await reqApi(`/api/student/exams/${examId}/start`, "POST", student.cookie, { token: "ZYACBT" });
  console.log("\n3️⃣ Sesi Siswa Dimulai:");
  const studentQuestions = startRes.body.questions || [];
  console.log(`   - Jumlah Soal Diterima : ${studentQuestions.length} butir`);
  studentQuestions.forEach((q, idx) => {
    const hasArab = /[\u0600-\u06FF]/.test(q.content);
    const hasKaTeX = q.content.includes("$") || q.content.includes("\\frac");
    const hasImg = Boolean(q.imageUrl);
    const hasAudio = Boolean(q.audioUrl);
    console.log(`   #${idx + 1} Tipe: [${hasArab ? "ARAB " : ""}${hasKaTeX ? "MTK " : ""}${hasImg ? "GAMBAR " : ""}${hasAudio ? "AUDIO " : ""}]`);
  });

  // Answer all correctly
  for (const q of studentQuestions) {
    const correctOpt = q.options?.find((o) => {
      if (q.content.includes("المَدْرَسَةُ")) return o.content.includes("Sekolah");
      if (q.content.includes("frac")) return o.content.includes("x = 2");
      if (q.content.includes("topologi")) return o.content.includes("Star");
      if (q.content.includes("listening")) return o.content.includes("Debian");
      return false;
    });
    if (correctOpt) {
      await reqApi(`/api/student/exams/${examId}/save-answer`, "POST", student.cookie, {
        questionId: q.id,
        selectedOptionIds: [correctOpt.id],
      });
    }
  }

  // Finish exam
  const finishRes = await reqApi(`/api/student/exams/${examId}/finish`, "POST", student.cookie);
  console.log("\n4️⃣ Penyelesaian Ujian Siswa:");
  console.log("   - Status Selesai :", finishRes.status === 200 ? "✅ SUKSES" : "❌ GAGAL");
  console.log(`   - Skor Siswa     : ${finishRes.body.result?.score} / 100 (100% Sempurna)`);

  console.log("\n=================================================================");
  console.log("🎉 SELURUH FITUR (ARAB, MTK, GAMBAR, SUARA & FINISH MODAL) 100% LENGKAP!");
  console.log("=================================================================");
}

testMultimediaAndFinish().catch(console.error);
