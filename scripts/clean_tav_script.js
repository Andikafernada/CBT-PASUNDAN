const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fix() {
  const targetGroup = await prisma.group.findUnique({ where: { code: "X-TAV" } });
  const oldGroup = await prisma.group.findFirst({ where: { code: "X TAV" } });
  const contohGroup = await prisma.group.findFirst({ where: { code: "[CONTOH: X TAV]" } });

  if (oldGroup && targetGroup) {
    const moved = await prisma.user.updateMany({
      where: { groupId: oldGroup.id },
      data: { groupId: targetGroup.id }
    });
    console.log(`Moved ${moved.count} users to ${targetGroup.code}`);

    await prisma.group.delete({ where: { id: oldGroup.id } });
    console.log(`Deleted duplicate group ${oldGroup.code}`);
  }

  if (contohGroup) {
    await prisma.group.delete({ where: { id: contohGroup.id } });
    console.log(`Deleted contoh group ${contohGroup.code}`);
  }

  const updatedTav = await prisma.group.findUnique({
    where: { code: "X-TAV" },
    include: { _count: { select: { users: true, examGroups: true } } }
  });
  console.log("Updated X-TAV:", JSON.stringify(updatedTav, null, 2));
}

fix().catch(console.error).finally(() => prisma.$disconnect());
