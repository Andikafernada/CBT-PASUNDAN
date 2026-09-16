
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const group = await prisma.group.findFirst();
  console.log("Found group:", group ? group.name : "None", "ID:", group ? group.id : 0);

  // Test the API endpoint directly via HTTP POST
  const fetch = globalThis.fetch;
  
  // Login as admin first
  const loginRes = await fetch("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password" })
  });
  
  console.log("Login response status:", loginRes.status);
  const cookies = loginRes.headers.get("set-cookie") || "";
  console.log("Cookie header:", cookies.substring(0, 40) + "...");

  // Generate 5 students
  const genRes = await fetch("http://127.0.0.1:3000/api/admin/students", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Cookie": cookies
    },
    body: JSON.stringify({
      action: "GENERATE_AI_STUDENTS",
      count: 5,
      groupId: group ? group.id : undefined,
      prefix: "SISWA",
      passwordType: "READABLE_WORD",
      useOnlineAI: false
    })
  });

  const genData = await genRes.json();
  console.log("Generate status:", genRes.status);
  console.log("Generate result message:", genData.message);
  console.log("Generated count:", genData.count);
  console.log("Sample student credentials:", JSON.stringify(genData.credentials, null, 2));

  // Verify in MariaDB
  const countInDb = await prisma.user.count({
    where: { role: "STUDENT" }
  });
  console.log("Total students in database now:", countInDb);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
