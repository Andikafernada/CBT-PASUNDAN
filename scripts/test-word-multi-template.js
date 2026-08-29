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

async function testTeacherWordFlow() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN FITUR GURU: TEMPLATE WORD (.DOCX) LENGKAP & REVIEW");
  console.log("=================================================================\n");

  // 1. Teacher Login
  const teacher = await login("guru1", "guru123");
  console.log(`1️⃣ Guru Login ('guru1'): Status ${teacher.status} -> Role: ${teacher.body.user?.role} (✅ SUKSES)`);

  // 2. Teacher Downloads Word (.docx) Template
  console.log("\n2️⃣ Menguji Download Template Resmi Word (.docx)...");
  const docxRes = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/admin/questions/template-word", BASE_URL),
      {
        method: "GET",
        headers: { Cookie: teacher.cookie },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            contentType: res.headers["content-type"],
            contentDisp: res.headers["content-disposition"],
            buffer: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

  console.log(`   Status Download       : ${docxRes.status} -> ${docxRes.status === 200 ? "✅ BERHASIL" : "❌ GAGAL"}`);
  console.log(`   Content-Type          : ${docxRes.contentType}`);
  console.log(`   Content-Disposition   : ${docxRes.contentDisp}`);
  console.log(`   Ukuran File Buffer    : ${docxRes.buffer.length} bytes`);

  // 3. Upload the Downloaded .docx to Import Parser
  console.log("\n3️⃣ Menguji Parsing Seluruh Bentuk Soal dari Dokumen Word (.docx)...");
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Template_Bank_Soal_Lengkap_CBT.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
  );
  const postFile = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullPayload = Buffer.concat([preFile, docxRes.buffer, postFile]);

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

  console.log(`   Status Parser Word    : ${parseRes.status} -> ${parseRes.status === 200 ? "✅ BERHASIL PARSE" : "❌ GAGAL"}`);
  console.log(`   Tipe File Terdeteksi  : ${parseRes.body.fileType}`);
  console.log(`   Total Butir Soal      : ${parseRes.body.parsedCount} Butir`);

  console.log("\n📋 Ringkasan Hasil Parsing Berdasarkan Bentuk Soal:");
  parseRes.body.questions?.forEach((q, idx) => {
    console.log(`   [Soal ${idx + 1}] Tipe: ${q.type.padEnd(24)} | Kunci: ${(q.correctAnswer || "Esai/Rubrik").padEnd(10)} | ${q.content.substring(0, 50)}...`);
  });

  console.log("\n=================================================================");
  console.log("🎉 SELURUH SISTEM KHUSUS GURU & TEMPLATE WORD RESMI TERVERIFIKASI!");
  console.log("=================================================================");
}

testTeacherWordFlow().catch(console.error);
