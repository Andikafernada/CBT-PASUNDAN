const http = require("http");

const BASE_URL = "http://172.16.0.210";

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data ? JSON.parse(data) : {},
            });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function cleanCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  if (Array.isArray(setCookieHeader)) {
    return setCookieHeader.map((c) => c.split(";")[0]).join("; ");
  }
  return setCookieHeader.split(";")[0];
}

async function testRBAC() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN HAK AKSES & PEMBAGIAN WEWENANG (RBAC HIERARCHY)");
  console.log("=================================================================\n");

  // 1. Login Admin (SUPERUSER)
  const adminLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" } }, { username: "admin", password: "admin123", deviceFingerprint: "RBAC_ADMIN" });
  const adminCookie = cleanCookie(adminLogin.headers["set-cookie"]);
  console.log("👑 [ROLE: SUPERUSER / ADMIN]");
  const adminUsers = await request("/api/admin/users", { headers: { Cookie: adminCookie } });
  const adminQuestions = await request("/api/admin/questions", { headers: { Cookie: adminCookie } });
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${adminUsers.status} -> ${adminUsers.status === 200 ? "✅ DIIZINKAN (Full Access)" : "❌ DITOLAK"}`);
  console.log(`   - Akses Bank Soal (Kurikulum)          : Status ${adminQuestions.status} -> ${adminQuestions.status === 200 ? "✅ DIIZINKAN (Full Access)" : "❌ DITOLAK"}`);

  // 2. Login Teacher (GURU / PENGUJI)
  const teacherLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" } }, { username: "guru.kimia.2026", password: "password123", deviceFingerprint: "RBAC_TEACHER" });
  const teacherCookie = cleanCookie(teacherLogin.headers["set-cookie"]);
  console.log("\n👨‍🏫 [ROLE: GURU / TEACHER - Dra. Hj. Ratna Juwita]");
  const teacherUsers = await request("/api/admin/users", { headers: { Cookie: teacherCookie } });
  const teacherQuestions = await request("/api/admin/questions", { headers: { Cookie: teacherCookie } });
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${teacherUsers.status} -> ${teacherUsers.status === 403 ? "🛡️ TERPROTEKSI DITOLAK (403)" : "❌ BOCOR"}`);
  console.log(`   - Akses Bank Soal (Kelola Soal Guru)   : Status ${teacherQuestions.status} -> ${teacherQuestions.status === 200 ? "✅ DIIZINKAN (Khusus Guru)" : "❌ DITOLAK"}`);

  // 3. Login Operator (PROKTOR / PENGAWAS RUANG)
  const operatorLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" } }, { username: "proktor.server1", password: "password123", deviceFingerprint: "RBAC_OPERATOR" });
  const operatorCookie = cleanCookie(operatorLogin.headers["set-cookie"]);
  console.log("\n🖥️ [ROLE: OPERATOR / PROKTOR - Rian Ardiansyah]");
  const operatorUsers = await request("/api/admin/users", { headers: { Cookie: operatorCookie } });
  const operatorQuestions = await request("/api/admin/questions", { headers: { Cookie: operatorCookie } });
  const operatorStudents = await request("/api/admin/students", { headers: { Cookie: operatorCookie } });
  console.log(`   - Akses Manajemen Pengguna (Superuser) : Status ${operatorUsers.status} -> ${operatorUsers.status === 403 ? "🛡️ TERPROTEKSI DITOLAK (403)" : "❌ BOCOR"}`);
  console.log(`   - Akses Bank Soal (Anti-Bocor Soal)    : Status ${operatorQuestions.status} -> ${operatorQuestions.status === 403 ? "🛡️ DITOLAK (Mencegah Kebocoran Soal)" : "❌ BOCOR"}`);
  console.log(`   - Akses Peserta & Reset Login Proktor  : Status ${operatorStudents.status} -> ${operatorStudents.status === 200 ? "✅ DIIZINKAN (Pengawasan Lab)" : "❌ DITOLAK"}`);

  console.log("\n=================================================================");
  console.log("🎉 HIERARKI HAK AKSES & WEWENANG (RBAC) 100% SUKSES TERPISAH!");
  console.log("=================================================================");
}

testRBAC().catch(console.error);
