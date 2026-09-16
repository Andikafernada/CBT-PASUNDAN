import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { deleteCachePattern } from "../src/lib/redis";

const FOLDER = "/var/www/cbt-modern/normalized_kelas_x";

interface FileConfig {
  file: string;
  subjectCode: string;
  subjectName: string;
  examCode: string;
  examTitle: string;
}

const CONFIGS: FileConfig[] = [
  // 9 Mata Pelajaran Umum
  {
    file: "BAHASA INDONESIA KELAS 10.docx",
    subjectCode: "BINDO",
    subjectName: "Bahasa Indonesia",
    examCode: "STS26-X-BINDO",
    examTitle: "STS Gasal 2026 - Bahasa Indonesia Kelas X",
  },
  {
    file: "BAHASA SUNDA Kelas 10.docx",
    subjectCode: "BSUNDA",
    subjectName: "Bahasa Sunda",
    examCode: "STS26-X-BSUNDA",
    examTitle: "STS Gasal 2026 - Bahasa Sunda Kelas X",
  },
  {
    file: "INFORMATIKA Kelas 10.docx",
    subjectCode: "INF",
    subjectName: "Informatika",
    examCode: "STS26-X-INF",
    examTitle: "STS Gasal 2026 - Informatika Kelas X",
  },
  {
    file: "IPAS Kelas 10.docx",
    subjectCode: "IPAS",
    subjectName: "Projek IPAS",
    examCode: "STS26-X-IPAS",
    examTitle: "STS Gasal 2026 - Projek Ilmu Pengetahuan Alam dan Sosial Kelas X",
  },
  {
    file: "PAI Kelas 10.docx",
    subjectCode: "PABP",
    subjectName: "Pendidikan Agama dan Budi Pekerti",
    examCode: "STS26-X-PABP",
    examTitle: "STS Gasal 2026 - Pendidikan Agama dan Budi Pekerti Kelas X",
  },
  {
    file: "PJOK Kelas 10.docx",
    subjectCode: "PJOK",
    subjectName: "Pendidikan Jasmani Olah Raga dan Kesehatan",
    examCode: "STS26-X-PJOK",
    examTitle: "STS Gasal 2026 - Pendidikan Jasmani, Olah Raga dan Kesehatan Kelas X",
  },
  {
    file: "PKN Kelas 10.docx",
    subjectCode: "PANCASILA",
    subjectName: "Pendidikan Pancasila",
    examCode: "STS26-X-PANCASILA",
    examTitle: "STS Gasal 2026 - Pendidikan Pencasila Kelas X",
  },
  {
    file: "SEJARAH Kelas 10.docx",
    subjectCode: "SEJ",
    subjectName: "Sejarah",
    examCode: "STS26-X-SEJ",
    examTitle: "STS Gasal 2026 - Sejarah Kelas X",
  },
  {
    file: "SENI MUSIK Kelas 10.docx",
    subjectCode: "MUSIK",
    subjectName: "Seni Musik",
    examCode: "STS26-X-MUSIK",
    examTitle: "STS Gasal 2026 - Seni Musik Kelas X",
  },

  // 4 Mata Pelajaran Klaster
  {
    file: "B. INGGRIS TE, TJKT Kelas 10.docx",
    subjectCode: "BING-TE-TJKT",
    subjectName: "Bahasa Inggris (TE & TJKT)",
    examCode: "STS26-X-BING-TE-TJKT",
    examTitle: "STS Gasal 2026 - Bahasa Inggris Kelas X (TE & TJKT)",
  },
  {
    file: "BAHASA INGGRIS TM, TO Kelas 10.docx",
    subjectCode: "BING-TM-TO",
    subjectName: "Bahasa Inggris (TM & TO)",
    examCode: "STS26-X-BING-TM-TO",
    examTitle: "STS Gasal 2026 - Bahasa Inggris Kelas X (TM & TO)",
  },
  {
    file: "MATEMATIKA TE, TJKT Kelas 10.docx",
    subjectCode: "MTK-TE-TJKT",
    subjectName: "Matematika (TE & TJKT)",
    examCode: "STS26-X-MTK-TE-TJKT",
    examTitle: "STS Gasal 2026 - Matematika Kelas X (TE & TJKT)",
  },
  {
    file: "MATEMATIKA TM, TO Kelas 10.docx",
    subjectCode: "MTK-TM-TO",
    subjectName: "Matematika (TM & TO)",
    examCode: "STS26-X-MTK-TM-TO",
    examTitle: "STS Gasal 2026 - Matematika Kelas X (TM & TO)",
  },

  // 5 Mata Pelajaran Kejuruan (DDK)
  {
    file: "DDK TE Kelas 10.docx",
    subjectCode: "DDK-TE",
    subjectName: "Dasar-Dasar Kejuruan Teknik Elektronika",
    examCode: "STS26-X-DDK-TE",
    examTitle: "STS Gasal 2026 - DDK Teknik Elektronika Kelas X",
  },
  {
    file: "DDK TJKT Kelas 10.docx",
    subjectCode: "DDK-TJKT",
    subjectName: "Dasar-Dasar Kejuruan TJKT",
    examCode: "STS26-X-DDK-TJKT",
    examTitle: "STS Gasal 2026 - DDK TJKT Kelas X",
  },
  {
    file: "DDK TKR Kelas 10.docx",
    subjectCode: "DDK-TKR",
    subjectName: "Dasar-Dasar Kejuruan Teknik Kendaraan Ringan",
    examCode: "STS26-X-DDK-TKR",
    examTitle: "STS Gasal 2026 - DDK Teknik Kendaraan Ringan Kelas X",
  },
  {
    file: "DDK TM Kelas 10.docx",
    subjectCode: "DDK-TM",
    subjectName: "Dasar-Dasar Kejuruan Teknik Mesin",
    examCode: "STS26-X-DDK-TM",
    examTitle: "STS Gasal 2026 - DDK Teknik Mesin Kelas X",
  },
  {
    file: "DDK TSM Kelas 10.docx",
    subjectCode: "DDK-TSM",
    subjectName: "Dasar-Dasar Kejuruan Teknik Sepeda Motor",
    examCode: "STS26-X-DDK-TSM",
    examTitle: "STS Gasal 2026 - DDK Teknik Sepeda Motor Kelas X",
  },
];

