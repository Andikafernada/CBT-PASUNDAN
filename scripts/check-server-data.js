const http = require("http");

async function checkServerData() {
  // 1. Superuser login
  const loginData = JSON.stringify({ username: "root", password: "P45und4n2" });
  const cookie = await new Promise((resolve) => {
    const req = http.request("http://172.16.0.210/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(loginData) },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        resolve(res.headers["set-cookie"] ? res.headers["set-cookie"][0].split(";")[0] : "");
      });
    });
    req.write(loginData);
    req.end();
  });

  const get = (url, customCookie = cookie) =>
    new Promise((resolve) => {
      http.get("http://172.16.0.210" + url, { headers: { Cookie: customCookie } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve(d);
          }
        });
      });
    });

  console.log("=== 1. USERS ===");
  const users = await get("/api/admin/users");
  console.log("Users count:", users.users?.length);
  const teachers = users.users?.filter((u) => u.role === "TEACHER") || [];
  console.log("Teachers:", teachers.map((t) => ({ username: t.username, name: t.name, id: t.id })));

  console.log("\n=== 2. EXAMS (JADWAL UJIAN) ===");
  const exams = await get("/api/admin/exams");
  console.log("Exams count:", exams.exams?.length);
  if (exams.exams?.length > 0) {
    exams.exams.forEach((e) => {
      console.log(`- Exam: ${e.title} | Subject: ${e.subject?.name} | CreatedBy: ${e.createdBy?.username || e.createdByUserId} | Active: ${e.isActive}`);
    });
  }

  console.log("\n=== 3. REKAP NILAI (GRADES) AS ROOT/ADMIN ===");
  const gradesAdmin = await get("/api/admin/grades");
  console.log("Grades rows count (Admin):", gradesAdmin.grades?.length);
  if (gradesAdmin.grades?.length > 0) {
    gradesAdmin.grades.slice(0, 5).forEach((g) => {
      console.log(`  * Siswa: ${g.name} (${g.username}) | Kelas: ${g.groupName} | Ujian: ${g.examTitle} | Nilai: ${g.finalScore} | Status: ${g.status}`);
    });
  }

  // Check as each teacher
  for (const t of teachers) {
    console.log(`\n=== 4. TESTING AS TEACHER: ${t.username} ===`);
    // Attempt login with default password (plainPassword if exists, or username, or standard)
    const tLoginData = JSON.stringify({ username: t.username, password: t.plainPassword || t.username });
    let tCookie = "";
    try {
      tCookie = await new Promise((resolve) => {
        const req = http.request("http://172.16.0.210/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(tLoginData) },
        }, (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            resolve(res.headers["set-cookie"] ? res.headers["set-cookie"][0].split(";")[0] : "");
          });
        });
        req.write(tLoginData);
        req.end();
      });
    } catch {}

    if (tCookie) {
      const tGrades = await get("/api/admin/grades", tCookie);
      const tQuestions = await get("/api/admin/questions", tCookie);
      const tExams = await get("/api/admin/exams", tCookie);
      console.log(`  Login success!`);
      console.log(`  - Questions visible: ${tQuestions.questions?.length}`);
      console.log(`  - Exams visible: ${tExams.exams?.length}`);
      console.log(`  - Grades visible: ${tGrades.grades?.length}`);
    } else {
      console.log(`  Could not login with default password for ${t.username}`);
    }
  }
}

checkServerData().catch(console.error);
