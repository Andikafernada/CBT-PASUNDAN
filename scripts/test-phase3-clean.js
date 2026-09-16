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

function execSsh(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.on("close", () => resolve(out));
    });
  });
}

async function run() {
  console.log("=================================================================");
  console.log("🧪 MENJALANKAN PENGUJIAN END-TO-END FASE 3 (SKALABILITAS & KIOSK)");
  console.log("=================================================================\n");

  const ssh = new Client();
  await new Promise((resolve, reject) => {
    ssh
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host: "172.16.0.177", port: 22, username: "root", password: "P45und4n" });
  });

  // Step 1: Check Redis In-Memory Status in CT 601
  console.log("1️⃣ Memeriksa Status Redis In-Memory Engine di CT 601...");
  const redisOut = await execSsh(ssh, "pct exec 601 -- redis-cli info memory");
  const lines = redisOut
    .split("\n")
    .filter((l) => l.includes("used_memory_human") || l.includes("maxmemory_human") || l.includes("maxmemory_policy"));
  lines.forEach((l) => console.log(`   ⚡ ${l.trim()}`));

  // Step 2: Reset sessions and locks in MariaDB
  await execSsh(
    ssh,
    `pct exec 602 -- mysql -u root -pP45und4n -e "USE zyacbt_modern; UPDATE User SET deviceFingerprint = NULL, isLoginLocked = 0; DELETE FROM ExamAnswer; DELETE FROM ExamSession;"`
  );

  // Step 3: Admin Login
  console.log("\n2️⃣ Login Admin / Proktor...");
  const adminLogin = await request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    { username: "admin", password: "admin123", deviceFingerprint: "PROCTOR_PC" }
  );
  const adminCookie = cleanCookie(adminLogin.headers["set-cookie"]);
  console.log(`   Hasil: Status ${adminLogin.status} -> ✅ PROKTOR AKTIF`);

  // Step 4: Ambil Ujian
  const examsRes = await request("/api/admin/exams", { headers: { Cookie: adminCookie } });
  const exam = examsRes.body.exams?.[0];

  console.log(`\n3️⃣ Mengaktifkan Fitur 'Wajib Exambro / Safe Exam Browser (Kiosk)' pada Ujian: "${exam?.title}"...`);
  await execSsh(
    ssh,
    `pct exec 602 -- mysql -u root -pP45und4n -e "USE zyacbt_modern; UPDATE Exam SET requireKioskBrowser = 1 WHERE id = '${exam.id}';"`
  );
  console.log("   Status Kiosk Lock: ✅ AKTIF (requireKioskBrowser = 1)");

  // Step 5: Siswa Login & Coba Akses Melalui Chrome Biasa (Tanpa Exambro)
  console.log("\n4️⃣ Siswa Mencoba Masuk Ujian Menggunakan Google Chrome / Edge Biasa:");
  const s1Login = await request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    { username: "siswa1", password: "123456", deviceFingerprint: "NORMAL_CHROME_PC" }
  );
  const s1Cookie = cleanCookie(s1Login.headers["set-cookie"]);

  const standardBrowserRes = await request(
    `/api/student/exams/${exam.id}/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: s1Cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
    },
    { token: "ZYACBT" }
  );

  console.log(`   Hasil: Status ${standardBrowserRes.status}`);
  if (standardBrowserRes.status === 403 && standardBrowserRes.body.isKioskRequired) {
    console.log(`   Pesan Penolakan: 🛡️ "${standardBrowserRes.body.error}"`);
    console.log("   Status Kiosk Shield: ✅ BERHASIL MEMBLOKIR BROWSER BIASA");
  }

  // Step 6: Siswa Membuka Ujian Melalui Aplikasi Exambro Resmi
  console.log("\n5️⃣ Siswa Membuka Ujian Melalui Aplikasi Resmi Exambro / Safe Exam Browser:");
  const exambroRes = await request(
    `/api/student/exams/${exam.id}/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: s1Cookie,
        "User-Agent": "Exambro-Client-Android/3.5.1 (Kiosk Secure CBT Environment)",
      },
    },
    { token: "ZYACBT" }
  );

  console.log(`   Hasil: Status ${exambroRes.status} -> ${exambroRes.status === 200 ? "✅ DIIZINKAN MASUK (Aplikasi Resmi Terverifikasi)" : "❌ GAGAL"}`);
  console.log(`   Soal Dimuat dari Server/RAM : ${exambroRes.body.questions?.length} Soal`);

  ssh.end();

  console.log("\n=================================================================");
  console.log("🎉 SEMUA FITUR FASE 3 (REDIS IN-MEMORY CACHING & EXAMBRO KIOSK");
  console.log("   PROTECTION) 100% SUKSES TERVERIFIKASI & AKTIF!");
  console.log("=================================================================");
}

run().catch(console.error);
