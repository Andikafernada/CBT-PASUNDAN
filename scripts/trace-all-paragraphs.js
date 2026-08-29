const fs = require("fs");
const mammoth = require("mammoth");
const sharp = require("sharp");

async function trace() {
  const buffer = fs.readFileSync("C:\\Users\\User\\Downloads\\Template_Bank_Soal_Lengkap_CBT (4).docx");

  let imgCount = 0;
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      imgCount++;
      return image.read("buffer").then(async (imageBuffer) => {
        try {
          const optimized = await sharp(imageBuffer)
            .resize({ width: 900, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          return {
            src: `data:image/webp;base64,${optimized.toString("base64")}`,
          };
        } catch {
          const base64 = imageBuffer.toString("base64");
          return {
            src: `data:${image.contentType};base64,${base64}`,
          };
        }
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  let html = result.value;

  console.log(`Images in raw mammoth HTML: ${(html.match(/<img/g) || []).length}`);

  // Look at lines with <img
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

  console.log(`Images after list normalization: ${(html.match(/<img/g) || []).length}`);

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

  const rawSplits = html.split(/<\/p>|<br\s*\/?>/gi);
  console.log(`Total raw splits: ${rawSplits.length}`);
  let imgSplits = 0;
  rawSplits.forEach((r, i) => {
    if (r.includes("<img")) {
      imgSplits++;
      console.log(`Raw split #${i} has image! Length: ${r.length}, preview: ${r.substring(0, 100)}...`);
    }
  });

  const paragraphs = rawSplits
    .map((p) => decodeHtmlText(p))
    .filter((p) => p.length > 0 && !p.startsWith("---") && !p.startsWith("===") && !p.startsWith("----"));

  console.log(`Total paragraphs after decode & filter: ${paragraphs.length}`);
  let imgParas = 0;
  paragraphs.forEach((p, i) => {
    if (p.includes("<img")) {
      imgParas++;
      console.log(`Decoded paragraph #${i} has image! Length: ${p.length}`);
    }
  });
}

trace().catch(console.error);
