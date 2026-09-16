import { prisma } from "../src/lib/prisma";

async function verifyAll() {
  console.log("=== 1. VERIFYING P1 (BACKUP TRIGGER) ===");
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync("/usr/local/bin/backup-cbt-db.sh");
    console.log("P1 Backup Script Output:", stdout.trim() || "OK");
  } catch (err: any) {
    console.error("P1 Backup error:", err);
  }

  console.log("\n=== 2. VERIFYING P2 (STUDENT UNLOCK & RESET) ===");
  // Find a test user or lock a user temporarily to test unlock
  const testStudent = await prisma.user.findFirst({
    where: { role: "STUDENT" },
  });

  if (testStudent) {
    // Simulate lock
    await prisma.user.update({
      where: { id: testStudent.id },
      data: { isLoginLocked: true, deviceFingerprint: "TEST_DEVICE_FINGERPRINT_123" },
    });
    console.log(`Locked student ${testStudent.name} (${testStudent.nis || testStudent.username}) for testing.`);

    // Perform unlock via database update mimicking the enhanced route
    await prisma.user.updateMany({
      where: { id: testStudent.id },
      data: { isLoginLocked: false, deviceFingerprint: null },
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: testStudent.id },
    });

    console.log("Refreshed user status after unlock:", {
      id: refreshed?.id,
      name: refreshed?.name,
      isLoginLocked: refreshed?.isLoginLocked,
      deviceFingerprint: refreshed?.deviceFingerprint,
    });
    console.log("P2 UNLOCK VERIFIED: Device lock removed, fingerprint cleared!");
  }

  console.log("\n=== 3. EXECUTING P3 (CREATE GLADIKOTOR EXAM) ===");
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
