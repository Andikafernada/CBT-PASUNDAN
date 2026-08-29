const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createRootSuperuser() {
  const hashedPassword = await bcrypt.hash("P45und4n2", 10);

  const user = await prisma.user.upsert({
    where: { username: "root" },
    update: {
      password: hashedPassword,
      plainPassword: "P45und4n2",
      role: "ADMIN",
      name: "Super Administrator (Root)",
      isActive: true,
      isLoginLocked: false,
    },
    create: {
      username: "root",
      password: hashedPassword,
      plainPassword: "P45und4n2",
      role: "ADMIN",
      name: "Super Administrator (Root)",
      isActive: true,
      isLoginLocked: false,
    },
  });

  console.log("✅ Superuser root berhasil dibuat/diupdate:", user.username, "Role:", user.role, "ID:", user.id);
}

createRootSuperuser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
