import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import sharp from "sharp";

const FOLDER = "/home/andika/normalized_kelas_x";

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

        for (let idx = 0; idx < qBlock.length; idx++) {
          const item = qBlock[idx];
          if (idx === qBlock.length - 1 && /^\.?\s*(?:kunci|jawaban|key|ans)\s*:/i.test(item.text)) {
            continue;
          }

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

        // Determine Question Type
        const blockText = qBlock.map((q) => q.text).join(" ");
        const upperKey = key.toUpperCase();

        if (/\[TIPE:\s*(?:TF|BENAR|SALAH)\]/i.test(blockText) || ["BENAR", "SALAH", "TRUE", "FALSE"].includes(upperKey)) {
          qType = "TRUE_FALSE";
        } else if (/\[TIPE:\s*(?:MC|KOMPLEKS)\]/i.test(blockText) || upperKey.includes(",") || (upperKey.match(/[A-E]/g) || []).length > 1) {
          qType = "COMPLEX_MULTIPLE_CHOICE";
        } else if (/\[TIPE:\s*(?:ESSAY|ESAI|URAIAN|ISIAN)\]/i.test(blockText) || (options.length === 0 && key.length > 5)) {
          qType = "ESSAY";
        }

        // Set correctness
        for (const opt of options) {
          if (qType === "TRUE_FALSE") {
            if (["BENAR", "TRUE"].includes(upperKey)) {
              opt.isCorrect = opt.label === "A" || opt.content.toLowerCase().includes("benar");
            } else {
              opt.isCorrect = opt.label === "B" || opt.content.toLowerCase().includes("salah");
            }
          } else {
            opt.isCorrect = upperKey.includes(opt.label);
          }
        }
      }

      let contentHtml = promptLines.join("<br/>").trim();
      contentHtml = contentHtml.replace(/^(?:<[^>]+>)*\s*(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?/i, "").trim();
      if (!contentHtml) contentHtml = `Soal Nomor ${k + 1}`;

      questions.push({
        number: k + 1,
        content: contentHtml,
        type: qType,
        correctAnswer: key,
        options,
        matchingPairs,
        hasImage: contentHtml.includes("<img"),
      });
    }
  }

  return questions;
}

async function run() {
  const files = fs.readdirSync(FOLDER).filter((f) => f.endsWith(".docx")).sort();
  console.log(`Found ${files.length} docx files to test parse:\n`);

  for (const f of files) {
    const fullPath = path.join(FOLDER, f);
    try {
      const qs = await parseDocx(fullPath);
      const imgCount = qs.filter((q) => q.hasImage).length;
      const typeCounts: Record<string, number> = {};
      qs.forEach((q) => {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      });
      const typesStr = Object.entries(typeCounts)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");
      console.log(`✓ ${f.padEnd(38)} -> Total: ${qs.length.toString().padStart(2)} Qs | ImgQs: ${imgCount.toString().padStart(2)} | ${typesStr}`);
    } catch (e: any) {
      console.log(`✗ ${f.padEnd(38)} -> ERROR: ${e.message}`);
    }
  }
}

run();
