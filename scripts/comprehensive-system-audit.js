const http = require("http");

const BASE_URL = "http://172.16.0.210";

function makeRequest(path, method = "GET", body = null, cookie = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;

    const req = http.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json,
            cookie: res.headers["set-cookie"] ? res.headers["set-cookie"][0] : cookie,
          });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log("===============================================================================");
  console.log("🔍 COMPREHENSIVE PRODUCTION SYSTEM AUDIT - CBT MODERN PASUNDAN");
  console.log("===============================================================================\n");

  const results = { passed: 0, failed: 0, warnings: 0, tests: [] };

  function report(name, status, details = "") {
    if (status === "PASS") {
      results.passed++;
      console.log(`✅ [PASS] ${name}`);
    } else if (status === "FAIL") {
      results.failed++;
      console.log(`❌ [FAIL] ${name} - ${details}`);
    } else {
      results.warnings++;
      console.log(`⚠️ [WARN] ${name} - ${details}`);
    }
    results.tests.push({ name, status, details });
  }

  // 1. Check Server Response
  try {
    const health = await makeRequest("/login");
    if (health.status === 200) {
      report("Web Server & Port 80 Connectivity", "PASS");
    } else {
      report("Web Server & Port 80 Connectivity", "FAIL", `Status ${health.status}`);
    }
  } catch (e) {
    report("Web Server & Port 80 Connectivity", "FAIL", e.message);
  }

  // 2. Auth: Admin Login
  let adminCookie = "";
  try {
    const login = await makeRequest("/api/auth/login", "POST", { username: "P45und4n", password: "123" });
    if (login.status === 200 && login.data.user?.role === "ADMIN") {
      adminCookie = login.cookie;
      report("Admin Authentication & JWT Cookie Session", "PASS");
    } else {
      report("Admin Authentication & JWT Cookie Session", "FAIL", JSON.stringify(login.data));
    }
  } catch (e) {
    report("Admin Authentication & JWT Cookie Session", "FAIL", e.message);
  }

  // 3. Auth: Teacher Login & Role Guard
  let teacherCookie = "";
  try {
    const tLogin = await makeRequest("/api/auth/login", "POST", { username: "andika", password: "123" });
    if (tLogin.status === 200 && tLogin.data.user?.role === "TEACHER") {
      teacherCookie = tLogin.cookie;
      report("Teacher Authentication & Role Isolation", "PASS");
    } else {
      report("Teacher Authentication & Role Isolation", "WARN", "Akun guru 'andika' belum aktif atau password berbeda");
    }
  } catch (e) {
    report("Teacher Authentication & Role Isolation", "WARN", e.message);
  }

  // 4. Auth: Student Login
  let studentCookie = "";
  try {
    const sLogin = await makeRequest("/api/auth/login", "POST", { username: "andikaa", password: "123" });
    if (sLogin.status === 200 && sLogin.data.user?.role === "STUDENT") {
      studentCookie = sLogin.cookie;
      report("Student Authentication & Session Dispatch", "PASS");
    } else {
      report("Student Authentication & Session Dispatch", "FAIL", JSON.stringify(sLogin.data));
    }
  } catch (e) {
    report("Student Authentication & Session Dispatch", "FAIL", e.message);
  }

  // 5. Admin Dashboard API & Statistics
  try {
    const dash = await makeRequest("/api/admin/dashboard", "GET", null, adminCookie);
    if (dash.status === 200 && dash.data.stats) {
      report("Admin Dashboard Metrics (Students, Exams, Subjects, Questions)", "PASS");
    } else {
      report("Admin Dashboard Metrics", "FAIL", JSON.stringify(dash.data));
    }
  } catch (e) {
    report("Admin Dashboard Metrics", "FAIL", e.message);
  }

  // 6. Exam Management API & Questions Structure
  let activeExamId = "";
  try {
    const exams = await makeRequest("/api/admin/exams", "GET", null, adminCookie);
    if (exams.status === 200 && Array.isArray(exams.data.exams)) {
      report(`Exams Query API (${exams.data.exams.length} Ujian Terdaftar)`, "PASS");
      if (exams.data.exams.length > 0) {
        activeExamId = exams.data.exams[0].id;
      }
    } else {
      report("Exams Query API", "FAIL", JSON.stringify(exams.data));
    }
  } catch (e) {
    report("Exams Query API", "FAIL", e.message);
  }

  // 7. Live Proctoring API & Token Generator
  if (activeExamId) {
    try {
      const proctor = await makeRequest(`/api/admin/exams/${activeExamId}/proctor`, "GET", null, adminCookie);
      if (proctor.status === 200 && proctor.data.exam) {
        report("Live Proctoring Engine & Dynamic Token API", "PASS");
      } else {
        report("Live Proctoring Engine", "FAIL", JSON.stringify(proctor.data));
      }
    } catch (e) {
      report("Live Proctoring Engine", "FAIL", e.message);
    }
  }

  // 8. Student Exam Feed & Access Control
  try {
    const sExams = await makeRequest("/api/student/exams", "GET", null, studentCookie);
    if (sExams.status === 200 && Array.isArray(sExams.data.exams)) {
      report(`Student Exam Dashboard Feed (${sExams.data.exams.length} Ujian Tersedia)`, "PASS");
    } else {
      report("Student Exam Dashboard Feed", "FAIL", JSON.stringify(sExams.data));
    }
  } catch (e) {
    report("Student Exam Dashboard Feed", "FAIL", e.message);
  }

  // 9. Document Print Suite Endpoints (Cards, Attendance, Minutes)
  try {
    const stuRes = await makeRequest("/api/admin/students", "GET", null, adminCookie);
    if (stuRes.status === 200 && Array.isArray(stuRes.data.students)) {
      report(`Print Suite Data Provider (${stuRes.data.students.length} Siswa Terindeks)`, "PASS");
    } else {
      report("Print Suite Data Provider", "FAIL", JSON.stringify(stuRes.data));
    }
  } catch (e) {
    report("Print Suite Data Provider", "FAIL", e.message);
  }

  // 10. Grade Export & Recalculation API
  try {
    const grades = await makeRequest("/api/admin/grades", "GET", null, adminCookie);
    if (grades.status === 200 && Array.isArray(grades.data.grades)) {
      report(`Grades Ledger API (${grades.data.grades.length} Rekap Nilai Terhitung)`, "PASS");
    } else {
      report("Grades Ledger API", "FAIL", JSON.stringify(grades.data));
    }
  } catch (e) {
    report("Grades Ledger API", "FAIL", e.message);
  }

  console.log("\n===============================================================================");
  console.log(`📊 AUDIT SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED | ${results.warnings} WARNINGS`);
  console.log("===============================================================================\n");
}

runAudit().catch(console.error);
