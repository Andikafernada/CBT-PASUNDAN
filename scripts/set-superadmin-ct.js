const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createOrUpdateSuperadmin() {
  const hashedPassword = await bcrypt.hash("andika1", 10);

  const user = await prisma.user.upsert({
    where: { username: "andika1" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      name: "Super Administrator (Andika)",
      isActive: true,
      isLoginLocked: false,
    },
    create: {
      username: "andika1",
      password: hashedPassword,
      role: "ADMIN",
      name: "Super Administrator (Andika)",
      isActive: true,
      isLoginLocked: false,
    },
  });

  console.log("✅ Superadmin berhasil diupdate/dibuat:", user.username, "Role:", user.role, "ID:", user.id);
}

createOrUpdateSuperadmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
