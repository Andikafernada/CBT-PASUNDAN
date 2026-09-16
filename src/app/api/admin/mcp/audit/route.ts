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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
    const tempInPath = path.join("/tmp", `mcp_audit_${tempId}.docx`);

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

      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" audit "${tempInPath}"`, { env });

      let result: any = null;
      try {
        result = JSON.parse(stdout.trim());
      } catch {
        result = { rawOutput: stdout, error: stderr };
      }

      await fs.unlink(tempInPath).catch(() => {});
      return NextResponse.json(result);
    } catch (execErr: any) {
      await fs.unlink(tempInPath).catch(() => {});
      return NextResponse.json({ error: execErr.message || "Gagal menjalankan audit MCP" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("MCP Audit API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
