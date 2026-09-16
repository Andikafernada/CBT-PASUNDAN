const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const sharp = require("sharp");

async function diagnose() {
  const filePath = "C:\\Users\\User\\Downloads\\Template_Bank_Soal_Lengkap_CBT (4).docx";
  console.log("Reading file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("File does not exist!");
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log("File size:", buffer.length, "bytes");

  let imageCount = 0;
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      imageCount++;
      return image.read("buffer").then(async (imageBuffer) => {
        console.log(`Found image #${imageCount}: type=${image.contentType}, original size=${imageBuffer.length} bytes`);
        try {
          const optimized = await sharp(imageBuffer)
            .resize({ width: 900, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          console.log(`  -> Optimized to WebP size=${optimized.length} bytes`);
          return {
            src: `data:image/webp;base64,${optimized.toString("base64")}`,
          };
        } catch (err) {
          console.error("  -> Sharp error:", err.message);
          const base64 = imageBuffer.toString("base64");
          return {
            src: `data:${image.contentType};base64,${base64}`,
          };
        }
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  console.log("Mammoth convert finished. Total images detected:", imageCount);
  console.log("HTML length:", result.value.length);
  console.log("\nWarnings from Mammoth:", result.messages);

  function decodeHtmlText(raw) {
    let text = raw.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
      return ` <img src="${src}" alt="Gambar Soal" /> `;
    });
    text = text.replace(/<(?!\/?img\b)[^>]+>/gi, "");
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

  const paragraphs = result.value
    .split(/<\/p>|<br\s*\/?>/gi)
    .map((p) => decodeHtmlText(p))
    .filter((p) => p.length > 0 && !p.startsWith("---") && !p.startsWith("===") && !p.startsWith("----"));

  console.log("\nTotal parsed paragraphs:", paragraphs.length);
  paragraphs.forEach((p, idx) => {
    const hasImg = p.includes("<img");
    const preview = p.length > 120 ? p.substring(0, 120) + "..." : p;
    console.log(`[P ${idx + 1}] (hasImage=${hasImg}): ${preview}`);
  });
}

diagnose().catch(console.error);
