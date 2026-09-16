
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 MEMBUAT UJIAN DNS SERVER & AKUN SISWA PENGUJI...');

  // 1. Buat / Ambil Subject 'Administrasi Jarak Jauh & DNS Server'
  let subject = await prisma.subject.findFirst({
    where: { code: 'DNS-101' }
  });

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: 'Administrasi Server & DNS',
        code: 'DNS-101',
        description: 'Mata pelajaran Administrasi Sistem Jaringan - Konfigurasi & Troubleshooting DNS Server'
      }
    });
  }

  // 2. Buat / Ambil Rombel / Group 'Kelas 12 TKJ'
  let group = await prisma.group.findFirst({ where: { code: '12-TKJ-1' } });
  if (!group) {
    group = await prisma.group.create({
      data: { name: '12 TKJ 1', code: '12-TKJ-1' }
    });
  }

  // 3. Buat / Reset Akun Siswa Penguji 'siswadns' / password '123456'
  const hashedPassword = await bcrypt.hash('123456', 10);
  let student = await prisma.user.upsert({
    where: { username: 'siswadns' },
    update: {
      password: hashedPassword,
      groupId: group.id,
      isActive: true,
      isLoginLocked: false,
      deviceFingerprint: null
    },
    create: {
      username: 'siswadns',
      password: hashedPassword,
      name: 'Siswa Penguji DNS',
      role: 'STUDENT',
      nis: '2026001',
      groupId: group.id,
      isActive: true
    }
  });

  console.log('✅ [1/3] Akun Siswa Penguji Berhasil Disiapkan:');
  console.log('    Username :', student.username);
  console.log('    Password :', '123456');
  console.log('    Nama     :', student.name);

  // 4. Buat 10 Butir Soal DNS (PG, MC, MR, ESSAY)
  const questionData = [
    // 1. PG
    {
      type: 'MULTIPLE_CHOICE',
      content: 'Apakah fungsi utama dari Domain Name System (DNS) dalam jaringan komputer?',
      points: 10.0,
      options: {
        create: [
          { content: 'Menerjemahkan alamat IP menjadi MAC address fisik perangkat', isCorrect: false, orderIndex: 0 },
          { content: 'Menerjemahkan nama domain (FQDN) menjadi alamat IP dan sebaliknya', isCorrect: true, orderIndex: 1 },
          { content: 'Mengalokasikan alamat IP secara otomatis ke host klien', isCorrect: false, orderIndex: 2 },
          { content: 'Memblokir lalu lintas data yang berpotensi mencederai jaringan', isCorrect: false, orderIndex: 3 },
        ]
      }
    },
    // 2. PG
    {
      type: 'MULTIPLE_CHOICE',
      content: 'Port standar yang digunakan oleh protokol DNS untuk komunikasi data client-server adalah...',
      points: 10.0,
      options: {
        create: [
          { content: 'Port 21 (FTP)', isCorrect: false, orderIndex: 0 },
          { content: 'Port 22 (SSH)', isCorrect: false, orderIndex: 1 },
          { content: 'Port 53 (DNS UDP/TCP)', isCorrect: true, orderIndex: 2 },
          { content: 'Port 80 (HTTP)', isCorrect: false, orderIndex: 3 },
        ]
      }
    },
    // 3. PG
    {
      type: 'MULTIPLE_CHOICE',
      content: 'Tipe DNS Record yang digunakan untuk mengarahkan nama domain utama ke alamat IPv4 adalah...',
      points: 10.0,
      options: {
        create: [
          { content: 'A Record', isCorrect: true, orderIndex: 0 },
          { content: 'AAAA Record', isCorrect: false, orderIndex: 1 },
          { content: 'MX Record', isCorrect: false, orderIndex: 2 },
          { content: 'CNAME Record', isCorrect: false, orderIndex: 3 },
        ]
      }
    },
    // 4. PG
    {
      type: 'MULTIPLE_CHOICE',
      content: 'Perintah utilitas CLI pada Linux Debian/Ubuntu yang digunakan untuk pengujian resolusi nama DNS secara detail adalah...',
      points: 10.0,
      options: {
        create: [
          { content: 'ipconfig /all', isCorrect: false, orderIndex: 0 },
          { content: 'dig atau nslookup', isCorrect: true, orderIndex: 1 },
          { content: 'netstat -tulpn', isCorrect: false, orderIndex: 2 },
          { content: 'traceroute -n', isCorrect: false, orderIndex: 3 },
        ]
      }
    },
    // 5. MC (Multi Select)
    {
      type: 'COMPLEX_MULTIPLE_CHOICE',
      content: 'Pilihlah kombinasi Tipe DNS Record beserta fungsinya yang BENAR di bawah ini! (Pilih semua jawaban yang benar)',
      points: 10.0,
      options: {
        create: [
          { content: 'A Record -> Memetakan nama domain (FQDN) ke alamat IPv4', isCorrect: true, orderIndex: 0 },
          { content: 'MX Record -> Mengarahkan server penanganan email (Mail Server)', isCorrect: true, orderIndex: 1 },
          { content: 'PTR Record -> Pemetaan Reverse DNS (Mengubah IP menjadi Domain)', isCorrect: true, orderIndex: 2 },
          { content: 'DHCP Record -> Mengalokasikan IP secara dinamis', isCorrect: false, orderIndex: 3 },
        ]
      }
    },
    // 6. MC (Multi Select)
    {
      type: 'COMPLEX_MULTIPLE_CHOICE',
      content: 'Aplikasi DNS Server yang umum digunakan di lingkungan sistem operasi Linux Debian/Ubuntu adalah... (Pilih semua yang benar)',
      points: 10.0,
      options: {
        create: [
          { content: 'BIND9 (Berkeley Internet Name Domain)', isCorrect: true, orderIndex: 0 },
          { content: 'dnsmasq', isCorrect: true, orderIndex: 1 },
          { content: 'Apache2 Web Server', isCorrect: false, orderIndex: 2 },
          { content: 'Unbound DNS Resolver', isCorrect: true, orderIndex: 3 },
        ]
      }
    },
    // 7. MR (Matching)
    {
      type: 'MATCHING',
      content: 'Jodohkan Tipe DNS Record berikut dengan deskripsi fungsinya yang tepat!',
      points: 10.0,
      matchingPairs: {
        create: [
          { premise: 'A Record', response: 'Pemetaan nama domain ke IPv4', orderIndex: 0 },
          { premise: 'AAAA Record', response: 'Pemetaan nama domain ke IPv6', orderIndex: 1 },
          { premise: 'CNAME Record', response: 'Alias nama domain alternatif', orderIndex: 2 },
          { premise: 'PTR Record', response: 'Reverse DNS dari IP ke Domain', orderIndex: 3 },
        ]
      }
    },
    // 8. MR (Matching)
    {
      type: 'MATCHING',
      content: 'Jodohkan file konfigurasi BIND9 pada Debian berikut dengan fungsi utamanya!',
      points: 10.0,
      matchingPairs: {
        create: [
          { premise: 'named.conf.options', response: 'Konfigurasi forwarders dan port IP', orderIndex: 0 },
          { premise: 'named.conf.local', response: 'Pendaftaran nama Zone Forward & Reverse', orderIndex: 1 },
          { premise: 'db.local / db.domain', response: 'File database entitas record DNS', orderIndex: 2 },
          { premise: 'resolv.conf', response: 'File penunjuk IP DNS Resolver di client/server', orderIndex: 3 },
        ]
      }
    },
    // 9. ESSAY (AI Auto-Grader)
    {
      type: 'ESSAY',
      content: 'Jelaskan perbedaan mendasar antara Forward Zone dan Reverse Zone pada konfigurasi BIND9 DNS Server!',
      rubric: 'Forward zone digunakan untuk menerjemahkan nama domain FQDN menjadi alamat IP. Sedangkan Reverse zone digunakan untuk menerjemahkan alamat IP kembali menjadi nama domain FQDN menggunakan file zona in-addr.arpa.',
      points: 10.0
    },
    // 10. ESSAY (AI Auto-Grader)
    {
      type: 'ESSAY',
      content: 'Jelaskan langkah-langkah singkat melakukan pengujian DNS Server di Linux menggunakan perintah `nslookup` atau `dig` serta indikator bahwa DNS telah berfungsi dengan baik!',
      rubric: 'Menggunakan perintah nslookup nama-domain atau dig nama-domain. Indikator berhasil ditandai dengan munculnya balasan jawaban IP address server DNS yang sesuai tanpa error atau status NOERROR.',
      points: 10.0
    }
  ];

  const createdQuestions = [];
  for (const q of questionData) {
    const createdQ = await prisma.question.create({
      data: {
        subjectId: subject.id,
        ...q
      }
    });
    createdQuestions.push(createdQ);
  }

  console.log('✅ [2/3] 10 Butir Soal DNS (PG, MC, MR, ESSAY) Berhasil Dibuat!');

  // 5. Buat Ujian (Exam) 'Ujian Asesmen DNS Server Modern'
  const exam = await prisma.exam.create({
    data: {
      title: 'Ujian Asesmen DNS Server Modern (10 Soal)',
      code: 'DNS-EXAM-' + Date.now().toString().slice(-4),
      subjectId: subject.id,
      durationMinutes: 60,
      token: 'DNS2026',
      isPublished: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResult: true,
      showAnswerKey: true,
      maxViolations: 5,
      examGroups: {
        create: [{ groupId: group.id }]
      },
      examQuestions: {
        create: createdQuestions.map((q, idx) => ({
          questionId: q.id,
          orderIndex: idx,
          score: 10.0
        }))
      }
    }
  });

  console.log('\n==================================================');
  console.log('🎉 UJIAN DNS SERVER SIAP DIUJI COBA!');
  console.log('==================================================');
  console.log('🌐 URL Akses Aplikasi : http://172.16.0.210/login');
  console.log('👤 Username Siswa    : siswadns');
  console.log('🔑 Password Siswa    : 123456');
  console.log('📋 Judul Ujian       :', exam.title);
  console.log('🔑 Token Ujian       :', exam.token);
  console.log('📝 Jumlah Soal       : 10 Soal (4 PG, 2 MC, 2 MR, 2 ESSAY)');
  console.log('==================================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
