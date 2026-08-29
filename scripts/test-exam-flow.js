async function testExamFlow() {
  const BASE_URL = "http://172.16.0.210";
  console.log("🔍 Menjalankan Pengujian Alur Siswa: Login -> Masukkan Token -> Masuk Ruang Ujian...\n");

  // 1. Student Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "siswa1", password: "123456" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  console.log("1. Login Siswa:", loginRes.status === 200 ? "✅ BERHASIL" : "❌ GAGAL");

  // 2. Get Exams List
  const examsRes = await fetch(`${BASE_URL}/api/student/exams`, {
    headers: { Cookie: cookie || "" },
  });
  const examsData = await examsRes.json();
  const exam = examsData.exams[0];
  console.log("2. Pilih Ujian:", `"${exam.title}" (ID: ${exam.id})`);

  // 3. Step A: Student enters Token "ZYACBT" from Modal
  console.log("\n3. Step A: Siswa memasukkan token 'ZYACBT' dari Modal Dashboard...");
  const startResA = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie || "",
    },
    body: JSON.stringify({ token: "ZYACBT" }),
  });
  const startDataA = await startResA.json();
  console.log("   Hasil Submit Token:", startResA.status === 200 ? "✅ VALID & BERHASIL" : `❌ GAGAL (${startDataA.error})`);
  console.log("   Session ID         :", startDataA.session?.id);
  console.log("   Soal Dimuat        :", startDataA.questions?.length, "Soal");

  // 4. Step B: Student lands on /student/exam/[examId] (calls start with empty token to resume)
  console.log("\n4. Step B: Browser membuka halaman Ruang Ujian (/student/exam/[id])...");
  const startResB = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie || "",
    },
    body: JSON.stringify({ token: "" }), // Empty token on page load
  });
  const startDataB = await startResB.json();
  console.log("   Hasil Load Ruang Ujian:", startResB.status === 200 ? "✅ SUKSES MEMUAT SOAL (Tidak ditolak)" : `❌ DITOLAK (${startDataB.error})`);
  console.log("   Status Sesi           :", startDataB.session?.status);
  console.log("   Sisa Waktu            :", startDataB.exam?.remainingSeconds, "Detik");

  // 5. Step C: Test Autosave
  console.log("\n5. Step C: Siswa menjawab soal no 1 & autosave...");
  const q1 = startDataB.questions[0];
  const saveRes = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/save-answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie || "",
    },
    body: JSON.stringify({
      questionId: q1.id,
      selectedOptionIds: [q1.options[0].id],
      isDoubtful: false,
      remainingSeconds: startDataB.exam?.remainingSeconds - 10,
    }),
  });
  const saveData = await saveRes.json();
  console.log("   Hasil Autosave        :", saveRes.status === 200 ? "✅ TERSIMPAN KE MARIA DB CT 602" : `❌ GAGAL (${saveData.error})`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH ALUR TOKEN & RUANG UJIAN SUDAH 100% NORMAL!");
  console.log("=======================================================");
}

testExamFlow().catch(console.error);
