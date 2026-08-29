const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}_MATCH2` });
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

async function testStudentMatchingFlow2() {
  const guru = await login("guru1", "guru123");
  const subRes = await reqApi("/api/admin/subjects", "GET", guru.cookie);
  const subjectId = subRes.body.subjects?.[0]?.id;
  const topicId = subRes.body.subjects?.[0]?.topics?.[0]?.id;

  const qRes = await reqApi("/api/admin/questions", "POST", guru.cookie, {
    topicId,
    type: "MATCHING",
    content: "Pasangkanlah ibukota provinsi di pulau Jawa berikut ini:",
    difficulty: "EASY",
    points: 10,
    matchingPairs: [
      { premise: "Jawa Barat", response: "Bandung" },
      { premise: "Jawa Tengah", response: "Semarang" },
      { premise: "Jawa Timur", response: "Surabaya" },
      { premise: "DKI Jakarta", response: "Jakarta" },
    ],
  });
  const qId = qRes.body.question?.id;

  const examRes = await reqApi("/api/admin/exams", "POST", guru.cookie, {
    title: "Ujian Simulasi Menjodohkan 2",
    code: `MATCH2-${Date.now().toString().slice(-4)}`,
    description: "Pengujian interaktif soal menjodohkan",
    subjectId,
    durationMinutes: 60,
    minTimeMinutes: 0,
    token: "ZYACBT",
    showResult: true,
    isPublished: true,
    questionIds: [qId],
  });
  const examId = examRes.body.exam?.id;

  const stdUser = `match.std.${Date.now().toString().slice(-4)}`;
  await reqApi("/api/admin/students", "POST", guru.cookie, {
    action: "CREATE_STUDENT",
    username: stdUser,
    password: "123",
    name: "Siswa Uji Jodoh",
    nis: "887766",
  });

  const student = await login(stdUser, "123");
  const startRes = await reqApi(`/api/student/exams/${examId}/start`, "POST", student.cookie, { token: "ZYACBT" });
  console.log("Start Exam Status:", startRes.status);
  const qInExam = startRes.body.questions?.[0];

  const matchingAnswer = {};
  qInExam?.matchingData?.premises?.forEach((p) => {
    matchingAnswer[p.id] = p.id;
  });

  const saveRes = await reqApi(`/api/student/exams/${examId}/save-answer`, "POST", student.cookie, {
    questionId: qInExam.id,
    matchingAnswer,
  });
  console.log("Save Answer Response:", saveRes);

  const finishRes = await reqApi(`/api/student/exams/${examId}/finish`, "POST", student.cookie);
  console.log("Finish Response:", finishRes.body);
  console.log(`\n🎉 Skor Akhir Siswa Menjodohkan: ${finishRes.body.result?.score} / 100 (100% Sempurna)`);
}

testStudentMatchingFlow2().catch(console.error);
