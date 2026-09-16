const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database ZYACBT Modern...");

  // 1. Admin User
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      password: adminPassword,
      name: "Administrator CBT",
      role: "ADMIN",
    },
    update: {
      password: adminPassword,
    },
  });
  console.log("✅ Admin dibuat: username=admin, password=admin123");

  // 2. Groups
  const groupMIPA = await prisma.group.upsert({
    where: { code: "12-MIPA-1" },
    create: {
      code: "12-MIPA-1",
      name: "Kelas 12 MIPA 1",
      description: "Jurusan Matematika dan Ilmu Pengetahuan Alam",
    },
    update: {},
  });

  const groupIPS = await prisma.group.upsert({
    where: { code: "12-IPS-1" },
    create: {
      code: "12-IPS-1",
      name: "Kelas 12 IPS 1",
      description: "Jurusan Ilmu Pengetahuan Sosial",
    },
    update: {},
  });

  // 3. Students
  const studentPassword = await bcrypt.hash("123456", 10);
  const siswa1 = await prisma.user.upsert({
    where: { username: "siswa1" },
    create: {
      username: "siswa1",
      password: studentPassword,
      name: "Ahmad Dahlan",
      nis: "2026001",
      groupId: groupMIPA.id,
      role: "STUDENT",
    },
    update: {
      password: studentPassword,
    },
  });

  const siswa2 = await prisma.user.upsert({
    where: { username: "siswa2" },
    create: {
      username: "siswa2",
      password: studentPassword,
      name: "Siti Rahmawati",
      nis: "2026002",
      groupId: groupMIPA.id,
      role: "STUDENT",
    },
    update: {
      password: studentPassword,
    },
  });

  // 3b. Teacher & Operator Accounts
  const teacherPassword = await bcrypt.hash("guru123", 10);
  await prisma.user.upsert({
    where: { username: "guru1" },
    create: {
      username: "guru1",
      password: teacherPassword,
      name: "Drs. Budi Santoso, M.Pd",
      nis: "197501012000031001",
      role: "TEACHER",
    },
    update: { password: teacherPassword },
  });

  const proctorPassword = await bcrypt.hash("proktor123", 10);
  await prisma.user.upsert({
    where: { username: "proktor1" },
    create: {
      username: "proktor1",
      password: proctorPassword,
      name: "Rian Hidayat, S.Kom",
      nis: "198802022010011002",
      role: "OPERATOR",
    },
    update: { password: proctorPassword },
  });

  console.log("✅ Siswa demo dibuat: username=siswa1, password=123456");
  console.log("✅ Guru demo dibuat: username=guru1, password=guru123 (TEACHER)");
  console.log("✅ Proktor demo dibuat: username=proktor1, password=proktor123 (OPERATOR)");

  // 4. Subject & Topics
  const subjectMtk = await prisma.subject.upsert({
    where: { code: "MTK-SMA" },
    create: {
      code: "MTK-SMA",
      name: "Matematika Peminatan",
      description: "Kalkulus, Aljabar, dan Geometri",
    },
    update: {},
  });

  const topicKalkulus = await prisma.topic.create({
    data: {
      subjectId: subjectMtk.id,
      name: "Turunan dan Integral",
      description: "Konsep dasar kalkulus diferensial dan integral",
    },
  });

  // 5. Questions with all 5 types
  // Q1: Multiple Choice with KaTeX math formula
  const q1 = await prisma.question.create({
    data: {
      topicId: topicKalkulus.id,
      type: "MULTIPLE_CHOICE",
      content: "<p>Tentukan turunan pertama dari fungsi $f(x) = 3x^3 - 5x^2 + 7x - 9$ pada $x = 2$ !</p>",
      difficulty: "MEDIUM",
      points: 1.0,
      options: {
        create: [
          { content: "$23$", isCorrect: true, orderIndex: 0 },
          { content: "$19$", isCorrect: false, orderIndex: 1 },
          { content: "$27$", isCorrect: false, orderIndex: 2 },
          { content: "$15$", isCorrect: false, orderIndex: 3 },
          { content: "$31$", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
  });

  // Q2: Complex Multiple Choice (Multi Checkbox)
  const q2 = await prisma.question.create({
    data: {
      topicId: topicKalkulus.id,
      type: "COMPLEX_MULTIPLE_CHOICE",
      content: "<p>Manakah dari pernyataan berikut yang <strong>benar</strong> mengenai sifat turunan fungsi trigonometri?</p>",
      difficulty: "MEDIUM",
      points: 1.0,
      options: {
        create: [
          { content: "Turunan dari $\\sin(x)$ adalah $\\cos(x)$", isCorrect: true, orderIndex: 0 },
          { content: "Turunan dari $\\cos(x)$ adalah $-\\sin(x)$", isCorrect: true, orderIndex: 1 },
          { content: "Turunan dari $\\tan(x)$ adalah $\\cot(x)$", isCorrect: false, orderIndex: 2 },
          { content: "Turunan dari $\\tan(x)$ adalah $\\sec^2(x)$", isCorrect: true, orderIndex: 3 },
        ],
      },
    },
  });

  // Q3: True / False
  const q3 = await prisma.question.create({
    data: {
      topicId: topicKalkulus.id,
      type: "TRUE_FALSE",
      content: "<p>Nilai dari $\\int_{0}^{2} 3x^2 \\, dx$ adalah sama dengan $8$.</p>",
      difficulty: "EASY",
      points: 1.0,
      options: {
        create: [
          { content: "Benar", isCorrect: true, orderIndex: 0 },
          { content: "Salah", isCorrect: false, orderIndex: 1 },
        ],
      },
    },
  });

  // Q4: Matching (Menjodohkan)
  const q4 = await prisma.question.create({
    data: {
      topicId: topicKalkulus.id,
      type: "MATCHING",
      content: "<p>Jodohkan fungsi di sebelah kiri dengan nilai turunannya di sebelah kanan:</p>",
      difficulty: "HARD",
      points: 2.0,
      matchingPairs: {
        create: [
          { premise: "$f(x) = x^4$", response: "$4x^3$", orderIndex: 0 },
          { premise: "$f(x) = e^x$", response: "$e^x$", orderIndex: 1 },
          { premise: "$f(x) = \\ln(x)$", response: "$\\frac{1}{x}$", orderIndex: 2 },
        ],
      },
    },
  });

  // Q5: Essay
  const q5 = await prisma.question.create({
    data: {
      topicId: topicKalkulus.id,
      type: "ESSAY",
      content: "<p>Jelaskan langkah-langkah menentukan titik stasioner (maksimum/minimum) dari suatu kurva fungsi $y = f(x)$!</p>",
      difficulty: "MEDIUM",
      points: 2.0,
    },
  });

  // 6. Exam / Tes
  const exam = await prisma.exam.upsert({
    where: { code: "PAS-MTK-2026" },
    create: {
      title: "Penilaian Akhir Semester - Matematika Peminatan",
      code: "PAS-MTK-2026",
      description: "Ujian simulasi komprehensif 5 tipe soal matematika dengan rumus KaTeX dan anti-cheat.",
      subjectId: subjectMtk.id,
      durationMinutes: 45,
      token: "ZYACBT",
      isTokenDynamic: false,
      shuffleQuestions: true,
      shuffleOptions: true,
      showResult: true,
      showAnswerKey: true,
      minTimeMinutes: 0,
      maxViolations: 3,
      isPublished: true,
      examQuestions: {
        create: [
          { questionId: q1.id, orderIndex: 1, score: 20 },
          { questionId: q2.id, orderIndex: 2, score: 20 },
          { questionId: q3.id, orderIndex: 3, score: 20 },
          { questionId: q4.id, orderIndex: 4, score: 20 },
          { questionId: q5.id, orderIndex: 5, score: 20 },
        ],
      },
    },
    update: {},
  });

  console.log("✅ Ujian demo dibuat: Judul='Penilaian Akhir Semester - Matematika Peminatan', Token=ZYACBT");

  // 7. Auto import questions from legacy SQL if file exists
  const legacySqlPath = "C:\\Users\\User\\Downloads\\aplikasi-ujian-online-zyacbt-2025-12-25\\zyacbtpublic\\zyacbt-public-2024-05-05-tanpa-database.sql";
  if (fs.existsSync(legacySqlPath)) {
    console.log("📦 Ditemukan file database ZYACBT legacy, melakukan migrasi otomatis...");
    try {
      const sql = fs.readFileSync(legacySqlPath, "utf-8");
      // Migrating legacy topics and questions
      const topikRegex = /INSERT INTO [`"]?cbt_topik[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
      let match;
      const topikMap = new Map();

      while ((match = topikRegex.exec(sql)) !== null) {
        const rows = match[2].split(/\),\s*\(/g);
        for (let row of rows) {
          row = row.replace(/^\s*\(|\)\s*$/g, "");
          const parts = row.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
          if (parts.length >= 3) {
            const oldId = parseInt(parts[0]);
            const name = parts[2];
            const created = await prisma.topic.create({
              data: {
                subjectId: subjectMtk.id,
                name: name || "Topik ZYACBT",
              },
            });
            topikMap.set(oldId, created.id);
          }
        }
      }

      console.log(`✅ ${topikMap.size} Topik ZYACBT legacy berhasil diimpor.`);
    } catch (err) {
      console.warn("Notice: Legacy import parser notice:", err.message);
    }
  }

  console.log("🎉 Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
