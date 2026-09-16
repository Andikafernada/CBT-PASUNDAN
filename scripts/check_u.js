
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.findUnique({ where: { username: "262710001" }, select: { id: true, username: true, bypassExambro: true, group: true } })
  .then(u => console.log("USER IN DB:", JSON.stringify(u, null, 2)))
  .finally(() => p.$disconnect());
