import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses khusus Superuser / Administrator" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const defaultRole = (formData.get("defaultRole") as string) || "STUDENT";

    if (!file) {
      return NextResponse.json({ error: "File Excel atau CSV wajib diunggah" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: "File Excel kosong atau format tidak sesuai" }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Cache existing groups to prevent excessive db queries
    const existingGroups = await prisma.group.findMany();
    const groupMap = new Map<string, string>();
    existingGroups.forEach((g) => groupMap.set(g.code.toUpperCase(), g.id));

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // header is row 1

      // Flexible column headers
      const username = String(row.Username || row.username || row.USERNAME || row["User Name"] || "").trim();
      const rawPassword = String(row.Password || row.password || row.PASSWORD || "123456").trim();
      const name = String(row.Nama || row.name || row.NAMA || row["Nama Lengkap"] || row["Full Name"] || "").trim();
      const rawRole = String(row.Role || row.role || row.ROLE || row["Hak Akses"] || defaultRole).trim().toUpperCase();
      const groupCode = String(
        row["Kelas / Rombel"] ||
          row.Kelas ||
          row.kelas ||
          row.KELAS ||
          row.Rombel ||
          row.rombel ||
          row.Group ||
          row.group ||
          ""
      ).trim();
      const nis = String(row.NIS || row.nis || row.NIP || row.nip || row["No Peserta"] || "").trim();
      const email = String(row.Email || row.email || "").trim();
      const phone = String(row.Telepon || row.phone || row.HP || "").trim();

      if (!username || !name) {
        errors.push(`Baris ${rowNum}: Username dan Nama Lengkap wajib diisi.`);
        continue;
      }

      // Map role to standard enum
      let role = "STUDENT";
      if (rawRole.includes("GURU") || rawRole.includes("TEACHER") || rawRole === "GURU") {
        role = "TEACHER";
      } else if (rawRole.includes("ADMIN") || rawRole === "SUPERUSER") {
        role = "ADMIN";
      } else if (rawRole.includes("OPERATOR") || rawRole.includes("PROKTOR")) {
        role = "OPERATOR";
      }

      // Handle Group / Kelas
      let groupId: string | null = null;
      if (groupCode) {
        const upperCode = groupCode.toUpperCase();
        if (groupMap.has(upperCode)) {
          groupId = groupMap.get(upperCode)!;
        } else {
          // Auto create new group
          const newGroup = await prisma.group.create({
            data: { code: upperCode, name: groupCode },
          });
          groupMap.set(upperCode, newGroup.id);
          groupId = newGroup.id;
        }
      }

      // Use provided password or generate secure 6-char alphanumeric password
      const actualPassword = rawPassword && rawPassword.trim() !== "" 
        ? rawPassword.trim() 
        : Math.random().toString(36).substring(2, 8).toUpperCase();

      const hashedPassword = await hashPassword(actualPassword);

      // Upsert User
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            role,
            password: hashedPassword, // Always update with the imported/designated password
            plainPassword: actualPassword,
            nis: nis || existingUser.nis,
            email: email || existingUser.email,
            phone: phone || existingUser.phone,
            groupId: groupId || existingUser.groupId,
          },
        });
        updatedCount++;
      } else {
        await prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            plainPassword: actualPassword,
            name,
            role,
            nis: nis || null,
            email: email || null,
            phone: phone || null,
            groupId,
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: rawData.length,
      createdCount,
      updatedCount,
      errors,
    });
  } catch (error: any) {
    console.error("Bulk Import User Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
