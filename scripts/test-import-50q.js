const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

async function testLocalMammoth() {
  const filePath = path.join(__dirname, "../BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx");
  const buffer = fs.readFileSync(filePath);

  let imageCount = 0;
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      imageCount++;
      return image.read("base64").then((imageBuffer) => {
        return {
          src: `data:${image.contentType};base64,${imageBuffer.substring(0, 30)}...`,
        };
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;

  console.log("=== HASIL PARSING WORD 50 SOAL ===");
  console.log("Jumlah Gambar Terdeteksi:", imageCount);
  console.log("Panjang HTML:", html.length);
  console.log("Cuplikan HTML Awal:", html.substring(0, 300));
}

testLocalMammoth().catch(console.error);
