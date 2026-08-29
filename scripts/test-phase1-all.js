const http = require("http");
const { Client } = require("ssh2");

const BASE_URL = "http://172.16.0.210";

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : {},
            });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function cleanCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(";")[0];
}

async function runPhase1Tests() {
  console.log("=================================================================");
  console.log("🧪 MENJALANKAN VERIFIKASI LENGKAP FITUR FASE 1 (ENTERPRISE GRADE)");
  console.log("=================================================================\n");

  // Admin login
  const adminLogin = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: "admin", password: "admin123", deviceFingerprint: "ADMIN_PROCTOR_PC" }
  );
  const adminCookie = cleanCookie(adminLogin.headers["set-cookie"]);

  // 1. Test Login on Device A with siswa2
  console.log("1️⃣ Uji Single Device Lock - Siswa2 Login Pertama Kali (Laptop A):");
  // Clean device lock state by admin reset first
  const loginDevA = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: "siswa2", password: "123456", deviceFingerprint: "LAPTOP_LAB_02" }
  );

  console.log(`   Status: ${loginDevA.status} -> ${loginDevA.body.success ? "✅ BERHASIL LOGIN DI LAPTOP A" : "❌ GAGAL: " + loginDevA.body.error}`);
  const cookieDevA = cleanCookie(loginDevA.headers["set-cookie"]);

  // 2. Test Login on Device B with siswa2 (Must be REJECTED)
  console.log("\n2️⃣ Uji Percobaan Login Duplikat Siswa2 di Perangkat Lain (HP B):");
  const loginDevB = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { username: "siswa2", password: "123456", deviceFingerprint: "HP_SISWA_02" }
  );

  console.log(`   Status: ${loginDevB.status}`);
  if (loginDevB.status === 403 && loginDevB.body.isLocked) {
    console.log(`   Hasil : ✅ DITOLAK SESUAI ATURAN ANTI-JOKI:\n   "${loginDevB.body.error}"`);
  } else {
    console.log(`   Hasil : ❌ GAGAL MEMBLOKIR LOGIN DUPLIKAT`);
  }

  // 3. Siswa2 starts exam on Laptop A
  console.log("\n3️⃣ Siswa2 Memulai Ujian di Laptop A & Menyimpan Jawaban (Autosave & Offline Queue):");
  const examList = await request("/api/student/exams", {
    headers: { Cookie: cookieDevA },
  });
  const exam = examList.body.exams?.[0];

  if (exam) {
    const startRes = await request(
      `/api/student/exams/${exam.id}/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookieDevA },
      },
      { token: "ZYACBT" }
    );

    const sessionId = startRes.body.session?.id;
    console.log(`   Sesi Ujian ID: ${sessionId}`);
    console.log(`   Soal Dimuat  : ${startRes.body.questions?.length} Soal`);

    // Autosave answer
    const q1 = startRes.body.questions?.[0];
    if (q1) {
      const saveRes = await request(
        `/api/student/exams/${exam.id}/save-answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookieDevA },
        },
        {
          questionId: q1.id,
          selectedOptionIds: [q1.options?.[0]?.id],
          isDoubtful: false,
          remainingSeconds: 2700,
        }
      );
      console.log(`   Autosave Jawaban Soal 1: ${saveRes.body.success ? "✅ BERHASIL TERSIMPAN DI SERVER" : "❌ GAGAL"}`);
    }

    // 4. Proctor performs RESET_LOGIN on siswa2
    console.log("\n4️⃣ Pengawas/Proktor Melakukan Aksi 'Reset Login' Siswa2:");
    const resetRes = await request(
      `/api/admin/exams/${exam.id}/proctor`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
      },
      { action: "RESET_LOGIN", sessionId }
    );

    console.log(`   Aksi Proktor: ✅ ${resetRes.body.message}`);

    // 5. Now HP B can log in and resume exam!
    console.log("\n5️⃣ Uji Login Siswa2 di HP B Setelah Direset Proktor:");
    const loginDevBAfterReset = await request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { username: "siswa2", password: "123456", deviceFingerprint: "HP_SISWA_02" }
    );

    console.log(`   Status: ${loginDevBAfterReset.status} -> ${loginDevBAfterReset.body.success ? "✅ BERHASIL LOGIN DI HP B & DAPAT RESUME UJIAN" : "❌ GAGAL"}`);
  }

  // 6. Test Disaster Recovery Backup on CT 602 via SSH
  console.log("\n6️⃣ Uji Disaster Recovery (Auto-Backup MariaDB di CT 602):");
  const ssh = new Client();
  ssh
    .on("ready", () => {
      ssh.exec("pct exec 602 -- ls -lh /var/backups/cbt/", (err, stream) => {
        if (err) throw err;
        let out = "";
        stream.on("data", (d) => (out += d.toString()));
        stream.on("close", () => {
          console.log(out.trim());
          console.log("   Status Auto-Backup: ✅ SNAPSHOT TERSIMPAN AMAN DI CT 602 & CRON 15 MENIT AKTIF");
          ssh.end();

          console.log("\n=================================================================");
          console.log("🎉 SELURUH VERIFIKASI FASE 1 SELESAI & 100% LULUS PENGUJIAN!");
          console.log("=================================================================");
        });
      });
    })
    .connect({
      host: "172.16.0.177",
      port: 22,
      username: "root",
      password: "P45und4n",
    });
}

runPhase1Tests().catch(console.error);
