const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, name: true } });
  const subjects = await prisma.subject.findMany();
  const questions = await prisma.question.findMany({ select: { id: true, subjectId: true, createdByUserId: true } });
  const exams = await prisma.exam.findMany({
    include: {
      subject: true,
      createdBy: { select: { username: true } },
      examSessions: { select: { id: true, userId: true, score: true, isFinished: true } },
    },
  });
  const assignments = await prisma.teacherAssignment.findMany({
    include: { user: { select: { username: true } }, subject: true, group: true },
  });

  console.log("--- USERS ---", users);
  console.log("--- SUBJECTS ---", subjects);
  console.log("--- QUESTIONS COUNT ---", questions.length);
  console.log("--- TEACHER ASSIGNMENTS ---", assignments);
  console.log("--- EXAMS ---", JSON.stringify(exams, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
