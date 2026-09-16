
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function run() {
  const u = await p.user.findUnique({ where: { username: '262710001' } });
  if (u) {
    await p.examAnswer.deleteMany({ where: { session: { userId: u.id } } });
    await p.examSession.deleteMany({ where: { userId: u.id } });
    await p.user.update({ where: { id: u.id }, data: { bypassExambro: false } });
    console.log("Cleaned sessions and set bypassExambro = false");
  }
}
run().finally(() => p.$disconnect());
