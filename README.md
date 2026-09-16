# ZYACBT Modern Edition (Next-Gen)

Aplikasi Ujian Berbasis Komputer (Computer Based Test) Modern dengan performa tinggi, desain antarmuka bersih & responsif, sistem pengawasan (*proctoring*) anti-curang canggih, dan dukungan migrasi langsung dari database ZYACBT klasik.

---

## ✨ Fitur & Keunggulan Utama

1. **Teknologi Terkini**:
   - **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, KaTeX (Rendering rumus matematika presisi).
   - **Backend**: Next.js Server Handlers + RESTful APIs.
   - **Database**: Prisma ORM dengan dukungan SQLite (zero-config) & MySQL/PostgreSQL.
2. **5 Tipe Soal Lengkap**:
   - Pilihan Ganda Tunggal (Single Choice)
   - Pilihan Ganda Kompleks (Multi Select Checkbox)
   - Benar / Salah (True / False)
   - Menjodohkan (Matching Pair Selector)
   - Esai / Uraian (Rich text & penilaian manual oleh guru)
3. **Sistem Anti-Cheat & Proctoring Canggih**:
   - Penguncian Layar Penuh (*Fullscreen Lock*)
   - Deteksi Perpindahan Tab & Aplikasi (*Tab Switch & Window Blur Monitoring*)
   - Proteksi multi-login & pembekuan otomatis peserta jika melanggar toleransi
   - Live Proctoring Dashboard: Pengawas dapat memantau progres soal, mereset peserta, membuka kunci akun, menambah waktu (+10 menit), atau menghentikan ujian secara live.
4. **Autosave Real-Time & Network Resilience**:
   - Setiap klik opsi jawaban langsung tersimpan di latar belakang.
   - Timer hitung mundur dengan sinkronisasi waktu server.
5. **Import & Export Fleksibel**:
   - Import soal instan dari dokumen Microsoft Word (`.docx`) & Excel (`.xlsx`) dengan visual preview.
   - Migrasi langsung dari database dump ZYACBT lama (`zyacbtpublic.sql`).
   - Cetak Kartu Peserta Ujian siap cetak / PDF.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18+ (Disarankan v20+)
- npm / yarn / pnpm

### 2. Inisialisasi Database & Seeding
Jalankan perintah berikut di folder proyek:
```bash
# Push skema database ke SQLite/MySQL
npx prisma db push

# Isi data awal (Admin, Siswa Demo, Soal Matematika KaTeX 5 Tipe)
npm run db:seed
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Akses aplikasi melalui browser di: `http://localhost:3000`

---

## 🔑 Akun Bawaan (Demo)

| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Administrator / Guru** | `admin` | `admin123` | Akses Dashboard Admin, Bank Soal, Live Proctoring |
| **Peserta (Siswa 1)** | `siswa1` | `123456` | Peserta Ujian Demo (Kelas 12 MIPA 1) |
| **Peserta (Siswa 2)** | `siswa2` | `123456` | Peserta Ujian Demo (Kelas 12 MIPA 1) |

**Token Ujian Demo**: `ZYACBT`

---

## 📦 Migrasi dari Database ZYACBT Lama
Untuk mengimpor seluruh topik, butir soal, opsi jawaban, dan peserta dari dump database ZYACBT CodeIgniter 3 lama:
1. Buka menu **Migrasi ZYACBT Legacy** di panel Admin (`/admin/legacy-import`).
2. Pilih file `zyacbt-public-2024-05-05-tanpa-database.sql` atau tempelkan skrip SQL-nya.
3. Klik **Mulai Migrasi Database**. Seluruh data akan langsung aktif di ZYACBT Modern.
