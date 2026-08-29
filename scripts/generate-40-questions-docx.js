const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC32 table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function createZipBuffer(files) {
  const fileEntries = [];
  const centralDirectoryEntries = [];
  let offset = 0;

  for (const file of files) {
    const fileData = Buffer.from(file.content, "utf8");
    const nameBuffer = Buffer.from(file.name, "utf8");
    const compressed = zlib.deflateRawSync(fileData);

    let crc = 0 ^ -1;
    for (let i = 0; i < fileData.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ fileData[i]) & 0xff];
    }
    crc = (crc ^ -1) >>> 0;

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(fileData.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    const localEntry = Buffer.concat([localHeader, compressed]);
    fileEntries.push(localEntry);

    const cdHeader = Buffer.alloc(46 + nameBuffer.length);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(8, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressed.length, 20);
    cdHeader.writeUInt32LE(fileData.length, 24);
    cdHeader.writeUInt16LE(nameBuffer.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(cdHeader, 46);

    centralDirectoryEntries.push(cdHeader);
    offset += localEntry.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectoryEntries);
  const cdOffset = offset;
  const cdSize = centralDirBuffer.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileEntries, centralDirBuffer, eocd]);
}

const rawSoalText = `
1. Perintah pada Debian 12 yang digunakan untuk memperbarui basis data katalog repositori lokal dari cermin resmi adalah...
A. apt upgrade
B. apt update
C. apt install -f
D. apt autoremove
E. apt dist-upgrade
KUNCI: B

2. Berkas konfigurasi utama untuk mengatur alamat IP statis pada antarmuka jaringan konvensional di Debian 12 terletak pada direktori...
A. /etc/hosts
B. /etc/resolv.conf
C. /etc/network/interfaces
D. /etc/netplan/01-netcfg.yaml
E. /etc/sysconfig/network-scripts
KUNCI: C

3. Perintah systemd yang tepat untuk mengaktifkan sebuah layanan agar otomatis berjalan saat sistem operasi booting pertama kali adalah...
A. systemctl start <service>
B. systemctl restart <service>
C. systemctl status <service>
D. systemctl enable <service>
E. systemctl reload <service>
KUNCI: D

4. Berkas konfigurasi pada sistem Linux yang berfungsi untuk mendaftarkan alamat IP DNS resolver lokal sistem adalah...
A. /etc/resolv.conf
B. /etc/hostname
C. /etc/nsswitch.conf
D. /etc/network/interfaces
E. /etc/bind/named.conf
KUNCI: A

5. Paket perangkat lunak standar yang paling banyak digunakan untuk membangun Domain Name System (DNS) Server pada Debian 12 adalah...
A. apache2
B. bind9
C. isc-dhcp-server
D. postfix
E. vsftpd
KUNCI: B

6. Pada konfigurasi BIND9, berkas yang digunakan untuk mendeklarasikan zona Forward dan Reverse baru adalah...
A. /etc/bind/named.conf.options
B. /etc/bind/named.conf.local
C. /etc/bind/named.conf.default-zones
D. /etc/bind/bind.keys
E. /etc/bind/rndc.conf
KUNCI: B

7. Tipe Resource Record (RR) pada konfigurasi berkas zona DNS yang digunakan untuk memetakan nama domain ke alamat IPv4 adalah...
A. AAAA Record
B. CNAME Record
C. PTR Record
D. A Record
E. MX Record
KUNCI: D

8. Tipe DNS Record yang digunakan untuk pemetaan alamat IP kembali menjadi nama domain (Reverse DNS Lookup) adalah...
A. PTR Record
B. TXT Record
C. NS Record
D. SOA Record
E. A Record
KUNCI: A

9. Perintah utilitas baris perintah yang digunakan untuk menguji sintaks dan validitas berkas zona BIND9 sebelum layanan diaktifkan adalah...
A. named-checkconf
B. named-checkzone
C. dnssec-check
D. dig check-zone
E. bind-verify
KUNCI: B

10. Perintah jaringan pada Linux yang paling tepat untuk melakukan kueri pencarian DNS terperinci beserta flag respon otoritatif adalah...
A. ping
B. traceroute
C. dig
D. netstat
E. ip route
KUNCI: C

11. Lokasi direktori Document Root default tempat meletakkan berkas HTML/PHP pada web server Apache2 di Debian 12 adalah...
A. /var/log/apache2
B. /etc/apache2/sites-available
C. /usr/share/nginx/html
D. /var/www/html
E. /home/web/public_html
KUNCI: D

12. Perintah utilitas khusus Apache di Debian untuk mengaktifkan berkas konfigurasi Virtual Host baru adalah...
A. a2enmod
B. a2dissite
C. a2ensite
D. a2dismod
E. a2reload
KUNCI: C

13. Nomor port standar yang digunakan oleh protokol HTTPS (HTTP Secure) dengan enkripsi TLS/SSL adalah...
A. Port 21
B. Port 80
C. Port 110
D. Port 443
E. Port 8080
KUNCI: D

14. Direktori konfigurasi pada Apache2 yang berisi daftar Virtual Host yang sedang aktif berjalan pada sistem adalah...
A. /etc/apache2/mods-available
B. /etc/apache2/sites-available
C. /etc/apache2/sites-enabled
D. /etc/apache2/conf-available
E. /etc/apache2/mods-enabled
KUNCI: C

15. Modul Apache2 yang harus diaktifkan agar web server dapat melakukan pengalihan tautan (URL Rewriting) atau file .htaccess adalah...
A. mod_ssl
B. mod_rewrite
C. mod_proxy
D. mod_headers
E. mod_deflate
KUNCI: B

16. Paket layanan DHCP Server resmi yang umum dipasang pada Debian 12 untuk mendistribusikan IP dinamis ke klien adalah...
A. dhcpcd5
B. isc-dhcp-server
C. dnsmasq-utils
D. pump-client
E. dhclient
KUNCI: B

17. Berkas konfigurasi utama untuk menentukan rentang IP range, subnet, dan gateway pada ISC-DHCP Server adalah...
A. /etc/default/isc-dhcp-server
B. /etc/dhcp/dhclient.conf
C. /etc/dhcp/dhcpd.conf
D. /var/lib/dhcp/dhcpd.leases
E. /etc/network/dhcp.conf
KUNCI: C

18. Berkas konfigurasi yang digunakan untuk menentukan antarmuka (network interface, misal: eth0 / ens18) yang akan melayani permintaan DHCP adalah...
A. /etc/default/isc-dhcp-server
B. /etc/dhcp/dhcpd.conf
C. /etc/interfaces.d/dhcp
D. /etc/resolv.conf
E. /var/log/syslog
KUNCI: A

19. Parameter pada konfigurasi dhcpd.conf yang digunakan untuk memberikan alamat Default Gateway kepada komputer klien adalah...
A. option domain-name-servers
B. option routers
C. option subnet-mask
D. option broadcast-address
E. default-lease-time
KUNCI: B

20. Perangkat lunak Mail Transfer Agent (MTA) yang bertugas mengirimkan dan merutekan email antar server email di Debian adalah...
A. Dovecot
B. Squirrelmail
C. Roundcube
D. Postfix
E. SpamAssassin
KUNCI: D

21. Perangkat lunak Mail Delivery Agent (MDA/IMAP/POP3) yang digunakan agar klien (Thunderbird, Outlook) dapat mengambil pesan email dari server adalah...
A. Postfix
B. Dovecot
C. BIND9
D. Nginx
E. OpenSSH
KUNCI: B

22. Nomor port standar untuk pengiriman email antar Mail Transfer Agent melalui protokol SMTP tanpa enkripsi adalah...
A. Port 25
B. Port 110
C. Port 143
D. Port 993
E. Port 995
KUNCI: A

23. Nomor port standar yang digunakan oleh protokol IMAPS (Internet Message Access Protocol over SSL/TLS) adalah...
A. Port 25
B. Port 143
C. Port 587
D. Port 993
E. Port 995
KUNCI: D

24. Format penyimpanan kotak surat di Linux di mana setiap email disimpan sebagai satu berkas terpisah di dalam folder khusus pengguna disebut...
A. mbox
B. Maildir
C. dbmail
D. rawmail
E. pst
KUNCI: B

25. Berkas konfigurasi utama untuk mengatur domain asal pengirim, nama host, dan jaringan lokal yang diizinkan pada Postfix adalah...
A. /etc/postfix/master.cf
B. /etc/postfix/main.cf
C. /etc/postfix/aliases
D. /etc/dovecot/dovecot.conf
E. /etc/mailname
KUNCI: B

26. [TIPE: MC] Manakah di antara protokol email berikut yang berfungsi untuk mengambil/mengunduh pesan email dari server ke perangkat pengguna? (Pilihlah 2 jawaban yang benar)
A. SMTP (Simple Mail Transfer Protocol)
B. POP3 (Post Office Protocol version 3)
C. IMAP (Internet Message Access Protocol)
D. SNMP (Simple Network Management Protocol)
E. ICMP (Internet Control Message Protocol)
KUNCI: B, C

27. [TIPE: MC] Dalam proses alokasi alamat IP dinamis (DORA Process), manakah 2 tahap di mana paket dikirimkan oleh komputer KLIEN menuju DHCP Server?
A. Discover
B. Offer
C. Request
D. Acknowledge
E. Renew
KUNCI: A, C

28. [TIPE: MC] Manakah di antara pilihan berikut yang merupakan DNS Resource Record khusus untuk layanan Web dan Mail Server? (Pilihlah 3 jawaban yang benar)
A. A Record (Alamat IPv4)
B. MX Record (Mail Exchange Server)
C. CNAME Record (Canonical Name / Alias)
D. PTR Record (Pointer Reverse)
E. DHCP Record (Dynamic Host)
KUNCI: A, B, C

29. [TIPE: MC] Fitur keamanan apa sajakah yang dapat diterapkan pada Web Server Apache/Nginx di Debian 12 untuk mencegah kebocoran data? (Pilihlah 2 jawaban yang benar)
A. Mengaktifkan sertifikat SSL/TLS (HTTPS)
B. Menonaktifkan Server Signature dan Server Tokens
C. Membuka semua direktori dengan perintah chmod 777
D. Menggunakan port default 80 tanpa enkripsi
E. Menonaktifkan firewall UFW
KUNCI: A, B

30. [TIPE: MC] Perintah di bawah ini yang dapat digunakan untuk memeriksa apakah port layanan (misal: port 53 DNS atau 80 HTTP) sedang berjalan (listening) di Debian 12 adalah... (Pilihlah 2 jawaban yang benar)
A. ss -tulpn
B. netstat -tulpn
C. ping localhost
D. cat /etc/hosts
E. ifconfig up
KUNCI: A, B

31. [TIPE: MC] Pada sistem operasi Linux Debian 12, manakah direktori yang berisi berkas-berkas log aktivitas sistem dan layanan server? (Pilihlah 2 jawaban yang benar)
A. /var/log/apache2/access.log
B. /var/log/mail.log
C. /etc/network/interfaces
D. /bin/systemctl
E. /root/desktop
KUNCI: A, B

32. [TIPE: MC] Manakah paket-paket yang diperlukan untuk membangun sistem Webmail lengkap berbasis PHP di Debian 12? (Pilihlah 3 jawaban yang benar)
A. postfix
B. dovecot-imapd
C. roundcube
D. isc-dhcp-server
E. samba
KUNCI: A, B, C

33. [TIPE: TF] Pada Debian 12, layanan DNS Server BIND9 secara default mendengarkan kueri pada port 53 baik protokol UDP maupun TCP.
A. Benar
B. Salah
KUNCI: BENAR

34. [TIPE: TF] Protokol POP3 secara default menyinkronkan folder email secara dua arah (read/unread/sent) secara real-time di semua perangkat pengguna seperti protokol IMAP.
A. Benar
B. Salah
KUNCI: SALAH

35. [TIPE: TF] File konfigurasi /etc/network/interfaces di Debian dapat dikonfigurasi untuk menjalankan dua kartu jaringan (Ethernet) sekaligus dengan IP statis dan DHCP klien secara bersamaan.
A. Benar
B. Salah
KUNCI: BENAR

36. [TIPE: TF] Dokumen Root Virtual Host pada Web Server Apache2 hanya boleh diletakkan di direktori /var/www/html dan tidak dapat dipindahkan ke partisi atau folder lain.
A. Benar
B. Salah
KUNCI: SALAH

37. [TIPE: MATCHING] Pasangkanlah jenis layanan jaringan di sebelah kiri dengan nomor port standarnya di sebelah kanan:
PASANGAN 1: DNS Server <=> Port 53
PASANGAN 2: Web Server HTTP <=> Port 80
PASANGAN 3: Web Server HTTPS <=> Port 443
PASANGAN 4: Mail Server SMTP Submission <=> Port 587
PASANGAN 5: Secure IMAP (IMAPS) <=> Port 993

38. [TIPE: MATCHING] Pasangkanlah nama paket perangkat lunak server pada Debian 12 di sebelah kiri dengan fungsi utamanya di sebelah kanan:
PASANGAN 1: bind9 <=> Server resolusi nama domain (DNS)
PASANGAN 2: isc-dhcp-server <=> Server pendistribusi IP otomatis (DHCP)
PASANGAN 3: apache2 <=> Server penyedia konten website (Web Server)
PASANGAN 4: postfix <=> Server pengirim dan perute email (MTA)
PASANGAN 5: dovecot-imapd <=> Server pengambil email klien berbasis IMAP

39. [TIPE: ESSAY] Jelaskan secara berurutan 4 tahapan proses DORA (Discover, Offer, Request, Acknowledge) pada saat komputer klien mendapatkan konfigurasi IP otomatis dari DHCP Server!
KUNCI: 1) DHCP Discover: Klien mengirim broadcast mencari server DHCP. 2) DHCP Offer: Server menawarkan IP yang tersedia beserta subnet dan gateway. 3) DHCP Request: Klien meminta IP yang ditawarkan tersebut. 4) DHCP Acknowledge: Server mengonfirmasi dan mengunci IP tersebut untuk MAC Address klien selama masa sewa (lease time).

40. [TIPE: ESSAY] Mengapa dalam konfigurasi Mail Server profesional, pengaturan DNS Record bertipe MX (Mail Exchange) dan PTR (Reverse DNS / SPF / DKIM) sangat penting untuk diterapkan?
KUNCI: MX Record diperlukan agar mail server lain di internet mengetahui server tujuan saat mengirimkan email ke domain kita. Sedangkan PTR Record dan SPF/DKIM sangat krusial untuk reputasi keamanan server agar email yang kita kirimkan tidak dianggap sebagai SPAM/Phishing dan tidak ditolak oleh penyedia email besar (seperti Gmail atau Yahoo).
`;

