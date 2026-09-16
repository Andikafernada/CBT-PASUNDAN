const fs = require("fs");
const mammoth = require("mammoth");

async function testImgReader() {
  const buffer = fs.readFileSync("C:\\Users\\User\\Downloads\\Template_Bank_Soal_Lengkap_CBT (4).docx");
  const res = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        console.log("Image contentType:", image.contentType);
        return image.read("base64").then((b64) => {
          console.log("Base64 length:", b64.length);
          return { src: `data:${image.contentType};base64,${b64}` };
        });
      }),
    }
  );
  console.log("Result HTML length:", res.value.length);
  console.log("Result images count:", (res.value.match(/<img/g) || []).length);
}

testImgReader().catch(console.error);
