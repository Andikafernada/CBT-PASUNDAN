const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Pure Node.js ZIP buffer builder (no external dependency needed)
function createZipBuffer(files) {
  const fileEntries = [];
  const centralDirectoryEntries = [];
  let offset = 0;

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  for (const file of files) {
    const fileData = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const nameBuffer = Buffer.from(file.name, "utf8");
    const compressed = zlib.deflateRawSync(fileData);

    let crc = 0 ^ -1;
    for (let i = 0; i < fileData.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ fileData[i]) & 0xff];
    }
    crc = (crc ^ -1) >>> 0;

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(fileData.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    fileEntries.push(localHeader, compressed);

    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(fileData.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralHeader, 46);

    centralDirectoryEntries.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectoryEntries);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0);
  endOfCentralDir.writeUInt16LE(0, 4);
  endOfCentralDir.writeUInt16LE(0, 6);
  endOfCentralDir.writeUInt16LE(files.length, 8);
  endOfCentralDir.writeUInt16LE(files.length, 10);
  endOfCentralDir.writeUInt32LE(centralDirBuffer.length, 12);
  endOfCentralDir.writeUInt32LE(offset, 16);
  endOfCentralDir.writeUInt16LE(0, 20);

  return Buffer.concat([...fileEntries, centralDirBuffer, endOfCentralDir]);
}

async function testMammothImageExtraction() {
  console.log("=== PENGUJIAN MAMMOTH IMAGE EXTRACTION ===");

  const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
  const pngBuffer = Buffer.from(samplePngBase64, "base64");

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      <w:r><w:t>1. Perhatikan gambar topologi jaringan berikut:</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline>
            <wp:extent cx="100000" cy="100000"/>
            <wp:docPr id="1" name="Gambar 1"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="1" name="image1.png"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rIdImg1"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>A. Topologi Star</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Topologi Mesh</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Topologi Ring</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Topologi Bus</w:t></w:r></w:p>
    <w:p><w:r><w:t>KUNCI: A</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const docxBuffer = createZipBuffer([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: rootRelsXml },
    { name: "word/_rels/document.xml.rels", content: docRelsXml },
    { name: "word/document.xml", content: documentXml },
    { name: "word/media/image1.png", content: pngBuffer },
  ]);

  const testFilePath = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern/public/test_image_exam.docx");
  fs.writeFileSync(testFilePath, docxBuffer);
  console.log("File uji dengan gambar dibuat di:", testFilePath);

  // Now convert using mammoth with image option
  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      return image.read("base64").then((imageBuffer) => {
        return {
          src: `data:${image.contentType};base64,${imageBuffer}`,
        };
      });
    }),
  };

  const result = await mammoth.convertToHtml({ buffer: docxBuffer }, options);
  console.log("\nHasil Konversi Mammoth (HTML):");
  console.log(result.value);

  const hasImg = result.value.includes("<img") && result.value.includes("data:image/png;base64,");
  console.log("\nStatus Ekstraksi Gambar:", hasImg ? "✅ BERHASIL 100%" : "❌ GAGAL");
}

testMammothImageExtraction().catch(console.error);
