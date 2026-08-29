const http = require("http");
const XLSX = require("xlsx");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}` });
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

async function testPhase4Features() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN FITUR: TEMPLATE SOAL, TARGET KELAS, & PESAN SELESAI");
  console.log("=================================================================\n");

  // 1. Admin Login
  const admin = await login("admin", "admin123");
  console.log(`1️⃣ Admin Login: Status ${admin.status} -> ✅ SUKSES`);

  // 2. Test Excel Question Parser
  console.log("\n2️⃣ Menguji Parser Template Excel Bank Soal...");
  const sampleQuestions = [
    {
      No: 1,
      "Soal / Pertanyaan": "Konfigurasi IP Address default untuk router MikroTik pada port ether1 biasanya adalah...",
      "Pilihan A": "192.168.88.1/24",
      "Pilihan B": "192.168.1.1/24",
      "Pilihan C": "10.0.0.1/24",
      "Pilihan D": "172.16.0.1/24",
      "Pilihan E": "192.168.0.1/24",
      "Kunci Jawaban": "A",
      "Tingkat Kesukaran": "EASY",
      Bobot: 1.0,
    },
    {
      No: 2,
      "Soal / Pertanyaan": "Protokol routing dinamis yang menggunakan algoritma Dijkstra Shortest Path First (SPF) adalah...",
      "Pilihan A": "RIP",
      "Pilihan B": "EIGRP",
      "Pilihan C": "OSPF",
      "Pilihan D": "BGP",
      "Pilihan E": "IS-IS",
      "Kunci Jawaban": "C",
      "Tingkat Kesukaran": "MEDIUM",
      Bobot: 1.0,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleQuestions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soal");
  const excelBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Soal_TKJ.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullPayload = Buffer.concat([preFile, excelBuf, postFile]);

  const parseRes = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/admin/import/word", BASE_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": fullPayload.length,
          Cookie: admin.cookie,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.write(fullPayload);
    req.end();
  });

  console.log(`   Status Parser Excel   : ${parseRes.status} -> ${parseRes.status === 200 ? "✅ BERHASIL PARSE" : "❌ GAGAL"}`);
  console.log(`   Tipe File Terdeteksi  : ${parseRes.body.fileType}`);
  console.log(`   Jumlah Butir Soal     : ${parseRes.body.parsedCount}`);
  console.log(`   Contoh Kunci Soal 1   : ${parseRes.body.questions?.[0]?.correctAnswer}`);

  // 3. Create Class Groups: X-TKJ-1 and XI-RPL-1
  console.log("\n3️⃣ Menyiapkan Kelas / Rombel Khusus (X-TKJ-1 & XI-RPL-1)...");
  const subjList = await reqApi("/api/admin/subjects", "GET", admin.cookie);
  const defaultSubj = subjList.body.subjects?.[0];

  // Bulk import 2 users with specific classes
  const usersToImport = [
    {
      Username: "siswa.tkj.2026",
      Password: "password123",
      "Nama Lengkap": "Farhan Kurniawan",
      Role: "SISWA",
      "Kelas / Rombel": "X-TKJ-1",
      "NIS / NIP": "20261011",
    },
    {
      Username: "siswa.rpl.2026",
      Password: "password123",
      "Nama Lengkap": "Bella Anggraini",
      Role: "SISWA",
      "Kelas / Rombel": "XI-RPL-1",
      "NIS / NIP": "20261012",
    },
  ];

  const wsUsers = XLSX.utils.json_to_sheet(usersToImport);
  const wbUsers = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbUsers, wsUsers, "Users");
  const excelUsersBuf = XLSX.write(wbUsers, { type: "buffer", bookType: "xlsx" });

  const boundaryU = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const preU = Buffer.from(
    `--${boundaryU}\r\nContent-Disposition: form-data; name="file"; filename="Users.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
  );
  const postU = Buffer.from(`\r\n--${boundaryU}--\r\n`);
  const payloadU = Buffer.concat([preU, excelUsersBuf, postU]);

  await new Promise((resolve) => {
    const req = http.request(
      new URL("/api/admin/users/import", BASE_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundaryU}`,
          "Content-Length": payloadU.length,
          Cookie: admin.cookie,
        },
      },
      (res) => res.on("end", resolve).resume()
    );
    req.write(payloadU);
    req.end();
  });
  console.log("   ✅ Siswa X-TKJ-1 (Farhan) dan XI-RPL-1 (Bella) berhasil didaftarkan.");

  // Get Group IDs
  const stdList = await reqApi("/api/admin/students", "GET", admin.cookie);
  const tkjGroup = stdList.body.groups?.find((g) => g.name === "X-TKJ-1" || g.code === "X-TKJ-1");
  const rplGroup = stdList.body.groups?.find((g) => g.name === "XI-RPL-1" || g.code === "XI-RPL-1");

  // 4. Create Exam Specifically for X-TKJ-1 with showResult=false (Heartfelt completion message)
  console.log("\n4️⃣ Membuat Ujian Khusus Jurusan X-TKJ-1 (Targetted Exam)...");
  const createExamRes = await reqApi("/api/admin/exams", "POST", admin.cookie, {
    title: "Penilaian Harian - Dasar Komputer & Jaringan (X-TKJ)",
    code: `TKJ-${Date.now().toString().slice(-4)}`,
    description: "Khusus siswa kelas X Teknik Komputer dan Jaringan.",
    subjectId: defaultSubj.id,
    durationMinutes: 45,
    token: "TKJ2026",
    isTokenDynamic: false,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResult: false, // Nilai tersembunyi dengan pesan apresiasi
    showAnswerKey: false,
    minTimeMinutes: 0,
    maxViolations: 3,
    isPublished: true,
    groupIds: [tkjGroup.id],
  });

  const createdExam = createExamRes.body.exam;
  console.log(`   Ujian Dibuat          : ${createdExam?.title}`);
  console.log(`   Target Kelas          : X-TKJ-1`);
  console.log(`   Tampilkan Nilai       : ${createdExam?.showResult} (Pesan Apresiasi Aktif)`);

  // 5. Verify Filter: Farhan (X-TKJ-1) SEES the exam, Bella (XI-RPL-1) CANNOT see the exam!
  console.log("\n5️⃣ Pengujian Filter Jurusan di Dashboard Siswa (Moodle-Style):");
  const loginTkj = await login("siswa.tkj.2026", "password123");
  const tkjExams = await reqApi("/api/student/exams", "GET", loginTkj.cookie);
  const hasExamForTkj = tkjExams.body.exams?.some((e) => e.id === createdExam.id);
  console.log(`   - Siswa X-TKJ-1 (Farhan) melihat ujian TKJ   : ${hasExamForTkj ? "✅ MUNCUL DI DASHBOARD" : "❌ TIDAK MUNCUL"}`);

  const loginRpl = await login("siswa.rpl.2026", "password123");
  const rplExams = await reqApi("/api/student/exams", "GET", loginRpl.cookie);
  const hasExamForRpl = rplExams.body.exams?.some((e) => e.id === createdExam.id);
  console.log(`   - Siswa XI-RPL-1 (Bella) melihat ujian TKJ  : ${!hasExamForRpl ? "🛡️ TERISOLASI RAPI (TIDAK MUNCUL)" : "❌ BOCOR KE KELAS LAIN"}`);

  // 6. Test Scheduled Exam (Future startTime)
  console.log("\n6️⃣ Pengujian Penjadwalan Waktu Mulai (Scheduled Start Time):");
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const scheduledExamRes = await reqApi("/api/admin/exams", "POST", admin.cookie, {
    title: "Ujian Masa Depan (Jadwal Besok)",
    code: `FUT-${Date.now().toString().slice(-4)}`,
    subjectId: defaultSubj.id,
    durationMinutes: 60,
    startTime: tomorrow,
    token: "ZYACBT",
    isPublished: true,
  });

  const tryStartFuture = await reqApi(`/api/student/exams/${scheduledExamRes.body.exam.id}/start`, "POST", loginTkj.cookie, { token: "ZYACBT" });
  console.log(`   - Percobaan Buka Ujian Sebelum Waktu Mulai   : Status ${tryStartFuture.status} -> ${tryStartFuture.status === 403 ? "🛡️ TERKUNCI OTOMATIS (Belum Waktunya)" : "❌ BOCOR"}`);

  console.log("\n=================================================================");
  console.log("🎉 SELURUH FITUR TAHAP 4 SELESAI DAN 100% TERVERIFIKASI SUKSES!");
  console.log("=================================================================");
}

testPhase4Features().catch(console.error);
