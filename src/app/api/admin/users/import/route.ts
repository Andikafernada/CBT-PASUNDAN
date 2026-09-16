import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

// Helper: check if a text is just instructions or placeholder
function isPlaceholderOrInstruction(val: string): boolean {
  if (!val) return true;
  const s = val.trim().toLowerCase();
  if (s.startsWith("[") && s.endsWith("]")) return true;
  if (s.includes("wajib") || s.includes("contoh") || s.includes("auto nis") || s.includes("auto 6")) return true;
  if (s.includes("nama lengkap") || s.includes("kosongkan") || s.includes("nama keahlian")) return true;
  return false;
}

// Generate secure 6-character alphanumeric password
function generateSecure6CharPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const defaultRole = (formData.get("defaultRole") as string) || "STUDENT";

    if (!file) {
      return NextResponse.json({ error: "File Excel (.xlsx) tidak ditemukan" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: "File Excel kosong atau tidak memiliki sheet" }, { status: 400 });
    }

    // ⚡ 1. PRE-FETCH GROUPS INTO MEMORY CACHE
    const existingGroups = await prisma.group.findMany();
    const groupMap = new Map<string, string>(); // code -> id
    existingGroups.forEach((g) => {
      groupMap.set(g.code.toUpperCase(), g.id);
      groupMap.set(g.name.toUpperCase(), g.id);
    });

    // ⚡ 2. PRE-FETCH EXISTING USERS TO COUNT CREATED VS UPDATED
    const existingUsers = await prisma.user.findMany({ select: { username: true } });
    const existingUserMap = new Map<string, string>();
    existingUsers.forEach((u) => existingUserMap.set(u.username, "exists"));

    let createdCount = 0;
    let updatedCount = 0;
    const sheetsProcessed: { name: string; count: number }[] = [];
    const passwords: any[] = [];

    interface Candidate {
      username: string;
      name: string;
      password: string;
      nis: string;
      groupCode: string;
      role: string;
      sheetName: string;
      ruang: string;
      sesi: string;
      bypassExambro: boolean;
    }

    const candidateMap = new Map<string, Candidate>();

    // Process all sheets in the workbook (e.g. X, XI, XII or single sheet)
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet || !worksheet["!ref"]) continue;

      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (!rawRows || rawRows.length < 2) continue;

      // Detect header row
      let headerRowIdx = -1;
      let colIndices: Record<string, number> = {};

      for (let r = 0; r < Math.min(6, rawRows.length); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;
        const lowerRow = row.map((cell) => String(cell || "").trim().toLowerCase());
        const hasName = lowerRow.some((c) => c.includes("nama") || c.includes("peserta") || c === "name");

        if (hasName) {
          headerRowIdx = r;
          lowerRow.forEach((colName, cIdx) => {
            if (colName.includes("user") || colName.includes("pengguna")) {
              colIndices["username"] = cIdx;
            } else if (colName.includes("no peserta") || colName.includes("no. peserta") || colName.includes("nomor peserta")) {
              colIndices["no_peserta"] = cIdx;
            } else if (colName === "nis" || colName === "nisn" || colName.includes("no induk") || colName.includes("nomor induk") || colName.includes("nip")) {
              colIndices["nis"] = cIdx;
            } else if (colName.includes("nama") || colName === "name") {
              colIndices["name"] = cIdx;
            } else if (colName.includes("kelas") || colName.includes("rombel") || colName.includes("group") || colName.includes("tingkat")) {
              colIndices["kelas"] = cIdx;
            } else if (colName.includes("pasword") || colName.includes("password") || colName.includes("sandi") || colName.includes("pin")) {
              colIndices["password"] = cIdx;
            } else if (colName.includes("role") || colName.includes("hak akses")) {
              colIndices["role"] = cIdx;
            } else if (colName.includes("ruang") || colName.includes("lab") || colName.includes("room")) {
              colIndices["ruang"] = cIdx;
            } else if (colName.includes("sesi") || colName.includes("session")) {
              colIndices["sesi"] = cIdx;
            }
          });
          break;
        }
      }

      if (headerRowIdx === -1) headerRowIdx = 0;
      if (colIndices["name"] === undefined) colIndices["name"] = 2;
      if (colIndices["nis"] === undefined) colIndices["nis"] = 1;
      if (colIndices["no_peserta"] === undefined) colIndices["no_peserta"] = 1;
      if (colIndices["kelas"] === undefined) colIndices["kelas"] = 4;
      if (colIndices["username"] === undefined) colIndices["username"] = 7;
      if (colIndices["password"] === undefined) colIndices["password"] = 8;

      let sheetCount = 0;

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || !Array.isArray(row)) continue;

        const name = String(row[colIndices["name"]] || "").trim();
        const nis = String(row[colIndices["nis"]] || "").trim().replace(/\.0$/, "");
        const noPeserta = String(row[colIndices["no_peserta"]] || "").trim().replace(/\.0$/, "");
        const groupCode = String(row[colIndices["kelas"]] || "").trim();
        let rawUsername = String(row[colIndices["username"]] || "").trim().replace(/\.0$/, "");
        let rawPassword = String(row[colIndices["password"]] || "").trim();
        const rawRole = String((colIndices["role"] !== undefined ? row[colIndices["role"]] : "") || defaultRole).trim().toUpperCase();
        const ruangVal = String((colIndices["ruang"] !== undefined ? row[colIndices["ruang"]] : "") || "").trim();
        const sesiVal = String((colIndices["sesi"] !== undefined ? row[colIndices["sesi"]] : "") || "").trim();

        // 🛡️ Filter Out Placeholder/Instruction rows (e.g. "[Nama Lengkap Siswa]", "[Wajib 9-10 Digit]")
        if (
          !name ||
          name.length < 2 ||
          isPlaceholderOrInstruction(name) ||
          isPlaceholderOrInstruction(nis) ||
          isPlaceholderOrInstruction(rawUsername)
        ) {
          continue;
        }

        // 1. Determine Username: use existing or NIS, fallback to NO PESERTA
        const username = rawUsername && rawUsername.toLowerCase() !== "none" && !isPlaceholderOrInstruction(rawUsername)
          ? rawUsername
          : nis && nis.toLowerCase() !== "none" && !isPlaceholderOrInstruction(nis)
          ? nis
          : noPeserta && noPeserta.toLowerCase() !== "none" && !isPlaceholderOrInstruction(noPeserta)
          ? noPeserta
          : `siswa_${sheetName.toLowerCase().replace(/\s+/g, '_')}_${r + 1}`;

        // 2. Determine Password: use existing or generate unique 6-char alphanumeric
        const actualPassword = rawPassword && rawPassword.toLowerCase() !== "none" && !isPlaceholderOrInstruction(rawPassword) && rawPassword.length >= 4
          ? rawPassword
          : generateSecure6CharPassword();

        // 3. Write back into worksheet cell
        const userColLetter = XLSX.utils.encode_col(colIndices["username"]);
        const passColLetter = XLSX.utils.encode_col(colIndices["password"]);
        worksheet[`${userColLetter}${r + 1}`] = { t: "s", v: username };
        worksheet[`${passColLetter}${r + 1}`] = { t: "s", v: actualPassword };

        // Expand worksheet range if new columns were written
        try {
          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
          if (colIndices["username"] > range.e.c) range.e.c = colIndices["username"];
          if (colIndices["password"] > range.e.c) range.e.c = colIndices["password"];
          if (r > range.e.r) range.e.r = r;
          worksheet["!ref"] = XLSX.utils.encode_range(range);
        } catch {
          // Ignore range encoding error
        }

        // 🛡️ 4. Segmentasi Jalur (Reguler vs PKL vs Susulan)
        const isPklStudent = /pkl|dudi|magang/i.test(ruangVal) ||
                             /pkl|dudi|magang/i.test(groupCode) ||
                             /pkl|dudi|magang/i.test(sheetName);

        const isSusulanStudent = /susulan/i.test(ruangVal) ||
                                 /susulan/i.test(groupCode) ||
                                 /susulan/i.test(sheetName) ||
                                 /hp|smartphone/i.test(ruangVal);

        const shouldBypassExambro = isPklStudent || isSusulanStudent;

        // 5. Ensure group in cache & DB
        if (groupCode && groupCode.toLowerCase() !== "none" && !isPlaceholderOrInstruction(groupCode)) {
          const upperCode = groupCode.toUpperCase();
          const isGroupPkl = /pkl|dudi|magang/i.test(upperCode) || /pkl|dudi|magang/i.test(sheetName);

          if (!groupMap.has(upperCode)) {
            const newGroup = await prisma.group.upsert({
              where: { code: upperCode },
              update: {
                name: groupCode,
                ...(isGroupPkl ? { isPkl: true, bypassExambro: true } : {}),
              },
              create: {
                code: upperCode,
                name: groupCode,
                description: `Kelas ${groupCode}`,
                isPkl: isGroupPkl,
                bypassExambro: isGroupPkl,
              },
            });
            groupMap.set(upperCode, newGroup.id);
            groupMap.set(groupCode.toUpperCase(), newGroup.id);
          }
        }

        let role = "STUDENT";
        if (rawRole.includes("GURU") || rawRole.includes("TEACHER")) role = "TEACHER";
        else if (rawRole.includes("ADMIN") || rawRole === "SUPERUSER") role = "ADMIN";
        else if (rawRole.includes("OPERATOR") || rawRole.includes("PROKTOR")) role = "OPERATOR";

        // 🛡️ Deduplicate by username in-memory: later occurrences safely update earlier ones
        candidateMap.set(username, {
          username,
          name,
          password: actualPassword,
          nis,
          groupCode,
          role,
          sheetName,
          ruang: ruangVal,
          sesi: sesiVal,
          bypassExambro: shouldBypassExambro,
        });

        passwords.push({
          username,
          name,
          password: actualPassword,
          group: groupCode,
          sheet: sheetName,
          ruang: ruangVal,
          sesi: sesiVal,
          jalur: isPklStudent ? "PKL (HP)" : isSusulanStudent ? "Susulan (HP)" : "Reguler (Lab)",
        });

        sheetCount++;
      }

      if (sheetCount > 0) {
        sheetsProcessed.push({ name: sheetName, count: sheetCount });
      }
    }

    const allCandidates = Array.from(candidateMap.values());

    if (allCandidates.length === 0) {
      return NextResponse.json({
        error: "Tidak ada baris data siswa yang valid untuk diimport. Pastikan baris data bukan hanya contoh petunjuk.",
      }, { status: 400 });
    }

    // ⚡ 6. HIGH-SPEED BATCH UPSERT: Process in chunks of 50 with atomic upsert
    const BATCH_SIZE = 50;
    for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
      const batch = allCandidates.slice(i, i + BATCH_SIZE);

      // Parallel hash with cost factor 8 (secure & 10x faster)
      const hashedBatch = await Promise.all(
        batch.map(async (c) => ({
          ...c,
          hash: await bcrypt.hash(c.password, 8),
        }))
      );

      const operations = hashedBatch.map((c) => {
        const groupId = (c.groupCode && groupMap.get(c.groupCode.toUpperCase())) || null;
        const isExisting = existingUserMap.has(c.username);

        if (isExisting) {
          updatedCount++;
        } else {
          createdCount++;
          existingUserMap.set(c.username, "new");
        }

        // 🛡️ Atomic Upsert: Never fails on Unique Constraint!
        return prisma.user.upsert({
          where: { username: c.username },
          update: {
            name: c.name,
            password: c.hash,
            role: c.role,
            nis: c.nis || null,
            groupId,
            isActive: true,
            isLoginLocked: false,
            deviceFingerprint: null,
            bypassExambro: c.bypassExambro,
          },
          create: {
            username: c.username,
            name: c.name,
            password: c.hash,
            role: c.role,
            nis: c.nis || null,
            groupId,
            isActive: true,
            isLoginLocked: false,
            deviceFingerprint: null,
            bypassExambro: c.bypassExambro,
          },
        });
      });

      await prisma.$transaction(operations);
    }

    // ⚡ 7. Generate updated Excel workbook with USERNAMA and PASWORD populated in all sheets
    let updatedWorkbookBase64 = "";
    try {
      updatedWorkbookBase64 = XLSX.write(workbook, {
        type: "base64",
        bookType: "xlsx",
      });
    } catch (e: any) {
      console.warn("Could not generate filled workbook base64:", e.message);
    }

    return NextResponse.json({
      success: true,
      totalRows: allCandidates.length,
      createdCount,
      updatedCount,
      sheetsProcessed,
      passwordsCount: passwords.length,
      samplePreview: passwords.slice(0, 20),
      fileBase64: updatedWorkbookBase64,
      downloadFileName: "DAFTAR_PESERTA_DENGAN_AKUN_CBT.xlsx",
    });
  } catch (error: any) {
    console.error("Bulk Import User Error:", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan saat memproses file" }, { status: 500 });
  }
}
