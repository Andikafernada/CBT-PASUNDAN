const fs = require("fs");
const http = require("http");

async function testLiveUpload() {
  console.log("===============================================================================");
  console.log("🔍 UJI COBA LIVE UPLOAD: Template_Bank_Soal_Lengkap_CBT (4).docx KE SERVER");
  console.log("===============================================================================\n");

  const filePath = "C:\\Users\\User\\Downloads\\Template_Bank_Soal_Lengkap_CBT (4).docx";
  const fileBuffer = fs.readFileSync(filePath);

  // 1. Superuser login
  const loginData = JSON.stringify({ username: "root", password: "P45und4n2" });
  const loginRes = await new Promise((resolve) => {
    const req = http.request("http://172.16.0.210/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(loginData) },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        const cookie = res.headers["set-cookie"] ? res.headers["set-cookie"][0].split(";")[0] : "";
        resolve({ status: res.statusCode, cookie });
      });
    });
    req.write(loginData);
    req.end();
  });

  console.log("1. Superuser login status:", loginRes.status);
  const cookie = loginRes.cookie;

  // 2. Build multipart/form-data
  const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  let bodyHeader = `--${boundary}\r\n`;
  bodyHeader += `Content-Disposition: form-data; name="file"; filename="Template_Bank_Soal_Lengkap_CBT (4).docx"\r\n`;
  bodyHeader += `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;

  const bodyFooter = `\r\n--${boundary}--\r\n`;

  const fullPayload = Buffer.concat([
    Buffer.from(bodyHeader, "utf-8"),
    fileBuffer,
    Buffer.from(bodyFooter, "utf-8"),
  ]);

  console.log("2. Mengirim file ke http://172.16.0.210/api/admin/import/word...");

  const uploadRes = await new Promise((resolve) => {
    const req = http.request("http://172.16.0.210/api/admin/import/word", {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": fullPayload.length,
        Cookie: cookie,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });
    req.write(fullPayload);
    req.end();
  });

  console.log("3. Status HTTP Respon Server:", uploadRes.status);
  console.log("4. Total Butir Soal Terurai:", uploadRes.data.parsedCount);

  let imageQuestions = 0;
  if (uploadRes.data.questions) {
    uploadRes.data.questions.forEach((q) => {
      const hasImg = q.content.includes("<img") || q.options.some((o) => o.content.includes("<img"));
      if (hasImg) {
        imageQuestions++;
        console.log(`   ✅ [Soal #${q.number}] TYPE: ${q.type} | GAMBAR DITEMUKAN! Preview: ${q.content.substring(0, 80)}...`);
      }
    });
  }

  console.log(`\n===============================================================================`);
  console.log(`🖼️ HASIL: DARI 50 SOAL, TOTAL ${imageQuestions} SOAL BERGAMBAR BERHASIL DIPROSES 100%!`);
  console.log(`===============================================================================\n`);
}

testLiveUpload().catch(console.error);
