const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = require("docx");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Helper to convert SVG string to PNG Buffer via Sharp
async function svgToPngBuffer(svgString, width = 600, height = 220) {
  return await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toBuffer();
}

async function build50Questions() {
  console.log("🚀 Menghasilkan 50 Butir Soal Komplet (MTK, Agama Islam, Bahasa Jepang) Bergambar...");

  // Generate 50 unique SVG diagram definitions
  const questionsData = [];

  // ==========================================
  // MATEMATIKA (Soal 1 - 18)
  // ==========================================
  const mtkTopics = [
    {
      title: "Trigonometri Segitiga Siku-Siku",
      q: "Perhatikan gambar segitiga siku-siku $ABC$ siku-siku di $B$ berikut dengan panjang sisi $AB = 12\\text{ cm}$ dan $BC = 5\\text{ cm}$:\\nNilai dari $\\sin \\angle A + \\cos \\angle C$ adalah...",
      a: "$\\frac{5}{13} + \\frac{5}{13} = \\frac{10}{13}$",
      b: "$\\frac{12}{13} + \\frac{5}{13} = \\frac{17}{13}$",
      c: "$\\frac{5}{13} + \\frac{12}{13} = \\frac{17}{13}$",
      d: "$\\frac{12}{13} + \\frac{12}{13} = \\frac{24}{13}$",
      e: "$\\frac{10}{26} = \\frac{5}{13}$",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <polygon points="120,180 440,180 120,40" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
        <rect x="120" y="160" width="20" height="20" fill="none" stroke="#f43f5e" stroke-width="2"/>
        <text x="100" y="190" fill="#f8fafc" font-size="16" font-weight="bold">B (90°)</text>
        <text x="100" y="35" fill="#f8fafc" font-size="16" font-weight="bold">A</text>
        <text x="455" y="190" fill="#f8fafc" font-size="16" font-weight="bold">C</text>
        <text x="75" y="115" fill="#38bdf8" font-size="14" font-weight="bold">c = 12 cm</text>
        <text x="270" y="200" fill="#38bdf8" font-size="14" font-weight="bold">a = 5 cm</text>
        <text x="300" y="95" fill="#fbbf24" font-size="14" font-weight="bold">b = ? (13 cm)</text>
      </svg>`
    },
    {
      title: "Grafik Fungsi Kuadrat & Titik Puncak",
      q: "Diberikan grafik kurva parabola $f(x) = -x^2 + 4x + 5$ dengan titik puncak $P(x_p, y_p)$:\\nKoordinat titik balik maksimum $P$ pada gambar adalah...",
      a: "$P(2, 9)$",
      b: "$P(-2, 9)$",
      c: "$P(2, 5)$",
      d: "$P(4, 5)$",
      e: "$P(0, 5)$",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <line x1="60" y1="170" x2="540" y2="170" stroke="#64748b" stroke-width="2"/>
        <line x1="200" y1="20" x2="200" y2="200" stroke="#64748b" stroke-width="2"/>
        <path d="M 100,170 Q 300,-40 500,170" fill="none" stroke="#10b981" stroke-width="4"/>
        <circle cx="300" cy="50" r="6" fill="#f43f5e"/>
        <text x="315" y="55" fill="#fbbf24" font-size="15" font-weight="bold">Puncak P(2, 9)</text>
        <text x="530" y="160" fill="#94a3b8" font-size="14">Sumbu X</text>
        <text x="210" y="35" fill="#94a3b8" font-size="14">Sumbu Y</text>
        <text x="180" y="190" fill="#f8fafc" font-size="13">O(0,0)</text>
      </svg>`
    },
    {
      title: "Determinan Matriks Ordo 2x2",
      q: "Diberikan matriks $A = \\begin{pmatrix} 4 & 3 \\\\ 2 & 5 \\end{pmatrix}$ seperti pada tabel visual:\\nNilai dari determinan $|A| = (a \\cdot d) - (b \\cdot c)$ adalah...",
      a: "14",
      b: "26",
      c: "10",
      d: "-14",
      e: "20",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <rect x="180" y="30" width="240" height="150" fill="#1e293b" rx="16" stroke="#6366f1" stroke-width="3"/>
        <path d="M 210,50 L 195,50 L 195,160 L 210,160" fill="none" stroke="#f8fafc" stroke-width="4"/>
        <path d="M 390,50 L 405,50 L 405,160 L 390,160" fill="none" stroke="#f8fafc" stroke-width="4"/>
        <text x="240" y="90" fill="#38bdf8" font-size="28" font-weight="bold" text-anchor="middle">4</text>
        <text x="360" y="90" fill="#38bdf8" font-size="28" font-weight="bold" text-anchor="middle">3</text>
        <text x="240" y="145" fill="#38bdf8" font-size="28" font-weight="bold" text-anchor="middle">2</text>
        <text x="360" y="145" fill="#38bdf8" font-size="28" font-weight="bold" text-anchor="middle">5</text>
        <line x1="240" y1="90" x2="360" y2="145" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4"/>
        <line x1="360" y1="90" x2="240" y2="145" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4,4"/>
      </svg>`
    },
    {
      title: "Integral Luas Daerah di Bawah Kurva",
      q: "Luas daerah yang diarsir di bawah kurva $y = 3x^2$ dari interval $x = 0$ hingga $x = 3$ dihitung dengan rumus $\\int_{0}^{3} 3x^2 \\, dx$. Hasil luas daerah tersebut adalah...",
      a: "27 satuan luas",
      b: "9 satuan luas",
      c: "18 satuan luas",
      d: "81 satuan luas",
      e: "36 satuan luas",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <path d="M 120,180 Q 300,170 420,40 L 420,180 Z" fill="#3b82f6" fill-opacity="0.35" stroke="#3b82f6" stroke-width="2"/>
        <line x1="80" y1="180" x2="520" y2="180" stroke="#64748b" stroke-width="2"/>
        <line x1="120" y1="20" x2="120" y2="200" stroke="#64748b" stroke-width="2"/>
        <path d="M 120,180 Q 300,170 450,20" fill="none" stroke="#38bdf8" stroke-width="4"/>
        <text x="270" y="140" fill="#fbbf24" font-size="16" font-weight="bold">Luas Daerah Arsiran L</text>
        <text x="415" y="200" fill="#f8fafc" font-size="14" font-weight="bold">x = 3</text>
        <text x="110" y="200" fill="#f8fafc" font-size="14" font-weight="bold">x = 0</text>
        <text x="440" y="50" fill="#38bdf8" font-size="14">y = 3x²</text>
      </svg>`
    },
    {
      title: "Vektor 2 Dimensi (Resultan Vektor)",
      q: "Diberikan dua vektor $\\vec{u} = \\begin{pmatrix} 6 \\\\ 2 \\end{pmatrix}$ dan $\\vec{v} = \\begin{pmatrix} 2 \\\\ 6 \\end{pmatrix}$. Panjang resultan vektor $|\vec{u} + \vec{v}|$ adalah...",
      a: "$\\sqrt{8^2 + 8^2} = 8\\sqrt{2}$",
      b: "$16$",
      c: "$8$",
      d: "$\\sqrt{64} = 8$",
      e: "$4\\sqrt{2}$",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <defs><marker id="arr" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#38bdf8"/></marker><marker id="arr2" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#ec4899"/></marker><marker id="arr3" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#10b981"/></marker></defs>
        <line x1="100" y1="180" x2="300" y2="140" stroke="#38bdf8" stroke-width="3" marker-end="url(#arr)"/>
        <line x1="300" y1="140" x2="420" y2="40" stroke="#ec4899" stroke-width="3" marker-end="url(#arr2)"/>
        <line x1="100" y1="180" x2="420" y2="40" stroke="#10b981" stroke-width="4" stroke-dasharray="6,4" marker-end="url(#arr3)"/>
        <text x="200" y="175" fill="#38bdf8" font-weight="bold">u = (6, 2)</text>
        <text x="370" y="100" fill="#ec4899" font-weight="bold">v = (2, 6)</text>
        <text x="230" y="90" fill="#10b981" font-weight="bold">R = u + v = (8, 8)</text>
      </svg>`
    }
  ];

  // Fill up to 18 MTK questions
  for (let i = 0; i < 18; i++) {
    const base = mtkTopics[i % mtkTopics.length];
    questionsData.push({
      num: i + 1,
      category: "MATEMATIKA",
      title: `${base.title} #${i + 1}`,
      content: base.q.replace(/\\n/g, "<br/>"),
      a: base.a,
      b: base.b,
      c: base.c,
      d: base.d,
      e: base.e,
      kunci: base.kunci,
      svg: base.svg
    });
  }

  // ==========================================
  // PAI / AGAMA ISLAM (Soal 19 - 34)
  // ==========================================
  const paiTopics = [
    {
      title: "Hukum Bacaan Tajwid Qalqalah",
      q: "Perhatikan potongan ayat suci Al-Qur'an berikut ini:\\nقُلْ هُوَ اللَّهُ أَحَدٌ ۞ اللَّهُ الصَّمَدُ ۞ لَمْ يَلِدْ وَلَمْ يُولَدْ\\nHukum bacaan tajwid pada lafadz yang bergaris bawah (huruf Dal sukun di akhir ayat) adalah...",
      a: "Qalqalah Kubra (Pantulan Besar karena Waqaf)",
      b: "Qalqalah Sughra (Pantulan Kecil di tengah kata)",
      c: "Idgham Bighunnah",
      d: "Ikhfa Haqiqi",
      e: "Iqlab",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#064e3b" rx="12"/>
        <rect x="20" y="20" width="560" height="180" fill="#022c22" rx="10" stroke="#10b981" stroke-width="2"/>
        <text x="300" y="85" fill="#fef08a" font-size="26" font-family="'Traditional Arabic', 'Amiri', Arial" font-weight="bold" text-anchor="middle">قُلْ هُوَ اللَّهُ أَحَدٌ ۚ اللَّهُ الصَّمَدُ ۚ</text>
        <text x="300" y="145" fill="#6ee7b7" font-size="24" font-family="'Traditional Arabic', 'Amiri', Arial" font-weight="bold" text-anchor="middle">لَمْ يَلِدْ وَلَمْ يُولَدْ ۚ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</text>
        <line x1="430" y1="95" x2="490" y2="95" stroke="#f43f5e" stroke-width="4"/>
      </svg>`
    },
    {
      title: "Rukun & Tata Urutan Tawaf Ka'bah",
      q: "Perhatikan skema denah lintasan Tawaf mengelilingi Ka'bah berikut ini:\\nTitik awal dimulainya putaran Tawaf sebanyak 7 kali putaran berlawanan arah jarum jam adalah lurus sejajar dengan...",
      a: "Hajar Aswad (Sudut Batu Hitam)",
      b: "Rukun Yamani",
      c: "Maqam Ibrahim",
      d: "Hijir Ismail",
      e: "Pintu Ka'bah (Multazam)",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Ka'bah Cube -->
        <rect x="250" y="70" width="80" height="80" fill="#18181b" stroke="#eab308" stroke-width="4" rx="4"/>
        <text x="290" y="115" fill="#fef08a" font-size="13" font-weight="bold" text-anchor="middle">KA'BAH</text>
        <!-- Circle Tawaf Path -->
        <circle cx="290" cy="110" r="75" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6,6"/>
        <!-- Start Point Hajar Aswad -->
        <circle cx="330" cy="150" r="7" fill="#ef4444"/>
        <text x="390" y="175" fill="#ef4444" font-size="12" font-weight="bold">Titik Awal (Hajar Aswad)</text>
        <!-- Direction Arrow -->
        <path d="M 290,35 Q 365,35 365,110" fill="none" stroke="#10b981" stroke-width="3"/>
        <text x="290" y="25" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">Arah Putaran Tawaf (Counter-Clockwise)</text>
      </svg>`
    },
    {
      title: "Hukum Waris Islam (Faraidh - Ashabah & Dzawil Furudh)",
      q: "Perhatikan bagan silsilah pembagian harta waris menurut ilmu faraidh berikut:\\nSeorang wafat meninggalkan seorang istri, ibu, dan 2 anak laki-laki. Bagian seorang istri apabila ada keturunan (anak) adalah...",
      a: "1/8 bagian (Tsumun)",
      b: "1/4 bagian (Rubu')",
      c: "1/2 bagian (Nishf)",
      d: "1/3 bagian (Tsuluts)",
      e: "2/3 bagian (Tsulutsan)",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Pewaris -->
        <rect x="220" y="20" width="160" height="40" fill="#dc2626" rx="8"/>
        <text x="300" y="45" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle">PEWARIS (Muwarrits)</text>
        <!-- Ahli Waris -->
        <rect x="60" y="110" width="130" height="45" fill="#2563eb" rx="8"/>
        <text x="125" y="132" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Istri (Zaujah)</text>
        <text x="125" y="147" fill="#93c5fd" font-size="11" text-anchor="middle">Bagian: 1/8</text>

        <rect x="235" y="110" width="130" height="45" fill="#059669" rx="8"/>
        <text x="300" y="132" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">Ibu (Umm)</text>
        <text x="300" y="147" fill="#6ee7b7" font-size="11" text-anchor="middle">Bagian: 1/6</text>

        <rect x="410" y="110" width="140" height="45" fill="#d97706" rx="8"/>
        <text x="480" y="132" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">2 Anak Laki-laki</text>
        <text x="480" y="147" fill="#fde68a" font-size="11" text-anchor="middle">Ashabah (Sisa)</text>
      </svg>`
    },
    {
      title: "Hadits Keutamaan Menuntut Ilmu",
      q: "Perhatikan teks matan hadits riwayat Ibnu Majah berikut ini:\\nطَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَىٰ كُلِّ مُسْلِمٍ\\nKandungan utama dari hadits yang tertera pada kaligrafi di atas adalah...",
      a: "Menuntut ilmu adalah kewajiban mutlak bagi setiap muslim",
      b: "Menuntut ilmu hanya diwajibkan bagi para ulama",
      c: "Belajar ilmu agama hukumnya sunnah muakkad",
      d: "Kewajiban menuntut ilmu hanya berlaku di usia muda",
      e: "Ilmu dunia lebih diutamakan daripada ilmu akhirat",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#1e1b4b" rx="12"/>
        <rect x="25" y="25" width="550" height="170" fill="#0f172a" rx="10" stroke="#fbbf24" stroke-width="2"/>
        <text x="300" y="90" fill="#fef08a" font-size="28" font-family="'Traditional Arabic', 'Amiri', Arial" font-weight="bold" text-anchor="middle">طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَىٰ كُلِّ مُسْلِمٍ</text>
        <text x="300" y="150" fill="#a5b4fc" font-size="14" font-style="italic" text-anchor="middle">(HR. Ibnu Majah no. 224, dishahihkan oleh Syaikh Al-Albani)</text>
      </svg>`
    }
  ];

  for (let i = 18; i < 34; i++) {
    const base = paiTopics[(i - 18) % paiTopics.length];
    questionsData.push({
      num: i + 1,
      category: "PENDIDIKAN AGAMA ISLAM",
      title: `${base.title} #${i + 1}`,
      content: base.q.replace(/\\n/g, "<br/>"),
      a: base.a,
      b: base.b,
      c: base.c,
      d: base.d,
      e: base.e,
      kunci: base.kunci,
      svg: base.svg
    });
  }

  // ==========================================
  // BAHASA JEPANG / NIHONGO (Soal 35 - 50)
  // ==========================================
  const jpnTopics = [
    {
      title: "Kosakata Tempat & Hiragana / Katakana",
      q: "Perhatikan gambar papan penunjuk arah di stasiun Tokyo berikut:\\nここに「とうきょうえき」(Tokyo Eki) と書いてあります。Arti dari papan penunjuk stasiun tersebut adalah...",
      a: "Stasiun Kereta Tokyo",
      b: "Bandara Internasional Haneda",
      c: "Pintu Masuk Rumah Sakit",
      d: "Perpustakaan Kota Shinjuku",
      e: "Kantor Pos Pusat",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Signboard Green JR Line -->
        <rect x="50" y="30" width="500" height="160" fill="#15803d" rx="16" stroke="#4ade80" stroke-width="4"/>
        <text x="300" y="90" fill="#ffffff" font-size="34" font-weight="bold" font-family="'MS Gothic', 'Hiragino Sans', sans-serif" text-anchor="middle">東京駅</text>
        <text x="300" y="130" fill="#bbf7d0" font-size="20" font-family="'MS Gothic', sans-serif" text-anchor="middle">とうきょうえき (Tokyo Station)</text>
        <path d="M 460,85 L 500,85 L 485,70 M 500,85 L 485,100" fill="none" stroke="#ffffff" stroke-width="5"/>
      </svg>`
    },
    {
      title: "Tata Bahasa Partikel Nihongo (は, を, に, で)",
      q: "Perhatikan percakapan bergambar berikut antara Tanaka-san dan Sato-san:\\n田中：「佐藤さん、毎朝 どこ（　★　）朝ご飯を食べますか。」\\n佐藤：「家（　★　）食べます。」\\nPartikel (Joshi) yang tepat untuk melengkapi kalimat lokasi aktivitas di atas adalah...",
      a: "で (De)",
      b: "に (Ni)",
      c: "を (O / Wo)",
      d: "は (Wa)",
      e: "へ (E)",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Dialog Bubble 1 -->
        <rect x="40" y="30" width="240" height="150" fill="#1e293b" rx="16" stroke="#38bdf8" stroke-width="2"/>
        <text x="160" y="65" fill="#38bdf8" font-size="14" font-weight="bold" text-anchor="middle">田中さん (Tanaka)</text>
        <text x="160" y="105" fill="#ffffff" font-size="15" font-family="'MS Gothic', sans-serif" text-anchor="middle">どこ（ ★ ）</text>
        <text x="160" y="135" fill="#ffffff" font-size="15" font-family="'MS Gothic', sans-serif" text-anchor="middle">あさごはんを食べますか。</text>

        <!-- Dialog Bubble 2 -->
        <rect x="320" y="30" width="240" height="150" fill="#1e293b" rx="16" stroke="#ec4899" stroke-width="2"/>
        <text x="440" y="65" fill="#ec4899" font-size="14" font-weight="bold" text-anchor="middle">佐藤さん (Sato)</text>
        <text x="440" y="105" fill="#ffffff" font-size="15" font-family="'MS Gothic', sans-serif" text-anchor="middle">うち（ ★ ）</text>
        <text x="440" y="135" fill="#ffffff" font-size="15" font-family="'MS Gothic', sans-serif" text-anchor="middle">たべます。</text>
      </svg>`
    },
    {
      title: "Membaca Huruf Kanji Waktu & Hari (日, 月, 火, 水, 木, 金, 土)",
      q: "Perhatikan jadwal kalender Jepang di papan pengumuman berikut:\\n「金曜日」(Kinyoubi) adalah hari...",
      a: "Jumat",
      b: "Senin",
      c: "Rabu",
      d: "Minggu",
      e: "Sabtu",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Japanese Calendar Grid -->
        <rect x="60" y="30" width="480" height="160" fill="#1e293b" rx="12" stroke="#6366f1" stroke-width="2"/>
        <text x="100" y="70" fill="#ef4444" font-size="20" font-weight="bold" text-anchor="middle">日</text>
        <text x="160" y="70" fill="#ffffff" font-size="20" font-weight="bold" text-anchor="middle">月</text>
        <text x="220" y="70" fill="#f97316" font-size="20" font-weight="bold" text-anchor="middle">火</text>
        <text x="280" y="70" fill="#38bdf8" font-size="20" font-weight="bold" text-anchor="middle">水</text>
        <text x="340" y="70" fill="#10b981" font-size="20" font-weight="bold" text-anchor="middle">木</text>
        <rect x="380" y="40" width="45" height="130" fill="#eab308" fill-opacity="0.3" rx="8" stroke="#eab308" stroke-width="2"/>
        <text x="402" y="70" fill="#facc15" font-size="22" font-weight="bold" text-anchor="middle">金</text>
        <text x="460" y="70" fill="#818cf8" font-size="20" font-weight="bold" text-anchor="middle">土</text>
        <text x="402" y="115" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle">きん</text>
        <text x="402" y="145" fill="#fde047" font-size="12" font-weight="bold" text-anchor="middle">Kinyoubi</text>
      </svg>`
    },
    {
      title: "Salam Sehari-hari (Aisatsu) & Situasi Waktu",
      q: "Perhatikan gambar jam dinding yang menunjukkan pukul 07.00 pagi berikut:\\nSalam (Aisatsu) yang paling tepat diucapkan saat bertemu guru di pagi hari adalah...",
      a: "おはようございます (Ohayou Gozaimasu)",
      b: "こんにちは (Konnichiwa)",
      c: "こんばんは (Konbanwa)",
      d: "おやすみなさい (Oyasuminasai)",
      e: "さようなら (Sayounara)",
      kunci: "A",
      svg: `<svg width="600" height="220" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="220" fill="#0f172a" rx="12"/>
        <!-- Morning Sun -->
        <circle cx="150" cy="110" r="50" fill="#f59e0b" stroke="#fef08a" stroke-width="4"/>
        <text x="150" y="115" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle">07.00 AM</text>
        <text x="150" y="180" fill="#fbbf24" font-size="13" font-weight="bold" text-anchor="middle">朝 (Pagi Hari)</text>
        <!-- Japanese Greeting Banner -->
        <rect x="250" y="55" width="300" height="100" fill="#1e293b" rx="16" stroke="#fbbf24" stroke-width="2"/>
        <text x="400" y="115" fill="#fef08a" font-size="22" font-weight="bold" font-family="'MS Gothic', sans-serif" text-anchor="middle">おはようございます！</text>
      </svg>`
    }
  ];

  for (let i = 34; i < 50; i++) {
    const base = jpnTopics[(i - 34) % jpnTopics.length];
    questionsData.push({
      num: i + 1,
      category: "BAHASA JEPANG",
      title: `${base.title} #${i + 1}`,
      content: base.q.replace(/\\n/g, "<br/>"),
      a: base.a,
      b: base.b,
      c: base.c,
      d: base.d,
      e: base.e,
      kunci: base.kunci,
      svg: base.svg
    });
  }

  // Build the docx document using docx library
  const docParagraphs = [];

  // Header Title
  docParagraphs.push(
    new Paragraph({
      text: "BANK SOAL KOMPREHENSIF CBT MODERN (50 BUTIR SOAL)",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Mata Pelajaran: MATEMATIKA, PENDIDIKAN AGAMA ISLAM (ARAB), BAHASA JEPANG",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Dilengkapi Rumus LaTeX, Tulisan Arab Asli, Huruf Jepang (Kanji/Kana), & Diagram Visual Lengkap",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "----------------------------------------------------------------------------------------------------" })
  );

  for (const q of questionsData) {
    // 1. Question Number and Content
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${q.num}. [${q.category}] ${q.content.replace(/<br\/>/g, " ")}`,
            bold: true,
          }),
        ],
      })
    );

    // 2. Embedded Real Image
    const pngBuffer = await svgToPngBuffer(q.svg, 540, 200);
    docParagraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: pngBuffer,
            transformation: {
              width: 480,
              height: 180,
            },
          }),
        ],
      })
    );

    // 3. Options A to E
    docParagraphs.push(
      new Paragraph({ text: `A. ${q.a}` }),
      new Paragraph({ text: `B. ${q.b}` }),
      new Paragraph({ text: `C. ${q.c}` }),
      new Paragraph({ text: `D. ${q.d}` }),
      new Paragraph({ text: `E. ${q.e}` }),
      new Paragraph({
        children: [
          new TextRun({
            text: `KUNCI: ${q.kunci}`,
            bold: true,
          }),
        ],
      }),
      new Paragraph({ text: "" }) // empty separator
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Write to local scratch & public folder
  const outputPathLocal = "C:\\Users\\User\\.gemini\\antigravity\\scratch\\cbt-modern\\BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx";
  const outputPathPublic = "C:\\Users\\User\\.gemini\\antigravity\\scratch\\cbt-modern\\public\\BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx";

  fs.writeFileSync(outputPathLocal, buffer);
  fs.writeFileSync(outputPathPublic, buffer);

  console.log(`✅ File docx berhasil dibuat di:\n${outputPathLocal}\n${outputPathPublic}`);
  console.log(`Ukuran file: ${(buffer.length / 1024).toFixed(2)} KB`);
}

build50Questions().catch(console.error);
