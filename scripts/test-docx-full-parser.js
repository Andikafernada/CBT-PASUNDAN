const fs = require("fs");
const mammoth = require("mammoth");
const sharp = require("sharp");

async function parseDocx(buffer) {
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      return image.readAsBuffer().then(async (imageBuffer) => {
        try {
          const optimized = await sharp(imageBuffer)
            .resize({ width: 900, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          return {
            src: `data:image/webp;base64,${optimized.toString("base64")}`,
          };
        } catch {
          return image.readAsBase64String().then((b64) => ({
            src: `data:${image.contentType};base64,${b64}`,
          }));
        }
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  let html = result.value;

  // 1. Normalize list items in HTML
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, listContent) => {
    let itemIdx = 1;
    return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, item) => {
      const cleanText = item.replace(/<[^>]+>/g, "").trim();
      if (/^\d+[\.\)]/i.test(cleanText) || /^[A-Ea-e][\.\)]/i.test(cleanText)) {
        return `<p>${item}</p>`;
      }
      return `<p>${itemIdx++}. ${item}</p>`;
    });
  });

  html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<p>$1</p>");

  function decodeHtmlText(raw) {
    // Preserve <img> tags with safe marker
    let text = raw.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
      return ` <img src="${src}" alt="Gambar Soal" /> `;
    });

    // Remove other HTML tags
    text = text.replace(/<(?!\/?img\b)[^>]+>/gi, "");

    // Decode HTML entities
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

  const questions = [];
  let currentQuestion = null;
  let autoNumber = 1;

  for (const p of paragraphs) {
    // 0. Check Matching
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

    // 1. Question Number regex
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
        number: parseInt(qMatch[2]) || autoNumber++,
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

      if (currentQuestion.type === "MULTIPLE_CHOICE") {
        if (rawKey.includes(",") || (rawKey.match(/[A-E]/g) || []).length > 1) {
          currentQuestion.type = "COMPLEX_MULTIPLE_CHOICE";
        } else if (rawKey === "BENAR" || rawKey === "SALAH" || rawKey === "TRUE" || rawKey === "FALSE") {
          currentQuestion.type = "TRUE_FALSE";
        }
      }

      currentQuestion.options = currentQuestion.options.map((opt) => {
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
      // Append text or image to question content or last option
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

  return questions;
}

async function testFull() {
  const buf = fs.readFileSync("C:\\Users\\User\\Downloads\\Template_Bank_Soal_Lengkap_CBT (4).docx");
  const parsed = await parseDocx(buf);
  console.log("===============================================================================");
  console.log(`🎉 HASIL PARSING: ${parsed.length} BUTIR SOAL`);
  console.log("===============================================================================\n");

  let imgCount = 0;
  parsed.forEach((q) => {
    const hasImg = q.content.includes("<img") || q.options.some((o) => o.content.includes("<img"));
    if (hasImg) {
      imgCount++;
      console.log(`✅ [Soal #${q.number}] TYPE: ${q.type} | GAMBAR BERHASIL DIEKSTRAK!`);
      console.log(`   Preview Konten: ${q.content.substring(0, 140)}...`);
    }
  });

  console.log(`\nTotal soal ber-gambar yang berhasil diekstrak: ${imgCount}`);
}

testFull().catch(console.error);
