const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_IMG_${Date.now()}` });
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

function uploadDocx(filePath, cookie) {
  return new Promise((resolve, reject) => {
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    let header = `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    header += `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const payload = Buffer.concat([
      Buffer.from(header, "utf8"),
      fileData,
      Buffer.from(footer, "utf8"),
    ]);

    const req = http.request(
      new URL("/api/admin/import/word", BASE_URL),
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payload.length,
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
    req.write(payload);
    req.end();
  });
}

async function testImageImport() {
  console.log("=== PENGUJIAN IMPORT WORD DENGAN GAMBAR EMBEDDED ===");
  const user = await login("andika", "123");
  console.log("Login Status:", user.status, user.body.user?.name, `(Role: ${user.body.user?.role})`);

  const testFile = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern/public/test_image_exam.docx");
  const res = await uploadDocx(testFile, user.cookie);
  console.log("Import Status:", res.status);
  console.log("Parsed Count:", res.body.parsedCount);

  if (res.body.questions) {
    res.body.questions.forEach((q) => {
      console.log(`\nSoal #${q.number}:`);
      console.log(`- Tipe: ${q.type}`);
      console.log(`- Konten: ${q.content}`);
      const hasImage = q.content.includes("<img") || q.content.includes("data:image");
      console.log(`- Mengandung Tag Gambar: ${hasImage ? "✅ YA (GAMBAR BERHASIL DIEKSTRAK & DITAMPILKAN)" : "❌ TIDAK"}`);
    });
  }
}

testImageImport().catch(console.error);
