const mammoth = require("mammoth");
const fs = require("fs");

function decodeHtmlText(raw) {
  let text = raw.replace(/<[^>]+>/g, "");
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

async function testParse() {
  const buffer = fs.readFileSync("public/Soal_ASJ_Debian12_Lengkap.docx");
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const paragraphs = html
    .split(/<\/p>|<br\s*\/?>/gi)
    .map((p) => decodeHtmlText(p))
    .filter((p) => p.length > 0 && !p.startsWith("---") && !p.startsWith("===") && !p.startsWith("----"));

  const questions = [];
  let currentQuestion = null;

  for (const p of paragraphs) {
    // Check if line is a Matching Pair FIRST (contains <=> or <-> or === or PASANGAN)
    const hasPairSep = p.includes("<=>") || p.includes("<->") || p.includes("===") || (p.toUpperCase().includes("PASANGAN") && (p.includes(":") || p.includes("<=")));
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

    const qMatch = p.match(/^(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(.+)/i);
    const optMatch = p.match(/^([A-Ea-e])[\.\)]\s*(.+)/);
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
    } else if (optMatch && currentQuestion) {
      currentQuestion.options.push({
        label: optMatch[1].toUpperCase(),
        content: optMatch[2].trim(),
        isCorrect: false,
      });
    }
  }

  if (currentQuestion) questions.push(currentQuestion);

  console.log(`Parsed ${questions.length} questions.`);
  const matchings = questions.filter((q) => q.type === "MATCHING");
  console.log(`Found ${matchings.length} matching questions.`);
  matchings.forEach((m, idx) => {
    console.log(`\nMatching #${idx + 1}: ${m.content}`);
    console.log(`Pairs count: ${m.matchingPairs.length}`);
    m.matchingPairs.forEach((p, pIdx) => {
      console.log(`  [${pIdx + 1}] Premis (Kiri): "${p.premise}"  <=====>  Jodoh (Kanan): "${p.response}"`);
    });
  });
}

testParse().catch(console.error);