function decodeHtmlText(raw: string): string {
  let text = raw
    .replace(/&lt;=&gt;|<=>/gi, " __MATCH_ARROW_EQ__ ")
    .replace(/&lt;-&gt;|<->/gi, " __MATCH_ARROW_DASH__ ")
    .replace(/===/g, " __MATCH_ARROW_TRIPLE__ ");

  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
    return ` <img src="${src}" alt="Gambar Soal" /> `;
  });
  text = text.replace(/<(?!\/?(?:img|sup|sub|b|strong|i|em|u)\b)[^>]+>/gi, "");
  text = text
    .replace(/__MATCH_ARROW_EQ__/g, "<=>")
    .replace(/__MATCH_ARROW_DASH__/g, "<->")
    .replace(/__MATCH_ARROW_TRIPLE__/g, "===")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text;
}

function cleanPlainText(raw: string): string {
  return raw
    .replace(/&lt;=&gt;|<=>/gi, " __MATCH_ARROW_EQ__ ")
    .replace(/&lt;-&gt;|<->/gi, " __MATCH_ARROW_DASH__ ")
    .replace(/===/g, " __MATCH_ARROW_TRIPLE__ ")
    .replace(/<[^>]+>/g, "")
    .replace(/__MATCH_ARROW_EQ__/g, "<=>")
    .replace(/__MATCH_ARROW_DASH__/g, "<->")
    .replace(/__MATCH_ARROW_TRIPLE__/g, "===")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function parseDocx(filePath: string) {
  const buffer = fs.readFileSync(filePath);

  const optionsMammoth = {
    convertImage: (mammoth.images as any).imgElement((image: any) => {
      return image.read().then(async (imageBuffer: Buffer) => {
        try {
          const optimized = await sharp(imageBuffer)
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          return {
            src: `data:image/webp;base64,${optimized.toString("base64")}`,
          };
        } catch {
          return image.readAsBase64String().then((b64: string) => ({
            src: `data:${image.contentType};base64,${b64}`,
          }));
        }
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, optionsMammoth);
  let html = result.value;

  // Normalize list items in HTML
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match: string, listContent: string) => {
    let itemIdx = 1;
    const converted = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, item: string) => {
      const cleanText = item.replace(/<[^>]+>/g, "").trim();
      if (/^(?:\[[^\]]+\]\s*)?(?:\d+|[A-Ea-e])[\.\)]/i.test(cleanText)) {
        return `</p><p>${item}</p><p>`;
      }
      return `</p><p>${itemIdx++}. ${item}</p><p>`;
    });
    return `</p><p>${converted}</p><p>`;
  });

  html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m: string, listContent: string) => {
    return `</p><p>${listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "</p><p>$1</p><p>")}</p><p>`;
  });

  html = html.replace(/<[ou]l[^>]*>/gi, "</p><p>");
  html = html.replace(/<\/[ou]l>/gi, "</p><p>");
  html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "</p><p>$1</p><p>");

  const rawParagraphs = html
    .split(/<\/p>|<br\s*\/?>|<\/tr>/gi)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const cleanParas: { html: string; text: string }[] = [];
  for (const rawP of rawParagraphs) {
    const decodedHtml = decodeHtmlText(rawP);
    const text = cleanPlainText(decodedHtml);
    if (!text && !decodedHtml.includes("<img")) continue;
    if (/^[-=_\*]{3,}$/.test(text)) continue;
    if (/^---\s*BENTUK\s*\d+/i.test(text)) continue;
    if (/^[A-E]\.\s*(?:PILIHAN GANDA|SOAL|PETUNJUK|ESSAY|URAIAN|ISIAN)/i.test(text)) continue;
    if (/^(petunjuk\s+umum|panduan\s+guru|identitas\s+soal|kartu\s+soal)/i.test(text)) continue;
    cleanParas.push({ html: decodedHtml, text });
  }

  // Scan for Endpoints (KUNCI lines or Matching Pairs)
  const endpoints: { index: number; type: "KUNCI" | "MATCHING" }[] = [];
  for (let i = 0; i < cleanParas.length; i++) {
    const t = cleanParas[i].text;
    const isKunci = /^\.?\s*(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*:/i.test(t);
    const isMatching = /<=>|<->|===|PASANGAN\s*\d*:/i.test(t);

    if (isKunci) {
      endpoints.push({ index: i, type: "KUNCI" });
    } else if (isMatching) {
      const nextIsMatching = i + 1 < cleanParas.length && /<=>|<->|===|PASANGAN\s*\d*:/i.test(cleanParas[i + 1].text);
      if (!nextIsMatching) {
        endpoints.push({ index: i, type: "MATCHING" });
      }
    }
  }

  const questions: any[] = [];

  if (endpoints.length > 0) {
    const starts: number[] = [0];
    for (let k = 1; k < endpoints.length; k++) {
      const prevEnd = endpoints[k - 1].index;
      const currEnd = endpoints[k].index;

      let foundStart = prevEnd + 1;
      for (let cand = prevEnd + 1; cand < currEnd; cand++) {
        const cText = cleanParas[cand].text;
        if (/^\s*\[TIPE:\s*[^\]]+\]/i.test(cText) || /^\s*\d+[\.\)]\s+/.test(cText)) {
          foundStart = cand;
          break;
        }
      }
      starts.push(foundStart);
    }

    for (let k = 0; k < endpoints.length; k++) {
      const startIdx = starts[k];
      const endIdx = endpoints[k].index;
      const epType = endpoints[k].type;

      let actualEndIdx = endIdx;
      if (k === endpoints.length - 1) {
        actualEndIdx = cleanParas.length - 1;
      } else if (k + 1 < starts.length) {
        actualEndIdx = starts[k + 1] - 1;
      }

      const qBlock = cleanParas.slice(startIdx, actualEndIdx + 1);

      let key = "";
      let qType = "MULTIPLE_CHOICE";
      const options: any[] = [];
      const matchingPairs: any[] = [];
      const promptLines: string[] = [];

      if (epType === "MATCHING") {
        qType = "MATCHING";
        key = "MATCHING";
        for (const item of qBlock) {
          if (/<=>|<->|===|=>|->|PASANGAN\s*\d*:/i.test(item.text)) {
            let sep = "<=>";
            if (item.text.includes("<=>")) sep = "<=>";
            else if (item.text.includes("<->")) sep = "<->";
            else if (item.text.includes("===")) sep = "===";

            const parts = item.text.split(sep);
            if (parts.length >= 2) {
              const left = parts[0].trim().replace(/^\d+[\.\)]\s*/, "").replace(/^[A-Za-z][\.\)]\s*/, "").trim();
              const right = parts.slice(1).join(sep).trim();
              if (left && right) {
                matchingPairs.push({ premise: left, response: right, orderIndex: matchingPairs.length });
              }
            }
          } else {
            promptLines.push(item.html);
          }
        }
      } else {
        const keyItem = cleanParas[endIdx];
        const keyMatch = keyItem.text.match(/^\.?\s*(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*:\s*(.+)/i);
        key = keyMatch ? keyMatch[1].trim() : "";

        // Collect items before the key
        const itemsBeforeKey = qBlock.slice(0, qBlock.length - 1);

        for (let idx = 0; idx < itemsBeforeKey.length; idx++) {
          const item = itemsBeforeKey[idx];
          const optMatch = item.text.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
          if (optMatch) {
            const label = optMatch[1].toUpperCase();
            let optHtml = item.html.replace(/^(?:<[^>]+>)*\s*([A-Ea-e])[\.\)]\s*(?:<\/[^>]+>)?\s*/i, "").trim();
            if (!optHtml) optHtml = optMatch[2].trim();
            options.push({ label, content: optHtml, isCorrect: false });
          } else {
            promptLines.push(item.html);
          }
        }

        // Special recovery: If options were not prefixed by A-E, but exactly 5 lines were provided before KUNCI (common in Math questions where formulas/images are options)
        const upperKey = key.toUpperCase().trim();
        const isSingleLetterKey = /^[A-E]$/.test(upperKey);

        if (options.length === 0 && itemsBeforeKey.length >= 5 && isSingleLetterKey) {
          // The last 5 items before key are options A, B, C, D, E
          const optItems = itemsBeforeKey.slice(itemsBeforeKey.length - 5);
          const promptItems = itemsBeforeKey.slice(0, itemsBeforeKey.length - 5);

          promptLines.length = 0;
          for (const pi of promptItems) promptLines.push(pi.html);

          const labels = ["A", "B", "C", "D", "E"];
          for (let oi = 0; oi < 5; oi++) {
            const rawOpt = optItems[oi].html.trim();
            options.push({
              label: labels[oi],
              content: rawOpt,
              isCorrect: labels[oi] === upperKey,
            });
          }
        }

        const blockText = qBlock.map((q) => q.text).join(" ");
        const isTFKey = ["BENAR", "SALAH", "TRUE", "FALSE", "T", "F"].includes(upperKey);
        const hasTFTag = /\[TIPE:\s*(?:TF|BENAR|SALAH)\]/i.test(blockText) || /T\s+OR\s+F/i.test(blockText) || /BENAR\s*\/\s*SALAH/i.test(blockText);

        if (isTFKey || hasTFTag) {
          qType = "TRUE_FALSE";
          const isTrue = ["BENAR", "TRUE", "T"].includes(upperKey);

          // Clean any leftover Benar/Salah text in prompt lines
          for (let pi = 0; pi < promptLines.length; pi++) {
            promptLines[pi] = promptLines[pi]
              .replace(/(?:<br\s*\/?>)?\s*(?:1[\.\)]\s*)?Benar\s*(?:<br\s*\/?>)?\s*(?:2[\.\)]\s*)?Salah/gi, "")
              .replace(/(?:<br\s*\/?>)?\s*(?:A[\.\)]\s*)?Benar\s*(?:<br\s*\/?>)?\s*(?:B[\.\)]\s*)?Salah/gi, "")
              .replace(/(?:<br\s*\/?>)?\s*Benar\s*(?:<br\s*\/?>)?\s*Salah/gi, "")
              .trim();
          }

          options.length = 0; // standard 2 options
          options.push(
            { label: "A", content: "Benar", isCorrect: isTrue },
            { label: "B", content: "Salah", isCorrect: !isTrue }
          );
        } else if (options.length === 0) {
          // If no options and not matching/TF, it is an ESSAY
          qType = "ESSAY";
        } else if (/\[TIPE:\s*(?:MC|KOMPLEKS)\]/i.test(blockText) || upperKey.includes(",") || (upperKey.match(/[A-E]/g) || []).length > 1) {
          qType = "COMPLEX_MULTIPLE_CHOICE";
        } else {
          qType = "MULTIPLE_CHOICE";
        }

        // Set correctness for regular multiple choice options
        if (qType === "MULTIPLE_CHOICE" || qType === "COMPLEX_MULTIPLE_CHOICE") {
          for (const opt of options) {
            opt.isCorrect = upperKey.includes(opt.label);
          }
        }
      }

      let contentHtml = promptLines.join("<br/>").trim();
      contentHtml = contentHtml.replace(/^(?:<[^>]+>)*\s*(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?/i, "").trim();
      // Clean trailing KUNCI if leaked into prompt
      contentHtml = contentHtml.replace(/<br\s*\/?>\s*KUNCI\s*:.*$/i, "").trim();

      if (!contentHtml) contentHtml = `Soal Nomor ${k + 1}`;

      questions.push({
        number: k + 1,
        content: contentHtml,
        type: qType,
        correctAnswer: key,
        options,
        matchingPairs,
        rubric: qType === "ESSAY" ? (key || "Kunci Jawaban Guru") : null,
      });
    }
  }

  return questions;
}

