const mammoth = require("mammoth");
const fs = require("fs");

function decodeHtmlText(raw) {
  // 1. Remove HTML tags first while entities like &lt; and &gt; are intact
  let text = raw.replace(/<[^>]+>/g, "");
  // 2. Decode entities
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

async function debugParas() {
  const buffer = fs.readFileSync("public/Soal_ASJ_Debian12_Lengkap.docx");
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const paragraphs = html
    .split(/<\/p>|<br\s*\/?>/gi)
    .map((p) => decodeHtmlText(p))
    .filter((p) => p.length > 0 && !p.startsWith("---") && !p.startsWith("===") && !p.startsWith("----"));

  paragraphs.forEach((p, idx) => {
    if (p.includes("PASANGAN") || p.includes("37.") || p.includes("38.")) {
      console.log(`[P ${idx}] text: [${p}]`);
      console.log(`  has<=>: ${p.includes("<=>")}, hasPASANGAN: ${p.includes("PASANGAN")}`);
    }
  });
}

debugParas().catch(console.error);
