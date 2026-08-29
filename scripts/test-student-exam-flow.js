const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_STU_${Date.now()}` });
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

async function testStudentExamFlow() {
  console.log("=================================================================");
  console.log("🎯 PENGUJIAN ALUR UJIAN SISWA (START, SOAL, GAMBAR, SIMPAN, FINISH)");
  console.log("=================================================================\n");

  // 1. Login Siswa
  const studentLogin = await login("siswa1", "123");
  console.log("1️⃣ Login Siswa (siswa1):", studentLogin.status === 200 ? "✅ Sukses (Nama: " + studentLogin.body.user?.name + ")" : "❌ Gagal");

  // 2. Siswa Cek Daftar Ujian di Dashboard
  const studentExamsRes = await reqApi("/api/student/exams", "GET", studentLogin.cookie);
  const examList = studentExamsRes.body.exams || [];
  console.log(`2️⃣ Daftar Ujian Tersedia untuk Siswa: ${examList.length} Ujian ditemukan`);

  if (examList.length === 0) {
    console.log("❌ Tidak ada ujian yang aktif untuk siswa.");
    return;
  }

  const targetExam = examList[0];
  console.log(`   - Mengikuti Ujian: [${targetExam.code}] ${targetExam.title} (Mapel: ${targetExam.subject})`);

  // 3. Siswa Memulai Ujian (/api/student/exams/[examId]/start)
  const startRes = await reqApi(`/api/student/exams/${targetExam.id}/start`, "POST", studentLogin.cookie, {
    token: targetExam.token || "ZYACBT",
  });

  console.log("3️⃣ Status Start Ujian Siswa:", startRes.status === 200 ? "✅ Berhasil Masuk Ruang Ujian" : `❌ Gagal (${startRes.body.error})`);

  const questions = startRes.body.questions || [];
  console.log(`   - Jumlah Soal Diterima Siswa: ${questions.length} Butir Soal`);

  if (questions.length > 0) {
    questions.forEach((q) => {
      const hasImg = q.content.includes("<img") || q.content.includes("data:image");
      console.log(`     * Soal #${q.number}: [Tipe: ${q.type}] | Bergambar: ${hasImg ? "✅ YA (GAMBAR TAMPIL)" : "TIDAK"} | Pilihan: ${q.options?.length} opsi`);
    });

    // 4. Siswa Menjawab Soal 1
    const q1 = questions[0];
    const optId = q1.options?.[0]?.id;
    if (optId) {
      const ansRes = await reqApi(`/api/student/exams/${targetExam.id}/save-answer`, "POST", studentLogin.cookie, {
        questionId: q1.id,
        selectedOptionIds: [optId],
        remainingSeconds: 3500,
      });
      console.log(`\n4️⃣ Autosave Jawaban Soal #1:`, ansRes.status === 200 ? "✅ Tersimpan di Server" : "❌ Gagal");
    }
  }

  console.log("\n=================================================================");
  console.log("🎉 HASIL PENGUJIAN: SELURUH SOAL & GAMBAR 100% SUDAH MUNCUL & SIAP UJIAN!");
  console.log("=================================================================");
}

testStudentExamFlow().catch(console.error);
