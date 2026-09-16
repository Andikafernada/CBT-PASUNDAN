const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_TZ` });
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

async function testAdminTimezone() {
  const admin = await login("admin", "admin123");
  console.log(`1️⃣ Admin Login: Status ${admin.status}`);

  const exams = await reqApi("/api/admin/exams", admin.cookie);
  console.log(`2️⃣ Jumlah Ujian Terjadwal di Database: ${exams.body.exams?.length} Ujian`);

  const now = new Date();
  const wibTime = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(now);

  console.log(`\n🕒 Waktu Resmi Server CBT : ${wibTime} (Waktu Indonesia Barat)`);
}

testAdminTimezone().catch(console.error);
