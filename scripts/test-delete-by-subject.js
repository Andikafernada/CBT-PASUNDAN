const http = require("http");

async function testSubjectDelete() {
  console.log("===============================================================================");
  console.log("🧪 UJI COBA FITUR HAPUS SOAL PER MATA PELAJARAN (BULK DELETE BY SUBJECT)");
  console.log("===============================================================================\n");

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

  console.log("1. Login status:", loginRes.status);
  const cookie = loginRes.cookie;

  // 2. Fetch subjects
  const subjRes = await new Promise((resolve) => {
    http.get("http://172.16.0.210/api/admin/subjects", { headers: { Cookie: cookie } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    });
  });

  console.log(`2. Total mata pelajaran terdaftar: ${subjRes.subjects?.length || 0}`);
  if (subjRes.subjects?.length > 0) {
    const s = subjRes.subjects[0];
    console.log(`   Sample Mapel: ${s.name} (${s.code}) - ID: ${s.id}`);
  }
}

testSubjectDelete().catch(console.error);
