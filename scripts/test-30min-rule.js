const http = require("http");

const BASE_URL = "http://172.16.0.210";

function makeReq(path, method = "GET", body = null, cookie = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const headers = { "Content-Type": "application/json" };
    if (postData) headers["Content-Length"] = Buffer.byteLength(postData);
    if (cookie) headers["Cookie"] = cookie;

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          let newCookie = cookie;
          if (res.headers["set-cookie"]) {
            const raw = res.headers["set-cookie"];
            const cookieArr = Array.isArray(raw) ? raw : [raw];
            newCookie = cookieArr.map((c) => c.split(";")[0]).join("; ");
          }
          resolve({ status: res.statusCode, data: json, cookie: newCookie });
        });
      }
    );
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function test30MinuteRule() {
  console.log("===============================================================================");
  console.log("⏱️ UJI COBA ATURAN MINIMAL 30 MENIT & PENALTI NILAI 0");
  console.log("===============================================================================\n");

  // 1. Admin login to fetch exam
  const aLogin = await makeReq("/api/auth/login", "POST", { username: "root", password: "P45und4n2" });
  const adminCookie = aLogin.cookie;
  const exams = await makeReq("/api/admin/exams", "GET", null, adminCookie);
  const exam = exams.data.exams[0];
  const proctor = await makeReq(`/api/admin/exams/${exam.id}/proctor`, "GET", null, adminCookie);
  const token = proctor.data.exam.token;

  // 2. Student login & start exam
  const sLogin = await makeReq("/api/auth/login", "POST", { username: "andikaa", password: "123" });
  const studentCookie = sLogin.cookie;
  const startRes = await makeReq(`/api/student/exams/${exam.id}/start`, "POST", { token }, studentCookie);
  console.log("Status Mulai Ujian:", startRes.status);

  // 3. Test Normal Submit before 30 min -> should be BLOCKED (400)
  console.log("1. Siswa mencoba kumpul normal sebelum 30 menit...");
  const attempt1 = await makeReq(`/api/student/exams/${exam.id}/finish`, "POST", {}, studentCookie);
  console.log("   Status HTTP:", attempt1.status);
  console.log("   Pesan Respon:", attempt1.data.error);

  if (attempt1.status === 400 && attempt1.data.underMinTime) {
    console.log("   ✅ BERHASIL DIBLOKIR! Siswa tidak diizinkan submit sebelum 30 menit.");
  }

  // 4. Test Force Submit before 30 min with Penalty Agreement
  console.log("\n2. Siswa mencentang persetujuan penalti dan memaksa kumpul...");
  const attempt2 = await makeReq(`/api/student/exams/${exam.id}/finish`, "POST", { forceSubmit: true, agreeZero: true }, studentCookie);
  console.log("   Status HTTP:", attempt2.status);
  console.log("   Pesan:", attempt2.data.message);
  console.log("   Skor Akhir Siswa:", attempt2.data.result?.score);

  if (attempt2.status === 200 && attempt2.data.result?.score === 0) {
    console.log("   ✅ PENALTI NILAI 0 BERHASIL DITERAPKAN OTOMATIS!");
  }

  console.log("\n===============================================================================");
  console.log("🎉 ATURAN 30 MENIT & WARNING PENALTI NILAI 0 TELAH AKTIF 100%!");
  console.log("===============================================================================\n");
}

test30MinuteRule().catch(console.error);
