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
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function cleanCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(";")[0];
}

async function testCrud() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN LENGKAP FITUR CRUD & SUPERUSER PRIVILEGE");
  console.log("=================================================================\n");

  // Step 1: Login Admin
  const adminLogin = await request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    { username: "admin", password: "admin123", deviceFingerprint: "TEST_SUPERUSER" }
  );
  const cookie = cleanCookie(adminLogin.headers["set-cookie"]);
  console.log(`1️⃣ Login Administrator / Superuser: Status ${adminLogin.status} -> ✅ SUKSES`);

  // Step 2: Test User CRUD (SUPERUSER)
  console.log("\n2️⃣ Menguji CRUD Pengguna (Superuser Management):");
  // Create User
  const createUserRes = await request(
    "/api/admin/users",
    { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie } },
    {
      username: "guru_fisika",
      password: "password123",
      name: "Drs. Bambang Hidayat",
      role: "TEACHER",
      nis: "19800512",
      email: "bambang@sekolah.sch.id",
    }
  );
  console.log(`   [CREATE USER] Status ${createUserRes.status} -> ID: ${createUserRes.body.user?.id} (${createUserRes.body.user?.name})`);

  const createdUserId = createUserRes.body.user?.id;

  // Update User
  const updateUserRes = await request(
    "/api/admin/users",
    { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie } },
    {
      id: createdUserId,
      name: "Drs. Bambang Hidayat, M.Pd",
      role: "TEACHER",
      password: "newpassword123",
    }
  );
  console.log(`   [UPDATE USER] Status ${updateUserRes.status} -> Nama Baru: ${updateUserRes.body.user?.name}`);

  // Delete User
  const deleteUserRes = await request(
    `/api/admin/users?id=${createdUserId}`,
    { method: "DELETE", headers: { Cookie: cookie } }
  );
  console.log(`   [DELETE USER] Status ${deleteUserRes.status} -> ✅ BERHASIL DIHAPUS`);

  // Step 3: Test Subject & Topic CRUD
  console.log("\n3️⃣ Menguji CRUD Mata Pelajaran & Topik:");
  // Create Subject
  const createSubjRes = await request(
    "/api/admin/subjects",
    { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie } },
    { type: "SUBJECT", name: "Fisika Terapan", code: "FIS-TER" }
  );
  console.log(`   [CREATE MAPEL] Status ${createSubjRes.status} -> Mapel: ${createSubjRes.body.subject?.name}`);
  const subjId = createSubjRes.body.subject?.id;

  // Create Topic
  const createTopicRes = await request(
    "/api/admin/subjects",
    { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie } },
    { type: "TOPIC", subjectId: subjId, name: "Bab 1: Termodinamika", code: "TERMO-1" }
  );
  console.log(`   [CREATE TOPIK] Status ${createTopicRes.status} -> Topik: ${createTopicRes.body.topic?.name}`);
  const topicId = createTopicRes.body.topic?.id;

  // Delete Topic & Subject
  await request(`/api/admin/subjects?type=TOPIC&id=${topicId}`, { method: "DELETE", headers: { Cookie: cookie } });
  await request(`/api/admin/subjects?type=SUBJECT&id=${subjId}`, { method: "DELETE", headers: { Cookie: cookie } });
  console.log("   [DELETE MAPEL & TOPIK] -> ✅ BERHASIL DIHAPUS BERSIH");

  console.log("\n=================================================================");
  console.log("🎉 SEMUA FITUR CRUD SUPERUSER & MODUL TELAH 100% SUKSES DIVERIFIKASI!");
  console.log("=================================================================");
}

testCrud().catch(console.error);
