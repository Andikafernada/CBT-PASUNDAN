const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

async function inspectDocx() {
  const filePath = path.join(__dirname, "..", "public", "Soal_ASJ_Debian12_Lengkap.docx");
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  console.log("=== RAW MAMMOTH HTML ===");
  console.log(result.value);

  console.log("\n=== SPLIT PARAGRAPHS ===");
  const paras = result.value.split(/<\/p>|<br\s*\/?>/gi);
  paras.forEach((p, idx) => {
    if (p.includes("MATCHING") || p.includes("PASANGAN") || p.includes("Pasangkan")) {
      console.log(`[P ${idx}]`, JSON.stringify(p));
    }
  });
}

inspectDocx().catch(console.error);
