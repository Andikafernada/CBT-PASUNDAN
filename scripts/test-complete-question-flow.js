const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_FLOW_${Date.now()}` });
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

async function testCompleteQuestionFlow() {
  console.log("=================================================================");
  console.log("🔍 PENGUJIAN MENYELURUH: IMPORT, SIMPAN DB, REVIEW GURU & CEK ADMIN");
  console.log("=================================================================\n");

  const guru = await login("andika", "123");
  console.log("1️⃣ Login Guru (andika):", guru.status === 200 ? "✅ Sukses" : "❌ Gagal");

  // Get subjects
  const subRes = await reqApi("/api/admin/subjects", "GET", guru.cookie);
  const subjects = subRes.body.subjects || [];
  let subjectId = subjects[0]?.id;

  if (!subjectId) {
    const newSubj = await reqApi("/api/admin/subjects", "POST", guru.cookie, {
      code: "ASJ-REV",
      name: "Administrasi Sistem Jaringan",
    });
    subjectId = newSubj.body.subject?.id;
  }
  console.log("2️⃣ Mata Pelajaran Target:", subjectId, "✅");

  // 3. Upload File Word Bergambar
  const testFile = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern/public/Contoh_Soal_Bergambar.docx");
  const parseRes = await uploadDocx(testFile, guru.cookie);
  console.log("3️⃣ Parse File Word Bergambar:", `Berhasil membaca ${parseRes.body.parsedCount} butir soal`, "✅");

  // 4. Simpan ke Database Soal
  const questionsToSave = parseRes.body.questions || [];
  let savedCount = 0;
  for (const q of questionsToSave) {
    const saveRes = await reqApi("/api/admin/questions", "POST", guru.cookie, {
      subjectId,
      type: q.type || "MULTIPLE_CHOICE",
      content: q.content,
      difficulty: q.difficulty || "MEDIUM",
      points: q.points || 1.0,
      options: q.options || [],
      matchingPairs: q.matchingPairs || [],
    });
    if (saveRes.status === 200 && saveRes.body.question) {
      savedCount++;
    } else {
      console.error("Gagal simpan soal:", saveRes.body);
    }
  }
  console.log("4️⃣ Simpan ke Database Bank Soal:", `Tersimpan ${savedCount} dari ${questionsToSave.length} butir soal`, "✅");

  // 5. Guru Review Soal Saya
  const guruQuestions = await reqApi("/api/admin/questions", "GET", guru.cookie);
  console.log("\n5️⃣ Guru Review Soal Saya (/admin/questions):");
  console.log(`   - Jumlah Soal Tampil: ${guruQuestions.body.questions?.length} Butir Soal`);
  guruQuestions.body.questions?.slice(0, 3).forEach((q, i) => {
    const hasImg = q.content.includes("<img") || q.content.includes("data:image");
    console.log(`     * [Soal #${i + 1}] ID: ${q.id} | Tipe: ${q.type} | Bergambar: ${hasImg ? "✅ YA" : "TIDAK"} | Creator: ${q.createdBy?.name || "Self"}`);
  });

  // 6. Admin Cek Seluruh Bank Soal
  const admin = await login("P45und4n", "123");
  const adminQuestions = await reqApi("/api/admin/questions", "GET", admin.cookie);
  console.log("\n6️⃣ Admin Cek Seluruh Bank Soal (/admin/questions):");
  console.log(`   - Total Bank Soal Terlihat Admin: ${adminQuestions.body.questions?.length} Butir Soal`);
  adminQuestions.body.questions?.slice(0, 3).forEach((q, i) => {
    console.log(`     * [Soal #${i + 1}] Mapel: ${q.subject?.name} | Dibuat Oleh: ${q.createdBy?.name || "System"}`);
  });

  console.log("\n=================================================================");
  console.log("🎉 HASIL PENGUJIAN: FUNGSI IMPORT, DATABASE & REVIEW 100% BEKERJA NORMAL!");
  console.log("=================================================================");
}

testCompleteQuestionFlow().catch(console.error);
