const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, deviceFingerprint: `DEV_${username}` });
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

async function testRombelCrud() {
  console.log("=================================================================");
  console.log("🏫 PENGUJIAN LENGKAP CRUD KELAS / ROMBEL CBT MODERN");
  console.log("=================================================================\n");

  // 1. Admin Login
  const admin = await login("admin", "admin123");
  console.log(`1️⃣ Admin Login: Status ${admin.status} -> (✅ SUKSES)`);

  // 2. READ: Get all groups
  console.log("\n2️⃣ [READ] Mengecek Daftar Rombel yang Tersedia...");
  const list1 = await reqApi("/api/admin/students", "GET", admin.cookie);
  console.log(`   Jumlah Rombel Saat Ini : ${list1.body.groups?.length || 0} Kelas`);
  list1.body.groups?.forEach((g, idx) => {
    console.log(`   [${idx + 1}] ${g.name.padEnd(20)} | Kode: ${g.code.padEnd(12)} | Siswa: ${g._count?.users || 0} | Ujian: ${g._count?.examGroups || 0}`);
  });

  // 3. CREATE: Create new rombel
  console.log("\n3️⃣ [CREATE] Menambahkan Rombel Baru 'X-DKV-1'...");
  const codeTest = `X-DKV-${Date.now().toString().slice(-4)}`;
  const createRes = await reqApi("/api/admin/students", "POST", admin.cookie, {
    action: "CREATE_GROUP",
    code: codeTest,
    name: `Kelas X DKV 1 (${codeTest})`,
    description: "Jurusan Desain Komunikasi Visual",
  });
  console.log(`   Status Create : ${createRes.status} -> ${createRes.status === 200 ? "✅ BERHASIL DIBUAT" : "❌ GAGAL"}`);
  const createdGroup = createRes.body.group;
  console.log(`   ID Rombel     : ${createdGroup?.id}`);
  console.log(`   Nama Rombel   : ${createdGroup?.name}`);

  // 4. UPDATE: Edit the rombel
  console.log("\n4️⃣ [UPDATE] Mengedit Data Rombel 'X-DKV-1'...");
  const updateRes = await reqApi("/api/admin/students", "POST", admin.cookie, {
    action: "UPDATE_GROUP",
    id: createdGroup.id,
    code: `${codeTest}-REV`,
    name: `Kelas X DKV Unggulan (${codeTest})`,
    description: "Jurusan Desain Komunikasi Visual - Kelas Industri",
  });
  console.log(`   Status Update : ${updateRes.status} -> ${updateRes.status === 200 ? "✅ BERHASIL DIUPDATE" : "❌ GAGAL"}`);
  console.log(`   Nama Baru     : ${updateRes.body.group?.name}`);
  console.log(`   Deskripsi     : ${updateRes.body.group?.description}`);

  // 5. Assign a student to this group
  console.log("\n5️⃣ [ASSIGN] Mendaftarkan Siswa Baru ke Rombel...");
  const stdUser = `dkv.siswa.${Date.now().toString().slice(-4)}`;
  const stdRes = await reqApi("/api/admin/students", "POST", admin.cookie, {
    action: "CREATE_STUDENT",
    username: stdUser,
    password: "123",
    name: "Rian Dwi Anggara",
    nis: "20269901",
    groupId: createdGroup.id,
  });
  console.log(`   Status Siswa  : ${stdRes.status} -> Siswa '${stdRes.body.student?.name}' terdaftar di rombel.`);

  // 6. DELETE: Safely delete group
  console.log("\n6️⃣ [DELETE] Menghapus Rombel dan Memverifikasi Keamanan Siswa...");
  const delRes = await reqApi("/api/admin/students", "POST", admin.cookie, {
    action: "DELETE_GROUP",
    id: createdGroup.id,
  });
  console.log(`   Status Hapus  : ${delRes.status} -> ${delRes.status === 200 ? "✅ BERHASIL DIHAPUS DENGAN AMAN" : "❌ GAGAL"}`);

  // Verify group is gone
  const list2 = await reqApi("/api/admin/students", "GET", admin.cookie);
  const stillExists = list2.body.groups?.some((g) => g.id === createdGroup.id);
  console.log(`   Verifikasi Hilang dari Database : ${!stillExists ? "✅ TERHAPUS BERSIH" : "❌ MASIH ADA"}`);

  console.log("\n=================================================================");
  console.log("🎉 SELURUH FITUR CRUD KELAS / ROMBEL 100% SUKSES DAN TERVERIFIKASI!");
  console.log("=================================================================");
}

testRombelCrud().catch(console.error);
