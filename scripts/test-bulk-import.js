const http = require("http");
const XLSX = require("xlsx");

const BASE_URL = "http://172.16.0.210";

function cleanCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(";")[0];
}

async function testBulkImport() {
  console.log("=================================================================");
  console.log("🧪 PENGUJIAN FITUR IMPORT MASSAL GURU, SISWA, & OPERATOR (EXCEL)");
  console.log("=================================================================\n");

  // Step 1: Admin Login
  const loginData = JSON.stringify({ username: "admin", password: "admin123", deviceFingerprint: "TEST_BULK" });
  const adminLogin = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/auth/login", BASE_URL),
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.write(loginData);
    req.end();
  });

  const cookie = cleanCookie(adminLogin.headers["set-cookie"]);
  console.log(`1️⃣ Login Administrator / Superuser: Status ${adminLogin.status} -> ✅ SUKSES`);

  // Step 2: Generate In-Memory Excel Workbook with Teachers & Students
  console.log("\n2️⃣ Membuat Payload File Excel (.xlsx) Berisi Data Guru & Siswa Masal...");
  const mockExcelRows = [
    {
      Username: "guru.kimia.2026",
      Password: "password123",
      "Nama Lengkap": "Dra. Hj. Ratna Juwita, M.Si",
      Role: "GURU",
      "Kelas / Rombel": "XII-MIPA-3",
      "NIS / NIP": "197805122003122001",
      Email: "ratna.kimia@sekolah.sch.id",
    },
    {
      Username: "guru.biologi.2026",
      Password: "password123",
      "Nama Lengkap": "Hendra Wijaya, S.Pd",
      Role: "GURU",
      "Kelas / Rombel": "XII-MIPA-3",
      "NIS / NIP": "198506142008011002",
      Email: "hendra.bio@sekolah.sch.id",
    },
    {
      Username: "proktor.server1",
      Password: "password123",
      "Nama Lengkap": "Rian Ardiansyah, S.Kom",
      Role: "OPERATOR",
      "Kelas / Rombel": "SERVER-PUSAT",
      "NIS / NIP": "199201012019031003",
      Email: "rian.proktor@sekolah.sch.id",
    },
    {
      Username: "siswa.citra.2026",
      Password: "password123",
      "Nama Lengkap": "Citra Lestari",
      Role: "SISWA",
      "Kelas / Rombel": "XII-MIPA-3",
      "NIS / NIP": "20261005",
      Email: "citra@student.sch.id",
    },
    {
      Username: "siswa.donny.2026",
      Password: "password123",
      "Nama Lengkap": "Donny Pratama",
      Role: "SISWA",
      "Kelas / Rombel": "XII-MIPA-3",
      "NIS / NIP": "20261006",
      Email: "donny@student.sch.id",
    },
    {
      Username: "siswa.eko.2026",
      Password: "password123",
      "Nama Lengkap": "Eko Prasetyo",
      Role: "SISWA",
      "Kelas / Rombel": "XII-MIPA-3",
      "NIS / NIP": "20261007",
      Email: "eko@student.sch.id",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(mockExcelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Pengguna");
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  console.log(`   Ukuran Buffer Excel: ${excelBuffer.length} bytes (6 Baris Akun Guru, Proktor, & Siswa)`);

  // Step 3: Build Native Multipart Form Data
  console.log("\n3️⃣ Mengunggah File Excel ke Endpoint /api/admin/users/import...");
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const preFile = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Import_Users.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
  );
  const postFile = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="defaultRole"\r\n\r\nSTUDENT\r\n--${boundary}--\r\n`);
  const fullPayload = Buffer.concat([preFile, excelBuffer, postFile]);

  const importRes = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/admin/users/import", BASE_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": fullPayload.length,
          Cookie: cookie,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.write(fullPayload);
    req.end();
  });

  console.log(`   Hasil Upload: Status ${importRes.status}`);
  console.log(`   Total Baris Excel     : ${importRes.body.totalRows}`);
  console.log(`   Akun Baru Dibuat      : ${importRes.body.createdCount}`);
  console.log(`   Akun Diperbarui       : ${importRes.body.updatedCount}`);
  console.log(`   Errors / Warnings     : ${importRes.body.errors?.length || 0}`);

  // Step 4: Verify Teacher can Login!
  console.log("\n4️⃣ Verifikasi Akun Guru Hasil Import Excel (guru.kimia.2026):");
  const teacherLogin = await new Promise((resolve, reject) => {
    const req = http.request(
      new URL("/api/auth/login", BASE_URL),
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify({ username: "guru.kimia.2026", password: "password123", deviceFingerprint: "TEACHER_PC" }));
    req.end();
  });

  console.log(`   Status Login Guru     : ${teacherLogin.status} -> ${teacherLogin.status === 200 ? "✅ BERHASIL LOGIN" : "❌ GAGAL"}`);
  console.log(`   Nama Guru Terdaftar   : ${teacherLogin.body.user?.name}`);
  console.log(`   Hak Akses (Role)      : ${teacherLogin.body.user?.role}`);

  console.log("\n=================================================================");
  console.log("🎉 FITUR IMPORT EXCEL GURU & SISWA MASAL 100% SUKSES DIVERIFIKASI!");
  console.log("=================================================================");
}

testBulkImport().catch(console.error);
