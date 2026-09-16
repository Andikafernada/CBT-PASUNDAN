import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

/**
 * 🎓 Automated Mass Student Account Provisioner & Importer
 * Usage:
 *   npx tsx scripts/import_students_excel.ts --generate-template
 *   npx tsx scripts/import_students_excel.ts --file /path/to/students.csv
 *   npx tsx scripts/import_students_excel.ts --seed-class-reps (Seeds 1 test rep per 47 classes)
 */
async function main() {
  const args = process.argv.slice(2);
  console.log("=================================================================");
  console.log("🎓 CBT MODERN - MASS STUDENT ACCOUNT IMPORTER & PROVISIONER");
  console.log("=================================================================\\n");

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" }
  });

  const groupMapByCode = new Map(groups.map(g => [g.code.toUpperCase(), g.id]));
  const groupMapByName = new Map(groups.map(g => [g.name.toUpperCase(), g.id]));

  console.log(`Found ${groups.length} active classes/groups in database.`);

  // 1. Generate Template if requested
  if (args.includes("--generate-template") || args.length === 0) {
    const templateDir = path.resolve(__dirname, "../public/templates");
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const templateCsvPath = path.join(templateDir, "TEMPLATE_PESERTA_DAPODIK.csv");
    let csvContent = "NIS,NAMA_LENGKAP,USERNAME,PASSWORD,KELAS_ROMBEL\\n";
    
    // Add sample rows from the first 5 groups
    groups.slice(0, 5).forEach((g, idx) => {
      const nis = `2026${String(idx + 1).padStart(4, "0")}`;
      csvContent += `${nis},Contoh Siswa ${g.name},siswa.${nis},smk2026,${g.code}\\n`;
    });

    fs.writeFileSync(templateCsvPath, csvContent, "utf-8");
    console.log(`📄 Template CSV generated at: ${templateCsvPath}`);
    console.log("Format columns: NIS, NAMA_LENGKAP, USERNAME, PASSWORD, KELAS_ROMBEL\\n");
  }

  // 2. Seed Class Representatives (1 Student per class for all 47 classes) if requested
  if (args.includes("--seed-class-reps")) {
    console.log(`🌱 Generating 1 verified student representative per class for all ${groups.length} classes...`);
    const defaultPasswordHash = bcrypt.hashSync("smk2026", 10);
    let createdCount = 0;

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const pad = String(i + 1).padStart(3, "0");
      const nis = `26${pad}`;
      const username = `siswa.${nis}`;
      const name = `Peserta Uji (${g.name})`;

      await prisma.user.upsert({
        where: { username },
        update: {
          name,
          nis,
          groupId: g.id,
          isActive: true,
          isLoginLocked: false,
          deviceFingerprint: null,
        },
        create: {
          username,
          password: defaultPasswordHash,
          name,
          nis,
          role: "STUDENT",
          groupId: g.id,
          isActive: true,
          isLoginLocked: false,
          deviceFingerprint: null,
        }
      });
      createdCount++;
    }

    console.log(`✅ SUCCESS: Created/Updated ${createdCount} student accounts (1 per class).`);
    console.log("Credentials format: Username: siswa.26001..siswa.26047 | Password: smk2026");
  }

  // 3. Process CSV File if specified
  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = path.resolve(args[fileIndex + 1]);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📥 Reading student records from ${filePath}...`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\\r?\\n/).filter(l => l.trim().length > 0);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.trim());
      if (parts.length < 5) {
        skipped++;
        continue;
      }

      const [nis, name, username, password, groupCode] = parts;
      const targetGroupId = groupMapByCode.get(groupCode.toUpperCase()) || groupMapByName.get(groupCode.toUpperCase());

      if (!targetGroupId) {
        console.warn(`[Warning] Group '${groupCode}' not found for student ${name}. Skipping.`);
        skipped++;
        continue;
      }

      const hashedPassword = password.startsWith("$2") ? password : bcrypt.hashSync(password, 10);

      await prisma.user.upsert({
        where: { username },
        update: {
          name,
          nis,
          groupId: targetGroupId,
          isActive: true,
          isLoginLocked: false,
          deviceFingerprint: null,
        },
        create: {
          username,
          password: hashedPassword,
          name,
          nis,
          role: "STUDENT",
          groupId: targetGroupId,
          isActive: true,
          isLoginLocked: false,
          deviceFingerprint: null,
        }
      });

      imported++;
    }

    console.log(`✅ Import finished: ${imported} students imported, ${skipped} lines skipped.`);
  }

  const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
  console.log(`\\nTotal active student accounts in DB: ${totalStudents}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
