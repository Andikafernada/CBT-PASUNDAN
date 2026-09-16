import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { spawn } from "child_process";
import { Readable } from "stream";
import zlib from "zlib";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Khusus Super Administrator." }, { status: 401 });
    }

    // Parse DB connection from DATABASE_URL or defaults
    const dbUrl = process.env.DATABASE_URL || "";
    // Default fallback credentials for MariaDB host
    let host = "172.16.0.211";
    let port = "3306";
    let dbUser = "cbtuser";
    let dbPass = "cbtpassword2026";
    let dbName = "zyacbt_modern";

    try {
      if (dbUrl.includes("://")) {
        const u = new URL(dbUrl);
        host = u.hostname || host;
        port = u.port || port;
        dbUser = decodeURIComponent(u.username) || dbUser;
        dbPass = decodeURIComponent(u.password) || dbPass;
        dbName = u.pathname.replace(/^\//, "").split("?")[0] || dbName;
      }
    } catch {
      // Use defaults
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `BACKUP_CBT_PASUNDAN2_${timestamp}.sql.gz`;

    const dumpArgs = [
      "-h", host,
      "-P", port,
      "-u", dbUser,
      `-p${dbPass}`,
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      dbName,
    ];

    const dumpProc = spawn("mysqldump", dumpArgs, { stdio: ["ignore", "pipe", "pipe"] });
    const gzipStream = zlib.createGzip({ level: 6 });

    dumpProc.stdout.pipe(gzipStream);

    let stderrMsg = "";
    dumpProc.stderr.on("data", (chunk) => {
      stderrMsg += chunk.toString();
    });

    const webStream = new ReadableStream({
      start(controller) {
        gzipStream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        gzipStream.on("end", () => {
          controller.close();
        });
        gzipStream.on("error", (err) => {
          controller.error(err);
        });
        dumpProc.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat cadangan database" }, { status: 500 });
  }
}
