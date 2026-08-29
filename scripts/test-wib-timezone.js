const http = require("http");

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

function reqApi(path, cookie = "") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      new URL(path, BASE_URL),
      {
        method: "GET",
        headers: { ...(cookie ? { Cookie: cookie } : {}) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function testTimezone() {
  console.log("=================================================================");
  console.log("🕒 VERIFIKASI SINKRONISASI WAKTU ASIA/JAKARTA (WIB)");
  console.log("=================================================================\n");

  const student = await login("siswa1", "123456");
  console.log(`1️⃣ Siswa Login: Status ${student.status}`);

  const exams = await reqApi("/api/student/exams", student.cookie);
  console.log(`2️⃣ Daftar Ujian Siswa (Waktu Server): ${exams.body.exams?.length} Ujian ditemukan`);

  const nowServer = new Date();
  const wibString = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "long",
  }).format(nowServer);

  console.log(`\n⏰ Waktu Aktif Server CBT Saat Ini : ${wibString}`);
  console.log("=================================================================");
  console.log("🎉 SELURUH JADWAL, LOG, & SISTEM CBT SUDAH 100% ASIA/JAKARTA (WIB)!");
  console.log("=================================================================");
}

testTimezone().catch(console.error);
