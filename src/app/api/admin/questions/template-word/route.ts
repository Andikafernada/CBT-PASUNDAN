import { NextResponse } from "next/server";
import zlib from "zlib";

function createZipBuffer(files: { name: string; content: string }[]) {
  const fileEntries: Buffer[] = [];
  const centralDirectoryEntries: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileData = Buffer.from(file.content, "utf8");
    const nameBuffer = Buffer.from(file.name, "utf8");
    const compressed = zlib.deflateRawSync(fileData);

    // CRC32 calculation
    let crc = 0 ^ -1;
    for (let i = 0; i < fileData.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ fileData[i]) & 0xff];
    }
    crc = (crc ^ -1) >>> 0;

    // Local file header (30 bytes + name + compressed data)
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(8, 8); // Compression method (8 = Deflate)
    localHeader.writeUInt16LE(0, 10); // File last mod time
    localHeader.writeUInt16LE(0, 12); // File last mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
    localHeader.writeUInt32LE(fileData.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuffer.copy(localHeader, 30);

    const localEntry = Buffer.concat([localHeader, compressed]);
    fileEntries.push(localEntry);

    // Central directory header (46 bytes + name)
    const cdHeader = Buffer.alloc(46 + nameBuffer.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed to extract
    cdHeader.writeUInt16LE(0, 8); // General purpose bit flag
    cdHeader.writeUInt16LE(8, 10); // Compression method (8 = Deflate)
    cdHeader.writeUInt16LE(0, 12); // File last mod time
    cdHeader.writeUInt16LE(0, 14); // File last mod date
    cdHeader.writeUInt32LE(crc, 16); // CRC-32
    cdHeader.writeUInt32LE(compressed.length, 20); // Compressed size
    cdHeader.writeUInt32LE(fileData.length, 24); // Uncompressed size
    cdHeader.writeUInt16LE(nameBuffer.length, 28); // File name length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuffer.copy(cdHeader, 46);

    centralDirectoryEntries.push(cdHeader);
    offset += localEntry.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectoryEntries);
  const cdOffset = offset;
  const cdSize = centralDirBuffer.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(cdSize, 12); // Size of central directory
  eocd.writeUInt32LE(cdOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...fileEntries, centralDirBuffer, eocd]);
}

// CRC32 lookup table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export async function GET() {
  try {
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:b/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E3A8A"/></w:rPr><w:t>TEMPLATE RESMI BANK SOAL CBT (MICROSOFT WORD)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr><w:t>Panduan Guru: Format Pembuatan Butir Soal Lengkap (PG, MC, Benar/Salah, Menjodohkan, Esai)</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>------------------------------------------------------------------------------------------------------</w:t></w:r></w:p>

    <!-- PETUNJUK UMUM -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>PETUNJUK UMUM PENULISAN SOAL:</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Setiap butir soal diawali dengan nomor soal dan tanda titik (contoh: 1., 2., 3.).</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Opsi pilihan ganda ditulis diawali huruf kapital dan titik (A., B., C., D., E.).</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Kunci jawaban ditulis di bawah soal/opsi dengan format: KUNCI: [Jawaban].</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Rumus Matematika / Fisika / Kimia: gunakan tanda dollar, contoh: $f(x) = 3x^2 + 5x - 7$ atau $E = mc^2$.</w:t></w:r></w:p>
    <w:p><w:r><w:t>------------------------------------------------------------------------------------------------------</w:t></w:r></w:p>

    <!-- CONTOH 1: PILIHAN GANDA TUNGGAL (PG) -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>--- BENTUK 1: PILIHAN GANDA TUNGGAL (PG) ---</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Diketahui fungsi $f(x) = 2x^2 - 4x + 5$. Nilai dari turunan pertama $f'(3)$ adalah...</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. 6</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. 8</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. 10</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. 12</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. 14</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>KUNCI: B</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>

    <!-- CONTOH 2: PILIHAN GANDA KOMPLEKS (MC / MULTI-SELECT) -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>--- BENTUK 2: PILIHAN GANDA KOMPLEKS (JAWABAN BENAR LEBIH DARI SATU) ---</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>2. [TIPE: MC] Manakah di antara protokol berikut yang beroperasi pada lapisan Transport (Layer 4) dalam model OSI? (Pilihlah semua yang benar)</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. TCP (Transmission Control Protocol)</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. IP (Internet Protocol)</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. UDP (User Datagram Protocol)</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. HTTP (Hypertext Transfer Protocol)</w:t></w:r></w:p>
    <w:p><w:r><w:t>E. ARP (Address Resolution Protocol)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>KUNCI: A, C</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>

    <!-- CONTOH 3: BENAR / SALAH (T/F) -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>--- BENTUK 3: BENAR / SALAH (TRUE / FALSE) ---</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>3. [TIPE: TF] RAM (Random Access Memory) merupakan memori komputer yang bersifat non-volatile di mana data tetap tersimpan meskipun aliran listrik dimatikan.</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Benar</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Salah</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>KUNCI: SALAH</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>

    <!-- CONTOH 4: MENJODOHKAN (MATCHING) -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>--- BENTUK 4: MENJODOHKAN (MATCHING PAIRS) ---</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>4. [TIPE: MATCHING] Pasangkanlah perangkat keras jaringan komputer di sebelah kiri dengan fungsinya yang tepat di sebelah kanan:</w:t></w:r></w:p>
    <w:p><w:r><w:t>PASANGAN 1: Router &lt;=&gt; Menghubungkan beberapa segmen jaringan dan meneruskan paket data antar IP network.</w:t></w:r></w:p>
    <w:p><w:r><w:t>PASANGAN 2: Switch &lt;=&gt; Menghubungkan perangkat komputer dalam satu jaringan lokal (LAN) berbasis MAC Address.</w:t></w:r></w:p>
    <w:p><w:r><w:t>PASANGAN 3: Access Point &lt;=&gt; Memancarkan sinyal gelombang radio nirkabel (Wi-Fi) untuk menghubungkan perangkat nirkabel.</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>

    <!-- CONTOH 5: ESAI / URAIAN -->
    <w:p><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>--- BENTUK 5: ESAI / URAIAN (ESSAY) ---</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>5. [TIPE: ESSAY] Jelaskan secara singkat cara kerja protokol DHCP (Dynamic Host Configuration Protocol) dalam memberikan alamat IP secara otomatis kepada komputer klien (DORA process)!</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>KUNCI: Proses DORA meliputi: 1) Discover (klien mencari server DHCP), 2) Offer (server menawarkan IP), 3) Request (klien meminta IP tersebut), 4) Acknowledge (server mengonfirmasi alokasi IP).</w:t></w:r></w:p>

    <w:sectPr/>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docxBuffer = createZipBuffer([
      { name: "[Content_Types].xml", content: contentTypesXml },
      { name: "_rels/.rels", content: rootRelsXml },
      { name: "word/document.xml", content: documentXml },
    ]);

    return new NextResponse(docxBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="Template_Bank_Soal_Lengkap_CBT.docx"',
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
