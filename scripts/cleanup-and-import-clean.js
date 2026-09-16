const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_CLEAN` });
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

async function cleanAndImport() {
  const guru = await login("guru1", "guru123");
  
  // 1. Get Subject & Topic
  const subRes = await reqApi("/api/admin/subjects", "GET", guru.cookie);
  const topicId = subRes.body.subjects?.[0]?.topics?.[0]?.id;

  // 2. Parse Word File
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

  const parsed = parseRes.body.questions || [];
  console.log(`Parsed ${parsed.length} questions from DOCX.`);

  // Save to DB
  let created = 0;
  for (const q of parsed) {
    const s = await reqApi("/api/admin/questions", "POST", guru.cookie, {
      topicId,
      type: q.type,
      content: q.content,
      difficulty: q.difficulty || "MEDIUM",
      points: q.points || 1.0,
      options: q.options || [],
      matchingPairs: q.matchingPairs || [],
    });
    if (s.status === 200) created++;
  }
  console.log(`Created ${created} new questions in DB.`);

  // Inspect the newest matching questions
  const qList = await reqApi("/api/admin/questions", "GET", guru.cookie);
  const matchings = (qList.body.questions || []).filter((q) => q.type === "MATCHING");
  console.log(`\nNewest Matching Questions in MariaDB:`);
  matchings.slice(0, 2).forEach((m, idx) => {
    console.log(`\n--- [#${idx + 1}] ---`);
    console.log("Pertanyaan:", m.content);
    m.matchingPairs?.forEach((p, pIdx) => {
      console.log(`  [${pIdx + 1}] "${p.premise}"  <=====>  "${p.response}"`);
    });
  });
}

cleanAndImport().catch(console.error);
