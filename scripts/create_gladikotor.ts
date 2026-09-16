import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🚀 Creating Official Gladikotor / Simulasi CBT 2026...");

  // 1. Get or create Subject
  let subject = await prisma.subject.findFirst({
    where: { code: "GLADI" },
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: "SIMULASI & GLADIKOTOR CBT",
        code: "GLADI",
        description: "Ujian simulasi kesiapan sistem dan pembiasaan siswa dengan 5 jenis tipe soal CBT",
      },
    });
  }

  // 2. Get Admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (!admin) {
    throw new Error("No admin user found");
  }

  // 3. Clean up existing Gladikotor exam if exists
  const existingExam = await prisma.exam.findFirst({
    where: { code: "GLADI-2026" },
  });
  if (existingExam) {
    console.log("Removing old Gladikotor exam...");
    await prisma.examQuestion.deleteMany({ where: { examId: existingExam.id } });
    await prisma.examGroup.deleteMany({ where: { examId: existingExam.id } });
    await prisma.examSession.deleteMany({ where: { examId: existingExam.id } });
    await prisma.exam.delete({ where: { id: existingExam.id } });
  }

  // 4. Create the Exam
  const exam = await prisma.exam.create({
    data: {
      title: "SIMULASI CBT 2026 - SEMUA KELAS (GLADIKOTOR)",
      code: "GLADI-2026",
      description: "Ujian simulasi kesiapan sistem CBT 2026 untuk menguji pemahaman seluruh 5 jenis soal (PG, PG Kompleks, Menjodohkan, B/S, Esai). Kerjakan dengan jujur.",
      durationMinutes: 30,
      subjectId: subject.id,
      createdByUserId: admin.id,
      isPublished: true,
      token: "SIMULASI",
      isTokenDynamic: false,
      disableAntiCheat: false,
      maxViolations: 3,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResult: true,
    },
  });

  // 5. Connect all student groups
  const allGroups = await prisma.group.findMany();
  console.log(`Assigning exam to ${allGroups.length} student groups...`);
  for (const g of allGroups) {
    await prisma.examGroup.create({
      data: {
        examId: exam.id,
        groupId: g.id,
      },
    }).catch(() => {});
  }

  // 6. Create 10 Representative Questions
  console.log("Creating 10 questions covering all 5 question types...");

  // Q1: PG
  const q1 = await prisma.question.create({
    data: {
      content: "<p>Protokol jaringan yang digunakan untuk mengamankan transmisi data di web melalui enkripsi sertifikat SSL/TLS adalah...</p>",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "HTTP", isCorrect: false, orderIndex: 1 },
          { content: "FTP", isCorrect: false, orderIndex: 2 },
          { content: "HTTPS", isCorrect: true, orderIndex: 3 },
          { content: "Telnet", isCorrect: false, orderIndex: 4 },
          { content: "SMTP", isCorrect: false, orderIndex: 5 },
        ],
      },
    },
  });

  // Q2: PG
  const q2 = await prisma.question.create({
    data: {
      content: "<p>Komponen perangkat keras komputer yang bertindak sebagai memori kerja utama sementara untuk menampung instruksi program yang sedang berjalan adalah...</p>",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "Processor (CPU)", isCorrect: false, orderIndex: 1 },
          { content: "RAM (Random Access Memory)", isCorrect: true, orderIndex: 2 },
          { content: "Power Supply Unit", isCorrect: false, orderIndex: 3 },
          { content: "Monitor Display", isCorrect: false, orderIndex: 4 },
          { content: "Heatsink Cooler", isCorrect: false, orderIndex: 5 },
        ],
      },
    },
  });

  // Q3: PG
  const q3 = await prisma.question.create({
    data: {
      content: "<p>Sikap dan integritas utama yang wajib dijunjung tinggi oleh setiap peserta ujian saat mengerjakan CBT adalah...</p>",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "Jujur, percaya diri, dan mandiri", isCorrect: true, orderIndex: 1 },
          { content: "Membuka tab pencarian browser lain", isCorrect: false, orderIndex: 2 },
          { content: "Memotret layar dan mengirim ke grup obrolan", isCorrect: false, orderIndex: 3 },
          { content: "Mengisi jawaban secara tergesa-gesa tanpa membaca", isCorrect: false, orderIndex: 4 },
        ],
      },
    },
  });

  // Q4: PG
  const q4 = await prisma.question.create({
    data: {
      content: "<p>Dalam sistem bilangan digital heksadesimal, simbol huruf <strong>A</strong> bernilai desimal sama dengan...</p>",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "9", isCorrect: false, orderIndex: 1 },
          { content: "10", isCorrect: true, orderIndex: 2 },
          { content: "11", isCorrect: false, orderIndex: 3 },
          { content: "12", isCorrect: false, orderIndex: 4 },
          { content: "15", isCorrect: false, orderIndex: 5 },
        ],
      },
    },
  });

  // Q5: PG Kompleks
  const q5 = await prisma.question.create({
    data: {
      content: "<p>Manakah tindakan keamanan yang wajib diimplementasikan pada server ujian CBT? <em>(Pilihlah lebih dari satu jawaban yang benar)</em></p>",
      type: "MULTIPLE_CHOICE_COMPLEX",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "Penerapan enkripsi SSL/TLS HTTPS", isCorrect: true, orderIndex: 1 },
          { content: "Menggunakan kata sandi standar default tanpa pernah diubah", isCorrect: false, orderIndex: 2 },
          { content: "Pemberlakuan firewall dan pembatasan akses IP", isCorrect: true, orderIndex: 3 },
          { content: "Pencadangan database berkala (Automated Backup)", isCorrect: true, orderIndex: 4 },
          { content: "Mematikan log aktivitas dan pengawasan server", isCorrect: false, orderIndex: 5 },
        ],
      },
    },
  });

  // Q6: PG Kompleks
  const q6 = await prisma.question.create({
    data: {
      content: "<p>Tindakan manakah yang dikategorikan sebagai pelanggaran sistem ujian dan dapat menyebabkan sesi terkunci? <em>(Pilihlah lebih dari satu)</em></p>",
      type: "MULTIPLE_CHOICE_COMPLEX",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "Berpindah ke tab atau aplikasi lain saat ujian berlangsung", isCorrect: true, orderIndex: 1 },
          { content: "Memotret layar ujian menggunakan kamera ponsel", isCorrect: true, orderIndex: 2 },
          { content: "Menggunakan fitur pengatur ukuran huruf (A-, A, A+) yang disediakan", isCorrect: false, orderIndex: 3 },
          { content: "Membuka menu inspect element developer tools (F12)", isCorrect: true, orderIndex: 4 },
          { content: "Menandai soal yang belum yakin dengan fitur Ragu-Ragu", isCorrect: false, orderIndex: 5 },
        ],
      },
    },
  });

  // Q7: Menjodohkan (Matching)
  const q7 = await prisma.question.create({
    data: {
      content: "<p>Jodohkanlah perangkat keras jaringan berikut dengan fungsi utamanya yang paling tepat!</p>",
      type: "MATCHING",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      matchingPairs: {
        create: [
          { premise: "Router", response: "Menghubungkan segmen jaringan yang berbeda dan merutekan paket data", orderIndex: 1 },
          { premise: "Switch", response: "Menghubungkan banyak komputer dalam satu jaringan lokal (LAN) berbasis MAC address", orderIndex: 2 },
          { premise: "Access Point", response: "Memancarkan dan menerima gelombang radio sinyal nirkabel (Wi-Fi)", orderIndex: 3 },
        ],
      },
    },
  });

  // Q8: Menjodohkan (Matching)
  const q8 = await prisma.question.create({
    data: {
      content: "<p>Jodohkan jenis kategori file berikut dengan format ekstensi file yang sesuai!</p>",
      type: "MATCHING",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      matchingPairs: {
        create: [
          { premise: "Dokumen Teks & Portabel", response: ".docx atau .pdf", orderIndex: 1 },
          { premise: "Berkas Gambar Digital", response: ".jpg atau .png", orderIndex: 2 },
          { premise: "Cadangan Basis Data Terkompresi", response: ".sql.gz atau .tar.gz", orderIndex: 3 },
        ],
      },
    },
  });

  // Q9: Benar / Salah
  const q9 = await prisma.question.create({
    data: {
      content: "<p><strong>Pernyataan:</strong> Pada aplikasi CBT ini, setiap kali Anda memilih jawaban atau mengetik teks esai, jawaban akan langsung tersimpan secara otomatis (autosave) dan tetap aman di perangkat meskipun jaringan sempat offline sejenak.</p>",
      type: "TRUE_FALSE",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      options: {
        create: [
          { content: "BENAR", isCorrect: true, orderIndex: 1 },
          { content: "SALAH", isCorrect: false, orderIndex: 2 },
        ],
      },
    },
  });

  // Q10: Esai (AI Graded)
  const q10 = await prisma.question.create({
    data: {
      content: "<p>Jelaskan mengapa backup data basis data secara berkala dan integritas kejujuran sangat penting dalam pelaksanaan ujian sekolah berbasis komputer (CBT)! Sebutkan minimal dua alasan konkret.</p>",
      type: "ESSAY",
      points: 1.0,
      subject: { connect: { id: subject.id } },
      createdBy: { connect: { id: admin.id } },
      rubric: "Backup berkala penting untuk mencegah hilangnya data jawaban siswa saat terjadi gangguan listrik atau kerusakan perangkat, serta memastikan pemulihan cepat (disaster recovery). Integritas kejujuran penting agar nilai yang diperoleh benar-benar mencerminkan kompetensi asli siswa secara adil dan objektif.",
    },
  });

  const questionIds = [q1.id, q2.id, q3.id, q4.id, q5.id, q6.id, q7.id, q8.id, q9.id, q10.id];

  for (let i = 0; i < questionIds.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam.id,
        questionId: questionIds[i],
        orderIndex: i + 1,
      },
    });
  }

  console.log(`✅ SUCCESS: Gladikotor exam created with ID: ${exam.id}`);
  console.log(`Total Questions Linked: ${questionIds.length}`);
  console.log(`Token: SIMULASI, Status: Published, Duration: 30 mins.`);
}

main()
  .catch((e) => {
    console.error("Error creating gladikotor exam:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
