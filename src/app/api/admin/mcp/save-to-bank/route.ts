import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { deleteCachePattern } from "@/lib/redis";
import mammoth from "mammoth";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

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

async function parseDocxBufferToQuestions(buffer: Buffer): Promise<any[]> {
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
    const plain = cleanPlainText(rawP);
    if (!plain && !decodedHtml.includes("<img")) continue;
    cleanParas.push({ html: decodedHtml, text: plain });
  }

  const questions: any[] = [];
  let currentQuestion: any = null;
  let activeSectionType: string | null = null;

  for (let p of cleanParas.map((c) => c.html)) {
    const pText = cleanPlainText(p);

    // Deteksi Tag Bagian Berdiri Sendiri
    const sectionMatch = pText.match(/^\[(?:TIPE|BENTUK|BAGIAN)?\s*:?\s*([A-Za-z_\/\s]+)\]$/i);
    if (sectionMatch) {
      const sTag = sectionMatch[1].toUpperCase();
      if (sTag.includes("MC") || sTag.includes("KOMPLEKS")) activeSectionType = "COMPLEX_MULTIPLE_CHOICE";
      else if (sTag.includes("TF") || sTag.includes("BENAR") || sTag.includes("SALAH")) activeSectionType = "TRUE_FALSE";
      else if (sTag.includes("MATCH") || sTag.includes("JODOH")) activeSectionType = "MATCHING";
      else if (sTag.includes("ESAI") || sTag.includes("ESSAY") || sTag.includes("URAIAN") || sTag.includes("ISIAN")) activeSectionType = "ESSAY";
      else if (sTag.includes("PILIHAN GANDA") || sTag.includes("PG")) activeSectionType = "MULTIPLE_CHOICE";
      continue;
    }

    const hasPairSep = pText.includes("<=>") || pText.includes("<->") || pText.includes("===") || (pText.toUpperCase().startsWith("PASANGAN") && (pText.includes(":") || pText.includes("<=")));
    if (hasPairSep && currentQuestion) {
      let sep = "<=>";
      if (pText.includes("<=>")) sep = "<=>";
      else if (pText.includes("<->")) sep = "<->";
      else if (pText.includes("===")) sep = "===";
      else if (pText.includes(":")) sep = ":";

      const parts = pText.split(sep);
      if (parts.length >= 2) {
        let left = parts[0].trim();
        let right = parts.slice(1).join(sep).trim();

        left = left
          .replace(/^(?:PASANGAN|PAIR|ITEM)\s*[A-Za-z0-9]*\s*[:\.]?\s*/i, "")
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[A-Za-z][\.\)]\s*/, "")
          .trim();

        if (left && right) {
          currentQuestion.type = "MATCHING";
          currentQuestion.matchingPairs.push({
            premise: left,
            response: right,
            orderIndex: currentQuestion.matchingPairs.length,
          });
          continue;
        }
      }
    }

    const qMatch = pText.match(/^(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(.*)/i);
    const optMatch = pText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
    const keyMatch = pText.match(/^(?:KUNCI|JAWABAN|KEY)\s*:\s*(.+)/i);

    if (qMatch) {
      if (currentQuestion) questions.push(currentQuestion);
      const tag = (qMatch[1] || qMatch[3] || "").toUpperCase();
      let qType = activeSectionType || "MULTIPLE_CHOICE";
      if (tag.includes("MC") || tag.includes("KOMPLEKS")) qType = "COMPLEX_MULTIPLE_CHOICE";
      else if (tag.includes("TF") || tag.includes("BENAR") || tag.includes("SALAH")) qType = "TRUE_FALSE";
      else if (tag.includes("MATCH") || tag.includes("JODOH")) qType = "MATCHING";
      else if (tag.includes("ESSAY") || tag.includes("URAIAN") || tag.includes("ISIAN") || tag.includes("ESAI")) qType = "ESSAY";
      else if (tag.includes("MULTIPLE_CHOICE") || tag.includes("PG")) qType = "MULTIPLE_CHOICE";

      let qContent = p.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
      qContent = qContent.replace(/^(?:<[^>]+>)*\s*(?:\[TIPE:\s*[A-Za-z_\/]+\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*[A-Za-z_\/]+\]\s*)?(?:<\/[^>]+>)?\s*/i, "").trim();
      if (!qContent) qContent = qMatch[4].trim();

      currentQuestion = {
        number: parseInt(qMatch[2]),
        content: qContent,
        type: qType,
        options: [],
        matchingPairs: [],
        correctAnswer: "",
        points: 1.0,
        difficulty: "MEDIUM",
      };
    } else if (keyMatch && currentQuestion) {
      const rawKey = keyMatch[1].replace(/<[^>]+>/g, "").trim().toUpperCase();
      currentQuestion.correctAnswer = rawKey;

      if (["BENAR", "SALAH", "TRUE", "FALSE"].includes(rawKey)) {
        currentQuestion.type = "TRUE_FALSE";
      } else if (currentQuestion.type === "MULTIPLE_CHOICE") {
        if (rawKey.includes(",") || (rawKey.match(/[A-E]/g) || []).length > 1) {
          currentQuestion.type = "COMPLEX_MULTIPLE_CHOICE";
        }
      }

      currentQuestion.options = currentQuestion.options.map((opt: any) => {
        let isCorrect = false;
        if (["BENAR", "TRUE"].includes(rawKey)) {
          isCorrect = (opt.label === "A" || opt.content.toLowerCase().includes("benar"));
        } else if (["SALAH", "FALSE"].includes(rawKey)) {
          isCorrect = (opt.label === "B" || opt.content.toLowerCase().includes("salah"));
        } else {
          isCorrect = rawKey.includes(opt.label);
        }
        return { ...opt, isCorrect };
      });
      } else if (optMatch && currentQuestion) {
        let optContent = p.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
        optContent = optContent.replace(/^(?:<[^>]+>)*\s*([A-Ea-e])[\.\)]\s*(?:<\/[^>]+>)?\s*/i, "").trim();
        if (!optContent) optContent = optMatch[2].trim();

        currentQuestion.options.push({
          label: optMatch[1].toUpperCase(),
          content: optContent,
          isCorrect: false,
        });
      if (currentQuestion.options.length === 0) {
        currentQuestion.content = (currentQuestion.content ? currentQuestion.content + "<br/>" : "") + p;
      } else {
        currentQuestion.options[currentQuestion.options.length - 1].content += " " + p;
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions.map((q, idx) => {
    let content = (q.content || "").trim();
    if (!content) {
      content = q.type === "MATCHING"
        ? "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan:"
        : `Soal Nomor ${q.number || idx + 1}`;
    }
    return { ...q, content };
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Superuser & Guru" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let subjectId = "";
    let questionsToSave: any[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      subjectId = (formData.get("subjectId") as string) || "";

      if (!file) {
        return NextResponse.json({ error: "File dokumen Word belum dipilih" }, { status: 400 });
      }
      if (!subjectId) {
        return NextResponse.json({ error: "Mata pelajaran tujuan wajib dipilih" }, { status: 400 });
      }

      // Normalisasi file via MCP engine
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
      const tempInPath = path.join("/tmp", `mcp_save_in_${tempId}.docx`);
      const tempOutPath = path.join("/tmp", `mcp_save_out_${tempId}.docx`);

      await fs.writeFile(tempInPath, buffer);

      try {
        const scriptPath = "/var/www/cbt-modern/src/lib/mcp/normalizer_engine.py";
        await execAsync(`python3 "${scriptPath}" normalize "${tempInPath}" "${tempOutPath}"`);
        const outBuffer = await fs.readFile(tempOutPath);

        // Parse docx yang sudah ternormalisasi
        questionsToSave = await parseDocxBufferToQuestions(outBuffer);

        await fs.unlink(tempInPath).catch(() => {});
        await fs.unlink(tempOutPath).catch(() => {});
      } catch (err: any) {
        await fs.unlink(tempInPath).catch(() => {});
        await fs.unlink(tempOutPath).catch(() => {});
        return NextResponse.json({ error: "Gagal menormalisasi file: " + err.message }, { status: 500 });
      }
    } else {
      // JSON payload
      const body = await req.json();
      subjectId = body.subjectId;
      questionsToSave = body.questions || [];
    }

    if (!subjectId) {
      return NextResponse.json({ error: "Mata pelajaran wajib dipilih" }, { status: 400 });
    }
    if (!questionsToSave || questionsToSave.length === 0) {
      return NextResponse.json({ error: "Tidak ada butir soal yang dapat disimpan" }, { status: 400 });
    }

    const defaultTopicId = await resolveDefaultTopicId(subjectId);
    let savedCount = 0;

    for (const q of questionsToSave) {
      const safeContent = (q.content && q.content.trim())
        ? q.content.trim()
        : (q.type === "MATCHING"
            ? "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan:"
            : `Soal Nomor ${q.number || savedCount + 1}`);

      await prisma.question.create({
        data: {
          subjectId,
          topicId: defaultTopicId,
          type: q.type || "MULTIPLE_CHOICE",
          content: safeContent,
          difficulty: q.difficulty || "MEDIUM",
          points: Number(q.points) || 1.0,
          rubric: q.correctAnswer || null,
          createdByUserId: user.id,
          ...(q.options && q.options.length > 0
            ? {
                options: {
                  create: q.options.map((opt: any, idx: number) => ({
                    content: opt.content,
                    isCorrect: Boolean(opt.isCorrect),
                    orderIndex: idx,
                  })),
                },
              }
            : {}),
          ...(q.matchingPairs && q.matchingPairs.length > 0
            ? {
                matchingPairs: {
                  create: q.matchingPairs.map((pair: any, idx: number) => ({
                    premise: pair.premise,
                    response: pair.response,
                    orderIndex: idx,
                  })),
                },
              }
            : {}),
        },
      });
      savedCount++;
    }

    // Invalidate exam bundle cache
    deleteCachePattern("cbt:exam:*:bundle").catch(() => {});

    return NextResponse.json({
      success: true,
      count: savedCount,
      message: `Berhasil menyimpan ${savedCount} butir soal ke dalam Bank Soal!`,
    });
  } catch (error: any) {
    console.error("Save to Bank Error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan ke Bank Soal" }, { status: 500 });
  }
}
