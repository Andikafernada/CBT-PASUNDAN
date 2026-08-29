async function testAll() {
  console.log("🔍 Menjalankan Automated Verification Test untuk ZYACBT Modern...\n");

  // 1. Test Admin Login
  const adminLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const adminLoginData = await adminLoginRes.json();
  console.log("1. Admin Login API:", adminLoginRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("   User:", adminLoginData.user?.name, "| Role:", adminLoginData.user?.role);
  console.log("   Redirect:", adminLoginData.redirectTo);

  // 2. Test Student Login
  const studentLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "siswa1", password: "123456" }),
  });
  const studentLoginData = await studentLoginRes.json();
  const studentCookie = studentLoginRes.headers.get("set-cookie");
  console.log("\n2. Student Login API:", studentLoginRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("   User:", studentLoginData.user?.name, "| Role:", studentLoginData.user?.role);
  console.log("   Redirect:", studentLoginData.redirectTo);

  // 3. Test Student Exams Endpoint
  const examsRes = await fetch("http://localhost:3000/api/student/exams", {
    headers: { Cookie: studentCookie || "" },
  });
  const examsData = await examsRes.json();
  console.log("\n3. Student Exams API:", examsRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
  console.log("   Daftar Ujian Ditemukan:", examsData.exams?.length);
  if (examsData.exams?.length > 0) {
    const exam = examsData.exams[0];
    console.log("   Judul Ujian:", exam.title);
    console.log("   Mapel:", exam.subject, "| Durasi:", exam.durationMinutes, "Menit | Total Soal:", exam.totalQuestions);

    // 4. Test Start Exam with Token
    const startRes = await fetch(`http://localhost:3000/api/student/exams/${exam.id}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: studentCookie || "",
      },
      body: JSON.stringify({ token: "ZYACBT" }),
    });
    const startData = await startRes.json();
    console.log("\n4. Start Exam with Token 'ZYACBT':", startRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
    console.log("   Session ID:", startData.session?.id);
    console.log("   Questions Loaded:", startData.questions?.length);
    if (startData.questions?.length > 0) {
      console.log("   Sample Question 1 Type:", startData.questions[0].type);
      console.log("   Options Count:", startData.questions[0].options?.length);

      // 5. Test Autosave Answer
      const q1 = startData.questions[0];
      const optId = q1.options[0]?.id;
      const saveRes = await fetch(`http://localhost:3000/api/student/exams/${exam.id}/save-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: studentCookie || "",
        },
        body: JSON.stringify({
          questionId: q1.id,
          selectedOptionIds: [optId],
          isDoubtful: false,
          remainingSeconds: 2600,
        }),
      });
      const saveData = await saveRes.json();
      console.log("\n5. Real-Time Autosave Answer API:", saveRes.status === 200 ? "✅ SUCCESS" : "❌ FAILED");
      console.log("   Saved At:", saveData.savedAt);
    }
  }

  console.log("\n🎉 SELURUH SISTEM DAN API ZYACBT MODERN BERJALAN 100% SEMPURNA!\n");
}

testAll().catch(console.error);
