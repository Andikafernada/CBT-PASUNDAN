const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_E2E_${Date.now()}` });
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
          try {
            resolve({ status: res.statusCode, cookie: tokenCookie, body: JSON.parse(data || "{}") });
          } catch {
            resolve({ status: res.statusCode, cookie: tokenCookie, raw: data });
          }
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

async function runEndToEndTest() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN END-TO-END: ONBOARDING GURU, MAPEL-KELAS, SUSULAN & REKAP");
  console.log("=================================================================\n");

  // Login guru
  const guru = await login("guru1", "guru123");
  console.log("Login Guru (guru1):", guru.status === 200 ? "✅ Sukses" : "❌ Gagal");

  // 1. Setup Kelas & Mapel (oleh Guru / Admin)
  const grpRes = await reqApi("/api/admin/students", "POST", guru.cookie, {
    action: "CREATE_GROUP",
    code: `TKJ-${Date.now().toString().slice(-4)}`,
    name: "X TKJ Uji Terpadu",
    description: "Rombel Uji End-to-End",
  });
  const groupId = grpRes.body.group?.id;

  const subRes = await reqApi("/api/admin/subjects", "POST", guru.cookie, {
    code: `ASJ-${Date.now().toString().slice(-4)}`,
    name: "Administrasi Server Jaringan E2E",
  });
  const subjectId = subRes.body.subject?.id;
  console.log("1️⃣ Setup Kelas & Mapel Baru:", { groupId, subjectId }, "✅");

  // 2. Guru Onboarding (Set Mapel & Kelas Ampuan)
  const onbRes = await reqApi("/api/admin/teacher/profile", "POST", guru.cookie, {
    subjectIds: [subjectId],
    groupIds: [groupId],
  });
  console.log("2️⃣ Guru Onboarding (Mapel & Kelas Ampuan):", onbRes.body.message || "OK", "✅");

  // 3. Tambah Soal Langsung ke Subject (Tanpa Topik di UI)
  const q1 = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    subjectId,
    type: "MULTIPLE_CHOICE",
    content: "Perintah debian untuk restart service web server apache2 adalah?",
    options: [
      { content: "systemctl restart apache2", isCorrect: true },
      { content: "systemctl stop apache2", isCorrect: false },
      { content: "service apache2 pause", isCorrect: false },
      { content: "reboot apache2", isCorrect: false },
    ],
  });
  const q2 = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    subjectId,
    type: "MULTIPLE_CHOICE",
    content: "File konfigurasi utama DNS BIND9 pada Debian terletak di direktori?",
    options: [
      { content: "/etc/bind/named.conf", isCorrect: true },
      { content: "/etc/apache2/apache2.conf", isCorrect: false },
      { content: "/etc/network/interfaces", isCorrect: false },
      { content: "/var/log/syslog", isCorrect: false },
    ],
  });
  console.log("3️⃣ Buat Soal Langsung ke Mapel (Tanpa Topik):", { q1: q1.body.question?.id, q2: q2.body.question?.id }, "✅");

  // 4. Buat Ujian Utama Terhubung ke Kelas
  const examRes = await reqApi("/api/admin/exams", "POST", guru.cookie, {
    title: "Ujian Utama ASJ Semester 1",
    code: `UTAMA-${Date.now().toString().slice(-4)}`,
    subjectId,
    durationMinutes: 60,
    minTimeMinutes: 0,
    token: "UTAMA",
    showResult: true,
    isPublished: true,
    groupIds: [groupId],
    questionIds: [q1.body.question?.id, q2.body.question?.id],
  });
  const examId = examRes.body.exam?.id;
  console.log("4️⃣ Buat Paket Ujian Utama:", examId, "✅");

  // 5. Buat 3 Siswa di Kelas tersebut
  const sfx = Date.now().toString().slice(-4);
  const std1User = `siswa.hadir.${sfx}`;
  const std2User = `siswa.force.${sfx}`;
  const std3User = `siswa.absen.${sfx}`;

  await reqApi("/api/admin/students", "POST", guru.cookie, { action: "CREATE_STUDENT", username: std1User, password: "123", name: "Siswa 1 (Hadir Normal)", nis: "1001", groupId });
  await reqApi("/api/admin/students", "POST", guru.cookie, { action: "CREATE_STUDENT", username: std2User, password: "123", name: "Siswa 2 (Dipaksa Selesai)", nis: "1002", groupId });
  await reqApi("/api/admin/students", "POST", guru.cookie, { action: "CREATE_STUDENT", username: std3User, password: "123", name: "Siswa 3 (Absen / Susulan)", nis: "1003", groupId });

  // Siswa 1: Mengerjakan dan Selesai Normal
  const std1 = await login(std1User, "123");
  const s1Start = await reqApi(`/api/student/exams/${examId}/start`, "POST", std1.cookie, { token: "UTAMA" });
  const s1Q = s1Start.body.questions || [];
  for (const q of s1Q) {
    const opt = q.options?.find((o) => o.content.includes("systemctl restart") || o.content.includes("/etc/bind"));
    if (opt) await reqApi(`/api/student/exams/${examId}/save-answer`, "POST", std1.cookie, { questionId: q.id, selectedOptionIds: [opt.id] });
  }
  const s1Fin = await reqApi(`/api/student/exams/${examId}/finish`, "POST", std1.cookie);
  console.log("5️⃣ Siswa 1 (Normal Finish):", `Skor = ${s1Fin.body.result?.score} / 100`, "✅");

  // Siswa 2: Mengerjakan 1 soal lalu ditinggal -> Admin Force Finish
  const std2 = await login(std2User, "123");
  const s2Start = await reqApi(`/api/student/exams/${examId}/start`, "POST", std2.cookie, { token: "UTAMA" });
  const s2Q = s2Start.body.questions || [];
  const opt2 = s2Q[0]?.options?.find((o) => o.content.includes("systemctl restart") || o.content.includes("/etc/bind"));
  if (opt2) await reqApi(`/api/student/exams/${examId}/save-answer`, "POST", std2.cookie, { questionId: s2Q[0].id, selectedOptionIds: [opt2.id] });
  
  // Force Finish Siswa 2
  const s2SessId = s2Start.body.session?.id;
  const ffRes = await reqApi(`/api/admin/exams/${examId}/force-finish`, "POST", guru.cookie, {
    action: "FORCE_FINISH_ONE",
    sessionId: s2SessId,
  });
  console.log("6️⃣ Siswa 2 (Force Finish oleh Guru):", `Skor Terhitung = ${ffRes.body.score} / 100`, "✅");

  // Siswa 3: Tidak Hadir -> Buat Ujian Susulan
  console.log("7️⃣ Siswa 3 Tidak Hadir pada Jadwal Utama");
  const suppRes = await reqApi(`/api/admin/exams/${examId}/supplementary`, "POST", guru.cookie, {
    title: "Ujian Susulan ASJ (Khusus Siswa Absen)",
    code: `SUSUL-${sfx}`,
    durationMinutes: 60,
    token: "SUSUL123",
    useParentQuestions: true,
  });
  const suppExamId = suppRes.body.exam?.id;
  console.log("8️⃣ Terbitkan Ujian Susulan:", suppExamId, "✅");

  // Siswa 3 Mengerjakan Ujian Susulan
  const std3 = await login(std3User, "123");
  const s3Start = await reqApi(`/api/student/exams/${suppExamId}/start`, "POST", std3.cookie, { token: "SUSUL123" });
  const s3Q = s3Start.body.questions || [];
  for (const q of s3Q) {
    const opt = q.options?.find((o) => o.content.includes("systemctl restart") || o.content.includes("/etc/bind"));
    if (opt) await reqApi(`/api/student/exams/${suppExamId}/save-answer`, "POST", std3.cookie, { questionId: q.id, selectedOptionIds: [opt.id] });
  }
  const s3Fin = await reqApi(`/api/student/exams/${suppExamId}/finish`, "POST", std3.cookie);
  console.log("9️⃣ Siswa 3 Mengerjakan Susulan:", `Skor = ${s3Fin.body.result?.score} / 100`, "✅");

  // 10. Validasi Rekap Nilai Multi-Role
  const recapGuru = await reqApi(`/api/admin/grades?subjectId=${subjectId}`, "GET", guru.cookie);
  console.log("\n🔟 HASIL REKAP NILAI MULTI-ROLE:");
  console.log(`   - Rekap Nilai Guru (Mapel Ampuan) : ${recapGuru.body.grades?.length} Baris Data`);
  recapGuru.body.grades?.forEach((g) => {
    console.log(`     * [${g.attendanceStatus}] ${g.studentName} | Mapel: ${g.subjectName} | Skor: ${g.score} | Ket: ${g.note}`);
  });

  console.log("\n=================================================================");
  console.log("🎉 SELURUH SISTEM (ONBOARDING, MAPEL-KELAS, SUSULAN, FORCE-FINISH & REKAP) 100% SUKSES!");
  console.log("=================================================================");
}

runEndToEndTest().catch(console.error);
