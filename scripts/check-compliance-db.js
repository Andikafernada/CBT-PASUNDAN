const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      group: true,
      examSessions: {
        include: {
          exam: { include: { subject: true } },
          violationLogs: true,
          reflection: true
        }
      }
    }
  });

  console.log('TOTAL_STUDENTS_IN_DB:', students.length);
  students.slice(0, 5).forEach((s, idx) => {
    console.log(`\n[${idx + 1}] Siswa: ${s.name} | NIS: ${s.username} | Kelas: ${s.group?.name || 'Reguler'}`);
    console.log(`    Total Ujian/Sesi: ${s.examSessions.length}`);
    s.examSessions.forEach((es) => {
      console.log(`    -> Mapel: ${es.exam?.subject?.name || es.exam?.title} | Status: ${es.status} | Skor: ${es.score}`);
      console.log(`       Pelanggaran: ${es.violationCount}x | Log Detail: ${es.violationLogs.length} kejadian`);
      if (es.reflection) {
        console.log(`       Refleksi: Fisik=${es.reflection.physicalState}, Kesiapan=${es.reflection.readinessRate}⭐`);
      }
    });
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
