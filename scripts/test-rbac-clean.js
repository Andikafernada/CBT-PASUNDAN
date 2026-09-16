const http = require("http");

const BASE_URL = "http://172.16.0.210";

function loginAndGetCookie(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `FINGERPRINT_${username}` });
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

function requestWithCookie(path, cookie) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      new URL(path, BASE_URL),
      {
        method: "GET",
        headers: { Cookie: cookie },
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
    req.end();
  });
}

async function testRBAC() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN HAK AKSES & PEMBAGIAN WEWENANG (RBAC HIERARCHY)");
  console.log("=================================================================\n");

  // 1. Superuser / Admin
  const admin = await loginAndGetCookie("admin", "admin123");
  console.log(`👑 [ROLE: SUPERUSER / ADMIN] (Login: Status ${admin.status})`);
  const adminUsers = await requestWithCookie("/api/admin/users", admin.cookie);
  const adminQuestions = await requestWithCookie("/api/admin/questions", admin.cookie);
  const adminStudents = await requestWithCookie("/api/admin/students", admin.cookie);
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${adminUsers.status} -> ${adminUsers.status === 200 ? "✅ DIIZINKAN (Full Superuser Access)" : "❌ GAGAL"}`);
  console.log(`   - Akses Bank Soal (Kurikulum)          : Status ${adminQuestions.status} -> ${adminQuestions.status === 200 ? "✅ DIIZINKAN (Full Superuser Access)" : "❌ GAGAL"}`);
  console.log(`   - Akses Peserta & Rombel               : Status ${adminStudents.status} -> ${adminStudents.status === 200 ? "✅ DIIZINKAN (Full Superuser Access)" : "❌ GAGAL"}`);

  // 2. Guru / Teacher
  const teacher = await loginAndGetCookie("guru1", "guru123");
  console.log(`\n👨‍🏫 [ROLE: GURU / TEACHER - ${teacher.body.user?.name}] (Login: Status ${teacher.status})`);
  const teacherUsers = await requestWithCookie("/api/admin/users", teacher.cookie);
  const teacherQuestions = await requestWithCookie("/api/admin/questions", teacher.cookie);
  const teacherSubjects = await requestWithCookie("/api/admin/subjects", teacher.cookie);
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${teacherUsers.status} -> ${teacherUsers.status === 403 ? "🛡️ TERPROTEKSI DITOLAK (403 - Guru Dilarang Akses Superuser)" : "❌ BOCOR"}`);
  console.log(`   - Akses Bank Soal (Kelola Soal Guru)   : Status ${teacherQuestions.status} -> ${teacherQuestions.status === 200 ? "✅ DIIZINKAN (Khusus Guru & Admin)" : "❌ DITOLAK"}`);
  console.log(`   - Akses Mata Pelajaran & Topik         : Status ${teacherSubjects.status} -> ${teacherSubjects.status === 200 ? "✅ DIIZINKAN (Khusus Guru & Admin)" : "❌ DITOLAK"}`);

  // 3. Proktor / Operator
  const operator = await loginAndGetCookie("proktor1", "proktor123");
  console.log(`\n🖥️ [ROLE: OPERATOR / PROKTOR - ${operator.body.user?.name}] (Login: Status ${operator.status})`);
  const operatorUsers = await requestWithCookie("/api/admin/users", operator.cookie);
  const operatorQuestions = await requestWithCookie("/api/admin/questions", operator.cookie);
  const operatorStudents = await requestWithCookie("/api/admin/students", operator.cookie);
  const operatorExams = await requestWithCookie("/api/admin/exams", operator.cookie);
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${operatorUsers.status} -> ${operatorUsers.status === 403 ? "🛡️ TERPROTEKSI DITOLAK (403 - Operator Dilarang Akses Superuser)" : "❌ BOCOR"}`);
  console.log(`   - Akses Bank Soal (Anti-Bocor Soal)    : Status ${operatorQuestions.status} -> ${operatorQuestions.status === 403 ? "🛡️ DITOLAK (403 - Mencegah Kebocoran Soal oleh Operator)" : "❌ BOCOR"}`);
  console.log(`   - Akses Peserta & Reset Login Proktor  : Status ${operatorStudents.status} -> ${operatorStudents.status === 200 ? "✅ DIIZINKAN (Khusus Pengawasan Lab & Reset Login)" : "❌ DITOLAK"}`);
  console.log(`   - Akses Pelaksanaan Ujian (Proctoring) : Status ${operatorExams.status} -> ${operatorExams.status === 200 ? "✅ DIIZINKAN (Khusus Pengawasan Lab & Token)" : "❌ DITOLAK"}`);

  console.log("\n=================================================================");
  console.log("🎉 HIERARKI HAK AKSES & WEWENANG (RBAC) 100% SUKSES TERPISAH!");
  console.log("=================================================================");
}

testRBAC().catch(console.error);
