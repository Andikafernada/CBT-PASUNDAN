import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sqlContent } = await req.json();

    if (!sqlContent || typeof sqlContent !== "string") {
      return NextResponse.json({ error: "SQL Content tidak boleh kosong" }, { status: 400 });
    }

    // Default subject
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

    let defaultGroup = await prisma.group.findFirst();
    if (!defaultGroup) {
      defaultGroup = await prisma.group.create({
        data: {
          code: "UMUM",
          name: "Kelas Umum / Migrasi",
          description: "Grup bawaan migrasi ZYACBT",
        },
      });
    }

    // Parse INSERT INTO statements
    const stats = {
      topics: 0,
      questions: 0,
      options: 0,
      users: 0,
    };

    // 1. Parse cbt_topik
    // INSERT INTO `cbt_topik` (`topik_id`, `topik_modul_id`, `topik_nama`, `topik_detail`, `topik_aktif`) VALUES (1, 1, 'Topik A', ...);
    const topikRegex = /INSERT INTO [`"]?cbt_topik[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
    let topikMatch;
    const topikIdMap = new Map<number, string>();

    while ((topikMatch = topikRegex.exec(sqlContent)) !== null) {
      const valuesBlock = topikMatch[2];
      const rows = valuesBlock.split(/\),\s*\(/g);

      for (let row of rows) {
        row = row.replace(/^\s*\(|\)\s*$/g, "");
        const parts = parseSqlValues(row);
        if (parts.length >= 3) {
          const oldTopikId = parseInt(parts[0]);
          const topikNama = cleanSqlString(parts[2]);
          const topikDetail = parts[3] ? cleanSqlString(parts[3]) : "";

          const createdTopic = await prisma.topic.create({
            data: {
              subjectId: subject.id,
              name: topikNama,
              description: topikDetail,
            },
          });
          topikIdMap.set(oldTopikId, createdTopic.id);
          stats.topics++;
        }
      }
    }

    // Fallback topic if none parsed
    let defaultTopic = await prisma.topic.findFirst();
    if (!defaultTopic) {
      defaultTopic = await prisma.topic.create({
        data: {
          subjectId: subject.id,
          name: "Topik Umum ZYACBT",
          description: "Topik utama hasil migrasi",
        },
      });
    }

    // 2. Parse cbt_soal
    // INSERT INTO `cbt_soal` (`soal_id`, `soal_topik_id`, `soal_detail`, `soal_tipe`, `soal_kesulitan`, `soal_aktif`) VALUES ...
    const soalRegex = /INSERT INTO [`"]?cbt_soal[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
    let soalMatch;
    const soalIdMap = new Map<number, string>();

    while ((soalMatch = soalRegex.exec(sqlContent)) !== null) {
      const valuesBlock = soalMatch[2];
      const rows = valuesBlock.split(/\),\s*\(/g);

      for (let row of rows) {
        row = row.replace(/^\s*\(|\)\s*$/g, "");
        const parts = parseSqlValues(row);
        if (parts.length >= 3) {
          const oldSoalId = parseInt(parts[0]);
          const oldTopikId = parseInt(parts[1]);
          const soalDetail = cleanSqlString(parts[2]);
          const soalTipe = parts[3] ? parseInt(parts[3]) : 1;

          let type = "MULTIPLE_CHOICE";
          if (soalTipe === 2) type = "ESSAY";
          else if (soalTipe === 3) type = "COMPLEX_MULTIPLE_CHOICE";
          else if (soalTipe === 4) type = "MATCHING";
          else if (soalTipe === 5) type = "TRUE_FALSE";

          const topicId = topikIdMap.get(oldTopikId) || defaultTopic.id;

          const createdQ = await prisma.question.create({
            data: {
              topicId,
              type,
              content: soalDetail,
              difficulty: "MEDIUM",
              points: 1.0,
            },
          });
          soalIdMap.set(oldSoalId, createdQ.id);
          stats.questions++;
        }
      }
    }

    // 3. Parse cbt_jawaban
    // INSERT INTO `cbt_jawaban` (`jawaban_id`, `jawaban_soal_id`, `jawaban_detail`, `jawaban_benar`, `jawaban_aktif`) VALUES ...
    const jawabanRegex = /INSERT INTO [`"]?cbt_jawaban[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
    let jawabanMatch;

    while ((jawabanMatch = jawabanRegex.exec(sqlContent)) !== null) {
      const valuesBlock = jawabanMatch[2];
      const rows = valuesBlock.split(/\),\s*\(/g);

      for (let row of rows) {
        row = row.replace(/^\s*\(|\)\s*$/g, "");
        const parts = parseSqlValues(row);
        if (parts.length >= 4) {
          const oldSoalId = parseInt(parts[1]);
          const jawabanDetail = cleanSqlString(parts[2]);
          const jawabanBenar = parseInt(parts[3]) === 1;

          const newQuestionId = soalIdMap.get(oldSoalId);
          if (newQuestionId) {
            await prisma.questionOption.create({
              data: {
                questionId: newQuestionId,
                content: jawabanDetail,
                isCorrect: jawabanBenar,
              },
            });
            stats.options++;
          }
        }
      }
    }

    // 4. Parse cbt_user (Peserta)
    const userRegex = /INSERT INTO [`"]?cbt_user[`"]?\s*\((.*?)\)\s*VALUES\s*([\s\S]+?);/gi;
    let userMatch;
    const defaultPasswordHash = await hashPassword("123456");

    while ((userMatch = userRegex.exec(sqlContent)) !== null) {
      const valuesBlock = userMatch[2];
      const rows = valuesBlock.split(/\),\s*\(/g);

      for (let row of rows) {
        row = row.replace(/^\s*\(|\)\s*$/g, "");
        const parts = parseSqlValues(row);
        if (parts.length >= 4) {
          const username = cleanSqlString(parts[1]);
          const rawPassword = cleanSqlString(parts[2]);
          const name = cleanSqlString(parts[3]);

          if (username && name) {
            const pwd = rawPassword.length > 0 ? rawPassword : defaultPasswordHash;
            await prisma.user.upsert({
              where: { username },
              create: {
                username,
                password: pwd,
                name,
                groupId: defaultGroup.id,
                role: "STUDENT",
              },
              update: {
                name,
              },
            });
            stats.users++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migrasi data ZYACBT legacy selesai berhasil!",
      stats,
    });
  } catch (error: any) {
    console.error("Legacy Migration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseSqlValues(sqlStr: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < sqlStr.length; i++) {
    const char = sqlStr[i];
    if ((char === "'" || char === '"') && sqlStr[i - 1] !== "\\") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuote = false;
      } else {
        cur += char;
      }
    } else if (char === "," && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  if (cur.trim().length > 0) {
    result.push(cur.trim());
  }
  return result;
}

function cleanSqlString(val: string): string {
  if (!val) return "";
  let res = val.trim();
  if ((res.startsWith("'") && res.endsWith("'")) || (res.startsWith('"') && res.endsWith('"'))) {
    res = res.substring(1, res.length - 1);
  }
  return res.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
}