async function resolveDefaultTopicId(subjectId: string): Promise<string> {
  let topic = await prisma.topic.findFirst({
    where: { subjectId },
    orderBy: { createdAt: "asc" },
  });
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        subjectId,
        name: "Materi Umum",
        code: "GEN",
      },
    });
  }
  return topic.id;
}

async function main() {
  console.log("================================================================");
  console.log("   IMPORT MASSAL 18 FILE SOAL KELAS X KE ZYACBT MODERN LIVE   ");
  console.log("================================================================\n");

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    throw new Error("Admin user not found in database!");
  }

  console.log(`Creator User: ${adminUser.name} (${adminUser.username}) [ID: ${adminUser.id}]\n`);

  let grandTotalQuestions = 0;
  const summaryReport: any[] = [];

  for (let idx = 0; idx < CONFIGS.length; idx++) {
    const cfg = CONFIGS[idx];
    const filePath = path.join(FOLDER, cfg.file);
    console.log(`[${idx + 1}/${CONFIGS.length}] Memproses: ${cfg.file}`);

    if (!fs.existsSync(filePath)) {
      console.log(`   [!] File tidak ditemukan di ${filePath}`);
      continue;
    }

    // 1. Ensure Subject exists
    let subject = await prisma.subject.findUnique({
      where: { code: cfg.subjectCode },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          code: cfg.subjectCode,
          name: cfg.subjectName,
          description: `Mata Pelajaran ${cfg.subjectName} Kelas X`,
        },
      });
      console.log(`   + Created Subject: ${subject.name} (${subject.code})`);
    } else {
      console.log(`   ✓ Found Subject: ${subject.name} (${subject.code})`);
    }

    // 2. Resolve Topic
    const topicId = await resolveDefaultTopicId(subject.id);

    // 3. Ensure Exam exists
    let exam = await prisma.exam.findUnique({
      where: { code: cfg.examCode },
    });

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          code: cfg.examCode,
          title: cfg.examTitle,
          subjectId: subject.id,
          createdByUserId: adminUser.id,
          durationMinutes: 60,
          token: "ZYACBT",
          shuffleQuestions: true,
          shuffleOptions: true,
          showResult: true,
          isPublished: true,
        },
      });
      console.log(`   + Created Exam: ${exam.title} (${exam.code})`);
    } else {
      exam = await prisma.exam.update({
        where: { id: exam.id },
        data: {
          title: cfg.examTitle,
          subjectId: subject.id,
          isPublished: true,
        },
      });
      console.log(`   ✓ Found Exam: ${exam.title} (${exam.code})`);
    }

    // 4. Parse docx
    const parsedQuestions = await parseDocx(filePath);
    console.log(`   ✓ Selesai parsing: ${parsedQuestions.length} butir soal terdeteksi.`);

    // 5. Clean existing questions for this exam and subject to ensure clean fresh state
    await prisma.examQuestion.deleteMany({
      where: { examId: exam.id },
    });
    await prisma.question.deleteMany({
      where: { subjectId: subject.id },
    });

    // 6. Insert Questions, Options, MatchingPairs & link to ExamQuestion
    let insertedCount = 0;
    let imgCount = 0;

    for (let qIdx = 0; qIdx < parsedQuestions.length; qIdx++) {
      const q = parsedQuestions[qIdx];
      if (q.content.includes("<img")) imgCount++;

      const createdQ = await prisma.question.create({
        data: {
          subjectId: subject.id,
          topicId,
          createdByUserId: adminUser.id,
          type: q.type,
          content: q.content,
          difficulty: "MEDIUM",
          points: 1.0,
          rubric: q.rubric,
          ...(q.options && q.options.length > 0
            ? {
                options: {
                  create: q.options.map((opt: any, oIdx: number) => ({
                    content: opt.content,
                    isCorrect: Boolean(opt.isCorrect),
                    orderIndex: oIdx,
                  })),
                },
              }
            : {}),
          ...(q.matchingPairs && q.matchingPairs.length > 0
            ? {
                matchingPairs: {
                  create: q.matchingPairs.map((pair: any, pIdx: number) => ({
                    premise: pair.premise,
                    response: pair.response,
                    orderIndex: pIdx,
                  })),
                },
              }
            : {}),
        },
      });

      // Link to ExamQuestion
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: createdQ.id,
          orderIndex: qIdx + 1,
          score: 1.0,
        },
      });

      insertedCount++;
    }

    grandTotalQuestions += insertedCount;
    console.log(`   ✓ Berhasil mengimpor & menautkan ${insertedCount} butir soal (${imgCount} dengan gambar) ke ujian.`);

    summaryReport.push({
      file: cfg.file,
      examCode: cfg.examCode,
      subjectName: cfg.subjectName,
      questions: insertedCount,
      images: imgCount,
    });

    console.log("");
  }

  // 7. Invalidate Redis Cache
  console.log("Membersihkan Redis Cache bundle ujian...");
  await deleteCachePattern("cbt:exam:*:bundle").catch(() => {});
  console.log("✓ Redis cache invalidated.\n");

  console.log("================================================================");
  console.log(`SELESAI! Total ${grandTotalQuestions} butir soal berhasil diimpor ke 18 paket ujian.`);
  console.log("================================================================\n");

  console.table(summaryReport);
}

main()
  .catch((e) => {
    console.error("FATAL ERROR during mass import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
