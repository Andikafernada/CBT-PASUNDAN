import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const originalName = file.name || "soal.docx";
    const baseName = path.basename(originalName, path.extname(originalName));
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
    const tempInPath = path.join("/tmp", `mcp_in_${tempId}.docx`);
    const tempOutPath = path.join("/tmp", `mcp_out_${tempId}.docx`);

    await fs.writeFile(tempInPath, buffer);

    try {
      const scriptPath = "/var/www/cbt-modern/src/lib/mcp/normalizer_engine.py";
      const env = {
        ...process.env,
        OPENCODE_API_KEY: process.env.OPENCODE_API_KEY || "",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        AI_GRADER_ENDPOINT: process.env.AI_GRADER_ENDPOINT || "",
        GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      };

      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}" normalize "${tempInPath}" "${tempOutPath}"`,
        { env }
      );

      let stats: any = {};
      try {
        stats = JSON.parse(stdout.trim());
      } catch {
        stats = { rawOutput: stdout, error: stderr };
      }

      // Check if output file exists
      const outBuffer = await fs.readFile(tempOutPath);

      // Clean up temp files
      await fs.unlink(tempInPath).catch(() => {});
      await fs.unlink(tempOutPath).catch(() => {});

      const downloadFileName = `${baseName}_STANDAR_CBT.docx`;

      // Return docx file buffer as attachment with custom header containing stats
      return new NextResponse(outBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${downloadFileName}"`,
          "X-MCP-Questions": String(stats.total_questions || 0),
          "X-MCP-Images": String(stats.final_images || 0),
          "X-MCP-Preserved": String(stats.images_preserved ? "true" : "false"),
          "X-MCP-Fixed": String(stats.fixed_issues_count || 0),
          "X-MCP-Message": encodeURIComponent(stats.message || "Sukses dinormalisasi"),
        },
      });
    } catch (execErr: any) {
      await fs.unlink(tempInPath).catch(() => {});
      await fs.unlink(tempOutPath).catch(() => {});
      return NextResponse.json(
        { error: execErr.message || "Gagal menormalisasi file via MCP" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("MCP Normalize API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
