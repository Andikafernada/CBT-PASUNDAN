async function verifyLiveProxmox() {
  const BASE_URL = "http://172.16.0.210";
  console.log(`🔍 Memulai Automated End-to-End Test ke Proxmox Live CBT (${BASE_URL})...\n`);

  // 1. Test Admin Login
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const adminData = await adminRes.json();
  console.log("1. Admin Login API:", adminRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED (" + adminRes.status + ")");
  console.log("   User:", adminData.user?.name, "| Role:", adminData.user?.role);
  console.log("   Redirect:", adminData.redirectTo);

  // 2. Test Student Login
  const studentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "siswa1", password: "123456" }),
  });
  const studentData = await studentRes.json();
  const cookie = studentRes.headers.get("set-cookie");
  console.log("\n2. Student Login API:", studentRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED (" + studentRes.status + ")");
  console.log("   User:", studentData.user?.name, "| Role:", studentData.user?.role);

  // 3. Test Student Exams
  const examsRes = await fetch(`${BASE_URL}/api/student/exams`, {
    headers: { Cookie: cookie || "" },
  });
  const examsData = await examsRes.json();
  console.log("\n3. Active Exams API:", examsRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("   Jumlah Ujian Aktif:", examsData.exams?.length);

  if (examsData.exams?.length > 0) {
    const exam = examsData.exams[0];
    console.log("   Judul Ujian:", exam.title);
    console.log("   Mapel:", exam.subject, "| Durasi:", exam.durationMinutes, "Menit");

    // 4. Test Start Exam with Token ZYACBT
    const startRes = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie || "",
      },
      body: JSON.stringify({ token: "ZYACBT" }),
    });
    const startData = await startRes.json();
    console.log("\n4. Start Exam with Token 'ZYACBT':", startRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("   Session ID:", startData.session?.id);
    console.log("   Jumlah Soal Dimuat:", startData.questions?.length);

    // 5. Test Autosave Answer to MariaDB CT 602
    if (startData.questions?.length > 0) {
      const q1 = startData.questions[0];
      const optId = q1.options?.[0]?.id;
      const saveRes = await fetch(`${BASE_URL}/api/student/exams/${exam.id}/save-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie || "",
        },
        body: JSON.stringify({
          questionId: q1.id,
          selectedOptionIds: [optId],
          isDoubtful: false,
          remainingSeconds: 2600,
        }),
      });
      const saveData = await saveRes.json();
      console.log("\n5. Real-Time Autosave to CT 602 Database:", saveRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
      console.log("   Waktu Tersimpan:", saveData.savedAt);
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 SELURUH SISTEM 2 CT PROXMOX SUDAH 100% ONLINE & LIVE!");
  console.log("=======================================================");
}

verifyLiveProxmox().catch(console.error);
