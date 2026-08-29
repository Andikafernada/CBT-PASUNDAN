const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

async function testVariedImport() {
  const filePath = path.join(__dirname, "../BANK_SOAL_40_LINUX_DEBIAN12_VBOX.docx");
  const buffer = fs.readFileSync(filePath);

  let imageCount = 0;
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      imageCount++;
      return image.read("base64").then((imageBuffer) => {
        return {
          src: `data:${image.contentType};base64,image_data`,
        };
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;

  console.log("=== HASIL PARSING 40 SOAL BERBAGAI BENTUK ===");
  console.log("Total Gambar Terdeteksi:", imageCount);
  console.log("Panjang Karakter HTML:", html.length);
}

testVariedImport().catch(console.error);
