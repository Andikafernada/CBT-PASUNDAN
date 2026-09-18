# Navin CBT Pasundan — Model Context Protocol (MCP) Servers

Repositori ini mencakup 4 server **Model Context Protocol (MCP)** terintegrasi untuk pengawasan ujian real-time, audit & normalisasi bank soal, otomasi hypervisor Proxmox VE, dan manajemen jaringan nirkabel Ruijie Cloud di SMK Pasundan 2 Bandung.

---

## Daftar MCP Server

### 1. `cbt-live-monitor`
Server pemantauan langsung sesi ujian dan intervensi proktor:
* **Diagnostik Siswa**: Mendeteksi status pengerjaan, sisa waktu, jumlah pelanggaran, riwayat IP, dan heartbeat.
* **Buka Kunci Akun (*Unlock*)**: Membuka sesi siswa yang terkunci akibat perpindahan perangkat atau pelanggaran window switch.
* **Perpanjangan Waktu (*Extend Time*)**: Menambah durasi menit pengerjaan siswa secara individual saat terjadi kendala teknis.
* **Paksa Selesai (*Force Finish*)**: Menghentikan sesi ujian siswa dari jarak jauh dan mengunci jawaban akhir.
* **Update Token Dinamis**: Memperbarui token ujian secara instan ke seluruh ruang ujian.

### 2. `cbt-question-normalizer`
Server pemrosesan otomatis format bank soal ujian:
* **Audit File Soal (`audit_exam_file`)**: Memeriksa kelayakan file `.docx`, struktur nomor, kunci jawaban, dan mendeteksi anomali formula matematika.
* **Normalisasi Dokumen (`normalize_exam_docx`)**: Mengonversi formula OMML Word ke standar LaTeX KaTeX, mengekstrak gambar, dan membersihkan format tabel.
* **Proses Masal (`batch_normalize_folder`)**: Memproses puluhan file naskah soal per jenjang kelas secara serentak.

### 3. `proxmox`
Server otomasi infrastruktur virtualisasi server ujian:
* **Status Hypervisor**: Memeriksa utilisasi CPU, RAM, IO delay, dan storage cluster Proxmox VE (IP: `172.16.0.177`).
* **Lifecycle VM/Container**: Memeriksa status, start, stop, reboot VM server aplikasi CBT dan database MySQL.
* **Provisioning LXC**: Membuat container baru secara dinamis untuk replikasi node ujian saat lonjakan beban peserta.

### 4. `ruijie-cloud`
Server manajemen jaringan wireless dan access point ujian:
* **SSID Management**: Membuat, mengaktifkan, dan menonaktifkan SSID khusus ujian secara terprogram.
* **Perangkat & Port Switch**: Memeriksa status operasional Access Point (AP) dan port PoE switch di laboratorium komputer.
* **Reboot Perangkat AP**: Me-reboot AP yang mengalami degradasi performa atau kelebihan beban koneksi siswa.

---

## Cara Penggunaan

Setiap folder server memiliki file `server.py` berbasis Python (stdio/HTTP) dan direktori `schemas/` yang mendefinisikan tool schema JSON untuk digunakan oleh asisten AI / LLM Agent (Antigravity, Claude Desktop, Cursor).

Contoh konfigurasi koneksi pada `mcp_config.json`:
```json
{
  "mcpServers": {
    "cbt-live-monitor": {
      "command": "python",
      "args": ["mcp/cbt-live-monitor/server.py"]
    },
    "cbt-question-normalizer": {
      "command": "python",
      "args": ["mcp/cbt-question-normalizer/server.py"]
    },
    "proxmox": {
      "command": "python",
      "args": ["mcp/proxmox/server.py"]
    },
    "ruijie-cloud": {
      "command": "python",
      "args": ["mcp/ruijie-cloud/src/ruijie_mcp/server.py"]
    }
  }
}
```