function buildDocxXml(text) {
  const lines = text.trim().split("\n");
  let paragraphsXml = "";

  paragraphsXml += `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:b/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E3A8A"/></w:rPr><w:t>SOAL PENILAIAN AKHIR SEMESTER (ASJ)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="4B5563"/></w:rPr><w:t>Linux Debian 12, DNS BIND9, Web Server, DHCP, &amp; Mail Server</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>------------------------------------------------------------------------------------------------------</w:t></w:r></w:p>
  `;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphsXml += `<w:p><w:r><w:t></w:t></w:r></w:p>`;
      continue;
    }

    if (trimmed.startsWith("KUNCI:") || trimmed.startsWith("JAWABAN:")) {
      paragraphsXml += `
        <w:p>
          <w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r>
        </w:p>
      `;
    } else if (trimmed.match(/^\d+[\.\)]/)) {
      paragraphsXml += `
        <w:p>
          <w:r><w:rPr><w:b/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r>
        </w:p>
      `;
    } else if (trimmed.match(/^[A-Ea-e][\.\)]/)) {
      paragraphsXml += `
        <w:p>
          <w:r><w:rPr><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">  ${escapeXml(trimmed)}</w:t></w:r>
        </w:p>
      `;
    } else if (trimmed.startsWith("PASANGAN")) {
      paragraphsXml += `
        <w:p>
          <w:r><w:rPr><w:color w:val="4338CA"/><w:b/></w:rPr><w:t xml:space="preserve">  ${escapeXml(trimmed)}</w:t></w:r>
        </w:p>
      `;
    } else {
      paragraphsXml += `
        <w:p>
          <w:r><w:t xml:space="preserve">${escapeXml(trimmed)}</w:t></w:r>
        </w:p>
      `;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
    <w:sectPr/>
  </w:body>
</w:document>`;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
  });
}

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const documentXml = buildDocxXml(rawSoalText);

const docxBuffer = createZipBuffer([
  { name: "[Content_Types].xml", content: contentTypesXml },
  { name: "_rels/.rels", content: rootRelsXml },
  { name: "word/document.xml", content: documentXml },
]);

// Ensure public directory exists
const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outPublicPath = path.join(publicDir, "Soal_ASJ_Debian12_Lengkap.docx");
fs.writeFileSync(outPublicPath, docxBuffer);
console.log("✅ File .docx tersimpan di public:", outPublicPath);

// Also copy to scratch root
const scratchPath = path.join(__dirname, "..", "..", "Soal_ASJ_Debian12_Lengkap.docx");
fs.writeFileSync(scratchPath, docxBuffer);
console.log("✅ File .docx tersimpan di workspace scratch:", scratchPath);
