
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.update({ where: { username: "262710001" }, data: { bypassExambro: true } })
  .then(u => console.log("UPDATED USER:", u.username, "bypassExambro =", u.bypassExambro))
  .finally(() => p.$disconnect());
