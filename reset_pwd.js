
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('siswa123', 10);
  await p.user.update({
    where: { username: '262710001' },
    data: { password: hash, bypassExambro: false }
  });
  console.log("Password for 262710001 set to siswa123, bypassExambro = false");
}
main().finally(() => p.$disconnect());
