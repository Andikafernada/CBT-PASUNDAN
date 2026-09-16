const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function importLegacy() {
  const legacySqlPath = path.resolve(
    "C:/Users/User/Downloads/aplikasi-ujian-online-zyacbt-2025-12-25/zyacbtpublic/zyacbt-public-2024-05-05-tanpa-database.sql"
  );

  if (!fs.existsSync(legacySqlPath)) {
    console.error("❌ File legacy SQL tidak ditemukan di:", legacySqlPath);
    return;
  }

  console.log("🚀 Membaca file dump database ZYACBT legacy...");
  const sql = fs.readFileSync(legacySqlPath, "utf-8");

  // Create or get default subject
  let subject = await prisma.subject.findFirst();
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        code: "ZYACBT-MIGRATED",
        name: "Mata Pelajaran Migrasi ZYACBT",
        description: "Diimpor dari database ZYACBT lama",
      },
    });
  }

  // 1. Migrate Topics (cbt_topik)
  console.log("📥 Mengimpor cbt_topik...");
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
        const desc = parts[3] || "";
        const created = await prisma.topic.create({
          data: {
            subjectId: subject.id,
            name: name || `Topik ${oldId}`,
            description: desc,
          },
        });
        topikMap.set(oldId, created.id);
      }
    }
  }
  console.log(`✅ Berhasil mengimpor ${topikMap.size} topik.`);

  // 2. Migrate Questions (cbt_soal)
  console.log("📥 Mengimpor cbt_soal...");
  const soalRegex = /INSERT INTO [`"]?cbt_soal[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
  const soalMap = new Map();
  let defaultTopic = await prisma.topic.findFirst();

  while ((match = soalRegex.exec(sql)) !== null) {
    const rows = match[2].split(/\),\s*\(/g);
    for (let row of rows) {
      row = row.replace(/^\s*\(|\)\s*$/g, "");
      const parts = row.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
      if (parts.length >= 3) {
        const oldSoalId = parseInt(parts[0]);
        const oldTopikId = parseInt(parts[1]);
        const soalDetail = parts[2];
        const soalTipe = parts[3] ? parseInt(parts[3]) : 1;

        let type = "MULTIPLE_CHOICE";
        if (soalTipe === 2) type = "ESSAY";
        else if (soalTipe === 3) type = "COMPLEX_MULTIPLE_CHOICE";
        else if (soalTipe === 4) type = "MATCHING";
        else if (soalTipe === 5) type = "TRUE_FALSE";

        const topicId = topikMap.get(oldTopikId) || defaultTopic.id;

        const created = await prisma.question.create({
          data: {
            topicId,
            type,
            content: soalDetail,
            difficulty: "MEDIUM",
            points: 1.0,
          },
        });
        soalMap.set(oldSoalId, created.id);
      }
    }
  }
  console.log(`✅ Berhasil mengimpor ${soalMap.size} butir soal.`);

  // 3. Migrate Answers (cbt_jawaban)
  console.log("📥 Mengimpor cbt_jawaban...");
  const jawabanRegex = /INSERT INTO [`"]?cbt_jawaban[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
  let answerCount = 0;

  while ((match = jawabanRegex.exec(sql)) !== null) {
    const rows = match[2].split(/\),\s*\(/g);
    for (let row of rows) {
      row = row.replace(/^\s*\(|\)\s*$/g, "");
      const parts = row.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
      if (parts.length >= 4) {
        const oldSoalId = parseInt(parts[1]);
        const jawabanDetail = parts[2];
        const isBenar = parseInt(parts[3]) === 1;

        const newQId = soalMap.get(oldSoalId);
        if (newQId) {
          await prisma.questionOption.create({
            data: {
              questionId: newQId,
              content: jawabanDetail,
              isCorrect: isBenar,
            },
          });
          answerCount++;
        }
      }
    }
  }
  console.log(`✅ Berhasil mengimpor ${answerCount} opsi jawaban.`);
  console.log("🎉 Migrasi database legacy ZYACBT selesai sempurna!");
}

importLegacy()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
