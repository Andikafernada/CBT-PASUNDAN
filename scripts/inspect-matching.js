const http = require("http");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspectMatching() {
  console.log("=== INSPECTING MATCHING QUESTIONS IN DATABASE ===");
  const matchingQuestions = await prisma.question.findMany({
    where: { type: "MATCHING" },
    include: { matchingPairs: true, options: true },
  });

  console.log(`Found ${matchingQuestions.length} MATCHING questions in DB:`);
  matchingQuestions.forEach((q, idx) => {
    console.log(`\n[#${idx + 1}] ID: ${q.id}`);
    console.log(`Content: ${q.content}`);
    console.log(`MatchingPairs count: ${q.matchingPairs.length}`);
    console.log("MatchingPairs:", q.matchingPairs);
    console.log(`Options count: ${q.options.length}`);
    console.log("Options:", q.options);
  });
}

inspectMatching().then(() => prisma.$disconnect()).catch(console.error);
