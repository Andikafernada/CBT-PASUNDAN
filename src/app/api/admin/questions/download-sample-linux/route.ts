import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "BANK_SOAL_40_LINUX_DEBIAN12_VBOX.docx");
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File dokumen belum dibuat" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="BANK_SOAL_40_LINUX_DEBIAN12_VBOX.docx"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
