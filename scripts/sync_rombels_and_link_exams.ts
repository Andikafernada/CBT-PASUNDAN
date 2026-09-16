import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { deleteCachePattern } from "../src/lib/redis";

const EXCEL_FILE = "/var/www/cbt-modern/DAFTAR_PESERTA_STS_GASAL.xlsx";

async function main() {
  console.log("================================================================");
  console.log("   SINKRONISASI ROMBEL, 483 SISWA KELAS X, & EXAM GROUP MAPPING ");
  console.log("================================================================\n");

  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets["X"];
  if (!sheet) {
    throw new Error("Sheet 'X' tidak ditemukan dalam file Excel!");
  }

  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total baris dalam Sheet X: ${rawRows.length}`);

  // 1. Identifikasi & Buat Seluruh Rombel Kelas X
  const uniqueRombels = new Set<string>();
  const studentsData: any[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || !r[0] || r[0] === "No.") continue;

    const noPeserta = String(r[1] || "").trim();
    const nis = String(r[2] || "").trim();
    const name = String(r[3] || "").trim();
    const gender = String(r[4] || "").trim();
    const rombelName = String(r[5] || "").trim().toUpperCase();
    const username = String(r[8] || nis).trim();
    const password = String(r[9] || "smk2026").trim();
    const jurusan = String(r[10] || "").trim();

    if (rombelName && username) {
      uniqueRombels.add(rombelName);
      studentsData.push({
        noPeserta,
        nis,
        name,
        gender,
        rombelName,
        username,
        password,
        jurusan,
      });
    }
  }

  console.log(`Ditemukan ${uniqueRombels.size} Rombel unik di Kelas X:`);
  console.log(Array.from(uniqueRombels).sort().join(", "));
  console.log(`Total data siswa valid: ${studentsData.length}\n`);

  // Map RombelName -> Group Record
  const groupMap = new Map<string, any>();

  for (const rombel of Array.from(uniqueRombels).sort()) {
    const code = rombel.replace(/\s+/g, "-");
    let group = await prisma.group.findUnique({
      where: { code },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          code,
          name: rombel,
          description: `Rombel Kelas ${rombel}`,
          isPkl: false,
          bypassExambro: false,
        },
      });
      console.log(`+ Dibuat Rombel: ${group.name} (${group.code})`);
    } else {
      console.log(`✓ Rombel ada: ${group.name} (${group.code})`);
    }

    groupMap.set(rombel, group);
  }

  console.log("\nMemproses impor akun siswa (dengan enkripsi bcrypt)...");
  let importedStudents = 0;
  let updatedStudents = 0;

  for (const s of studentsData) {
    const group = groupMap.get(s.rombelName);
    const hashedPassword = await bcrypt.hash(s.password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { username: s.username },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          username: s.username,
          password: hashedPassword,
          name: s.name,
          nis: s.nis,
          role: "STUDENT",
          groupId: group ? group.id : null,
          isActive: true,
          bypassExambro: false,
        },
      });
      importedStudents++;
    } else {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: s.name,
          nis: s.nis,
          groupId: group ? group.id : existingUser.groupId,
          role: "STUDENT",
          isActive: true,
        },
      });
      updatedStudents++;
    }
  }

  console.log(`✓ Selesai impor siswa: ${importedStudents} dibuat baru, ${updatedStudents} diperbarui.`);

  // 2. Petakan Ujian ke Rombel (ExamGroup Mapping)
  console.log("\n================================================================");
  console.log("   MENAUTKAN HAK AKSES EXAMGROUP & MENGAKTIFKAN KIOSK BROWSER   ");
  console.log("================================================================\n");

  const allGroups = Array.from(groupMap.values());
  const getGroups = (...names: string[]) => {
    return allGroups.filter((g) => names.includes(g.name));
  };

  const TE_TJKT_GROUPS = getGroups("X TAV", "X TKJA", "X TKJB", "X TKJC", "X TKJD");
  const TM_TO_GROUPS = getGroups("X TPMA", "X TPMB", "X TKRA", "X TKRB", "X TSMA", "X TSMB", "X TSMC", "X TSMD", "X TSME");

  const DDK_TE_GROUPS = getGroups("X TAV");
  const DDK_TJKT_GROUPS = getGroups("X TKJA", "X TKJB", "X TKJC", "X TKJD");
  const DDK_TKR_GROUPS = getGroups("X TKRA", "X TKRB");
  const DDK_TM_GROUPS = getGroups("X TPMA", "X TPMB");
  const DDK_TSM_GROUPS = getGroups("X TSMA", "X TSMB", "X TSMC", "X TSMD", "X TSME");

  const EXAM_MAPPINGS: { examCode: string; targetGroups: any[] }[] = [
    // 9 Mapel Umum -> Seluruh 14 Rombel
    { examCode: "STS26-X-BINDO", targetGroups: allGroups },
    { examCode: "STS26-X-BSUNDA", targetGroups: allGroups },
    { examCode: "STS26-X-INF", targetGroups: allGroups },
    { examCode: "STS26-X-IPAS", targetGroups: allGroups },
    { examCode: "STS26-X-PABP", targetGroups: allGroups },
    { examCode: "STS26-X-PJOK", targetGroups: allGroups },
    { examCode: "STS26-X-PANCASILA", targetGroups: allGroups },
    { examCode: "STS26-X-SEJ", targetGroups: allGroups },
    { examCode: "STS26-X-MUSIK", targetGroups: allGroups },

    // 4 Mapel Klaster
    { examCode: "STS26-X-BING-TE-TJKT", targetGroups: TE_TJKT_GROUPS },
    { examCode: "STS26-X-MTK-TE-TJKT", targetGroups: TE_TJKT_GROUPS },
    { examCode: "STS26-X-BING-TM-TO", targetGroups: TM_TO_GROUPS },
    { examCode: "STS26-X-MTK-TM-TO", targetGroups: TM_TO_GROUPS },

    // 5 Mapel Kejuruan Spesifik DDK
    { examCode: "STS26-X-DDK-TE", targetGroups: DDK_TE_GROUPS },
    { examCode: "STS26-X-DDK-TJKT", targetGroups: DDK_TJKT_GROUPS },
    { examCode: "STS26-X-DDK-TKR", targetGroups: DDK_TKR_GROUPS },
    { examCode: "STS26-X-DDK-TM", targetGroups: DDK_TM_GROUPS },
    { examCode: "STS26-X-DDK-TSM", targetGroups: DDK_TSM_GROUPS },
  ];

  let totalLinksCreated = 0;

  for (const m of EXAM_MAPPINGS) {
    const exam = await prisma.exam.findUnique({
      where: { code: m.examCode },
    });

    if (!exam) {
      console.log(`[!] Ujian ${m.examCode} tidak ditemukan, lewati.`);
      continue;
    }

    // Aktifkan requireKioskBrowser pada ujian
    await prisma.exam.update({
      where: { id: exam.id },
      data: {
        requireKioskBrowser: true,
        kioskUserAgentPattern: "Exambro|SafeExamBrowser",
        isPublished: true,
      },
    });

    // Reset old examGroups for clean mapping
    await prisma.examGroup.deleteMany({
      where: { examId: exam.id },
    });

    // Create new examGroups
    for (const g of m.targetGroups) {
      await prisma.examGroup.create({
        data: {
          examId: exam.id,
          groupId: g.id,
        },
      });
      totalLinksCreated++;
    }

    console.log(`✓ ${m.examCode.padEnd(22)} -> Ditautkan ke ${m.targetGroups.length} Rombel [Wajib Kiosk: TRUE]`);
  }

  console.log(`\nTotal penautan ExamGroup dibuat: ${totalLinksCreated} relasi.`);

  // Invalidate Redis Cache
  await deleteCachePattern("cbt:exam:*:bundle").catch(() => {});
  console.log("✓ Redis Cache cleared.");

  console.log("\n================================================================");
  console.log("   SINKRONISASI SUKSES 100%! DATA SIAP UNTUK CBT LIVE           ");
  console.log("================================================================");
}

main()
  .catch((e) => {
    console.error("FATAL ERROR during sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
