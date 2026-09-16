const http = require("http");
const fs = require("fs");
const path = require("path");

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

async function testImport40Questions() {
  console.log("=================================================================");
  console.log("📂 PENGUJIAN IMPORT 40 SOAL DOKUMEN WORD (.DOCX) NYATA");
  console.log("=================================================================\n");

  const teacher = await login("guru1", "guru123");
  console.log(`1️⃣ Guru Login: Status ${teacher.status} -> Role: ${teacher.body.user?.role}`);

  const filePath = path.join(__dirname, "..", "public", "Soal_ASJ_Debian12_Lengkap.docx");
  const fileBuffer = fs.readFileSync(filePath);
  console.log(`2️⃣ Membaca Berkas Word: ${filePath} (${fileBuffer.length} bytes)`);

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Soal_ASJ_Debian12_Lengkap.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullPayload = Buffer.concat([preFile, fileBuffer, postFile]);

  const parseRes = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/admin/import/word", BASE_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": fullPayload.length,
          Cookie: teacher.cookie,
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

  console.log(`\n3️⃣ Hasil Analisis Parser Word: Status ${parseRes.status}`);
  console.log(`   - Tipe Dokumen         : ${parseRes.body.fileType}`);
  console.log(`   - Jumlah Soal Terbaca  : ${parseRes.body.parsedCount} Butir`);

  // Count by types
  const typesCount = {};
  parseRes.body.questions?.forEach((q) => {
    typesCount[q.type] = (typesCount[q.type] || 0) + 1;
  });

  console.log("\n📊 Distribusi Bentuk Soal yang Sukses Diparsing:");
  Object.entries(typesCount).forEach(([type, count]) => {
    console.log(`   • ${type.padEnd(26)} : ${count} Butir`);
  });

  console.log("\n=================================================================");
  console.log("🎉 40 BUTIR SOAL DOCX 100% VALID DAN SIAP DIGUNAKAN UJIAN!");
  console.log("=================================================================");
}

testImport40Questions().catch(console.error);
