import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "sts";

    let fileName = "TEMPLATE_DAFTAR_PESERTA_STS.xlsx";
    if (type === "standard" || type === "std" || type === "single") {
      fileName = "TEMPLATE_UPLOAD_PESERTA_STANDAR.xlsx";
    }

    const filePath = path.join(process.cwd(), "public", "templates", fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File template ${fileName} tidak ditemukan di server` }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal mengunduh template" }, { status: 500 });
  }
}
