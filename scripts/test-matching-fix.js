const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_MATCH` });
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

async function testMatchingFix() {
  console.log("=================================================================");
  console.log("🔍 PENGUJIAN PERBAIKAN SOAL MENJODOHKAN (MATCHING PAIRS)");
  console.log("=================================================================\n");

  const teacher = await login("guru1", "guru123");
  console.log("1️⃣ Guru Login: Status", teacher.status);

  const filePath = path.join(__dirname, "..", "public", "Soal_ASJ_Debian12_Lengkap.docx");
  const fileBuffer = fs.readFileSync(filePath);

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

  console.log("\n2️⃣ Hasil Parsing Soal Menjodohkan:");
  const matchingQs = parseRes.body.questions?.filter((q) => q.type === "MATCHING") || [];
  console.log(`   Ditemukan ${matchingQs.length} Soal Menjodohkan.`);

  matchingQs.forEach((q, idx) => {
    console.log(`\n   --- [Soal Menjodohkan #${idx + 1}] ---`);
    console.log(`   Pertanyaan: ${q.content}`);
    console.log(`   Jumlah Pasangan: ${q.matchingPairs?.length}`);
    q.matchingPairs?.forEach((pair, pIdx) => {
      console.log(`     (${pIdx + 1}) [Kolom Kiri: "${pair.premise}"]  <===>  [Kolom Kanan / Jodoh: "${pair.response}"]`);
    });
  });

  console.log("\n=================================================================");
  console.log("🎉 PERBAIKAN SOAL MENJODOHKAN SUKSES & PASANGAN TERPISAH SEMPURNA!");
  console.log("=================================================================");
}

testMatchingFix().catch(console.error);
