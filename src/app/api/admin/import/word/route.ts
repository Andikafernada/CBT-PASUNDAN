import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import sharp from "sharp";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Administrator & Guru" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File soal (.docx atau .xlsx) tidak ditemukan" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const questions: any[] = [];

    // 1. Handle Excel (.xlsx / .xls / .csv)
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rawRows || rawRows.length === 0) {
        return NextResponse.json({ error: "File Excel soal kosong atau format tidak sesuai" }, { status: 400 });
      }

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
              return String(row[k]).trim();
            }
            const foundKey = Object.keys(row).find((rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, ""));
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
              return String(row[foundKey]).trim();
            }
          }
          return "";
        };

        const content = getVal("Soal", "Pertanyaan", "Soal / Pertanyaan", "Question");
        if (!content) continue;

        const optA = getVal("Pilihan A", "Opsi A", "A");
        const optB = getVal("Pilihan B", "Opsi B", "B");
        const optC = getVal("Pilihan C", "Opsi C", "C");
        const optD = getVal("Pilihan D", "Opsi D", "D");
        const optE = getVal("Pilihan E", "Opsi E", "E");
        const rawKey = (getVal("Kunci Jawaban", "Kunci", "Jawaban Benar", "Key") || "A").toUpperCase();
        const difficulty = (getVal("Tingkat Kesukaran", "Kesukaran", "Difficulty") || "MEDIUM").toUpperCase();
        const points = parseFloat(getVal("Bobot", "Poin", "Points", "Score") || "1.0") || 1.0;

        const options: any[] = [];
        if (optA) options.push({ label: "A", content: optA, isCorrect: rawKey.includes("A") });
        if (optB) options.push({ label: "B", content: optB, isCorrect: rawKey.includes("B") });
        if (optC) options.push({ label: "C", content: optC, isCorrect: rawKey.includes("C") });
        if (optD) options.push({ label: "D", content: optD, isCorrect: rawKey.includes("D") });
        if (optE) options.push({ label: "E", content: optE, isCorrect: rawKey.includes("E") });

        const isComplex = (rawKey.match(/[A-E]/g) || []).length > 1;

        questions.push({
          number: i + 1,
          content,
          type: isComplex ? "COMPLEX_MULTIPLE_CHOICE" : "MULTIPLE_CHOICE",
          difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty) ? difficulty : "MEDIUM",
          points,
          correctAnswer: rawKey,
          options,
        });
      }

      return NextResponse.json({
        success: true,
        fileType: "EXCEL",
        parsedCount: questions.length,
        questions,
      });
    }

    // 2. Handle Microsoft Word (.docx) with embedded WebP image auto-compression
    const options = {
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.readAsBuffer().then(async (imageBuffer: Buffer) => {
          try {
            // Compress and resize image to WebP (max width 900px, quality 80)
            const optimized = await sharp(imageBuffer)
              .resize({ width: 900, withoutEnlargement: true })
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

    const result = await mammoth.convertToHtml({ buffer }, options);
    let html = result.value;

    // Normalize list items in HTML so numbered lists become distinct lines
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match: string, listContent: string) => {
      let itemIdx = 1;
      return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, item: string) => {
        const cleanText = item.replace(/<[^>]+>/g, "").trim();
        if (/^\d+[\.\)]/i.test(cleanText) || /^[A-Ea-e][\.\)]/i.test(cleanText)) {
          return `<p>${item}</p>`;
        }
        return `<p>${itemIdx++}. ${item}</p>`;
      });
    });

    html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<p>$1</p>");

    function decodeHtmlText(raw: string): string {
      // 1. Preserve <img> tags
      let text = raw.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
        return ` <img src="${src}" alt="Gambar Soal" /> `;
      });

      // 2. Remove other HTML tags but preserve text content
      text = text.replace(/<(?!\/?img\b)[^>]+>/gi, "");

      // 3. Decode HTML entities
      text = text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();

      return text;
    }

    const paragraphs = html
      .split(/<\/p>|<br\s*\/?>/gi)
      .map((p) => decodeHtmlText(p))
      .filter((p) => p.length > 0 && !p.startsWith("---") && !p.startsWith("===") && !p.startsWith("----"));

    let currentQuestion: any = null;

    for (const p of paragraphs) {
      // 0. Check if line is a Matching Pair FIRST (contains <=> or <-> or === or PASANGAN)
      const hasPairSep = p.includes("<=>") || p.includes("<->") || p.includes("===") || (p.toUpperCase().startsWith("PASANGAN") && (p.includes(":") || p.includes("<=")));
      if (hasPairSep && currentQuestion) {
        let sep = "<=>";
        if (p.includes("<=>")) sep = "<=>";
        else if (p.includes("<->")) sep = "<->";
        else if (p.includes("===")) sep = "===";
        else if (p.includes(":")) sep = ":";

        const parts = p.split(sep);
        if (parts.length >= 2) {
          let left = parts[0].trim();
          let right = parts.slice(1).join(sep).trim();

          // Strip "PASANGAN 1:", "PASANGAN A:", "1.", "A." prefix from left premise
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

      // 1. Check if line starts with question number: "1.", "2)", "[TIPE: MC] 1." or "1. [TIPE: MC]"
      const qMatch = p.match(/^(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(.*)/i);
      const optMatch = p.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
      const keyMatch = p.match(/^(?:KUNCI|JAWABAN|KEY)\s*:\s*(.+)/i);

      if (qMatch) {
        if (currentQuestion) questions.push(currentQuestion);
        const tag = (qMatch[1] || qMatch[3] || "").toUpperCase();
        let qType = "MULTIPLE_CHOICE";
        if (tag.includes("MC") || tag.includes("KOMPLEKS")) qType = "COMPLEX_MULTIPLE_CHOICE";
        else if (tag.includes("TF") || tag.includes("BENAR") || tag.includes("SALAH")) qType = "TRUE_FALSE";
        else if (tag.includes("MATCH") || tag.includes("JODOH")) qType = "MATCHING";
        else if (tag.includes("ESSAY") || tag.includes("URAIAN") || tag.includes("ISIAN")) qType = "ESSAY";

        currentQuestion = {
          number: parseInt(qMatch[2]),
          content: qMatch[4].trim(),
          type: qType,
          options: [],
          matchingPairs: [],
          correctAnswer: "",
          points: 1.0,
          difficulty: "MEDIUM",
        };
      } else if (keyMatch && currentQuestion) {
        const rawKey = keyMatch[1].trim().toUpperCase();
        currentQuestion.correctAnswer = rawKey;

        // Auto-detect question type if still MULTIPLE_CHOICE (default)
        if (currentQuestion.type === "MULTIPLE_CHOICE") {
          if (rawKey.includes(",") || (rawKey.match(/[A-E]/g) || []).length > 1) {
            currentQuestion.type = "COMPLEX_MULTIPLE_CHOICE";
          } else if (rawKey === "BENAR" || rawKey === "SALAH" || rawKey === "TRUE" || rawKey === "FALSE") {
            currentQuestion.type = "TRUE_FALSE";
          }
        }

        // Apply correct state to options
        currentQuestion.options = currentQuestion.options.map((opt: any) => {
          const isCorrect =
            rawKey.includes(opt.label) ||
            (rawKey === "BENAR" && (opt.label === "A" || opt.content.toLowerCase().includes("benar"))) ||
            (rawKey === "SALAH" && (opt.label === "B" || opt.content.toLowerCase().includes("salah")));
          return { ...opt, isCorrect };
        });
      } else if (optMatch && currentQuestion) {
        currentQuestion.options.push({
          label: optMatch[1].toUpperCase(),
          content: optMatch[2].trim(),
          isCorrect: false,
        });
      } else if (currentQuestion) {
        // Append text to question content or last option
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

    return NextResponse.json({
      success: true,
      fileType: "WORD",
      parsedCount: questions.length,
      questions,
    });
  } catch (error: any) {
    console.error("Word Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
