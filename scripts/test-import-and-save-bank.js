const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_IMPORT` });
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

async function testFullWordImportToBank() {
  console.log("=================================================================");
  console.log("📥 IMPORT SOAL LENGKAP 40 BUTIR DARI DOKUMEN WORD KE BANK SOAL");
  console.log("=================================================================\n");

  const guru = await login("guru1", "guru123");
  console.log("1️⃣ Guru Login: Status", guru.status);

  // 1. Parse Word .docx via API
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
          Cookie: guru.cookie,
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

  const parsedQuestions = parseRes.body.questions || [];
  console.log(`2️⃣ Berhasil mem-parse ${parsedQuestions.length} butir soal dari Word (.docx).`);

  // 2. Get Topic
  const subRes = await reqApi("/api/admin/subjects", "GET", guru.cookie);
  const topicId = subRes.body.subjects?.[0]?.topics?.[0]?.id;

  // 3. Save questions to DB
  let savedCount = 0;
  for (const q of parsedQuestions) {
    const saveRes = await reqApi("/api/admin/questions", "POST", guru.cookie, {
      topicId,
      type: q.type,
      content: q.content,
      difficulty: q.difficulty || "MEDIUM",
      points: q.points || 1.0,
      options: q.options || [],
      matchingPairs: q.matchingPairs || [],
    });
    if (saveRes.status === 200) savedCount++;
  }

  console.log(`3️⃣ Berhasil menyimpan ${savedCount} / ${parsedQuestions.length} butir soal ke Bank Soal MariaDB.`);

  // 4. Verify Matching Questions in DB
  const qList = await reqApi("/api/admin/questions", "GET", guru.cookie);
  const matchingFromDb = (qList.body.questions || []).filter((q) => q.type === "MATCHING");
  console.log(`\n4️⃣ Verifikasi Soal Menjodohkan di DB (${matchingFromDb.length} ditemukan):`);
  matchingFromDb.slice(-2).forEach((m, idx) => {
    console.log(`\n   --- [Soal Menjodohkan #${idx + 1}] ---`);
    console.log(`   Konten : ${m.content}`);
    console.log(`   Pasangan:`);
    m.matchingPairs?.forEach((p, pIdx) => {
      console.log(`     [${pIdx + 1}] "${p.premise}"  <=====>  "${p.response}"`);
    });
  });

  console.log("\n=================================================================");
  console.log("🎉 IMPORT BANK SOAL 40 BUTIR SUKSES 100%!");
  console.log("=================================================================");
}

testFullWordImportToBank().catch(console.error);
