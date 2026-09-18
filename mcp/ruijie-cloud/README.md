# Ruijie Cloud MCP Server (Model Context Protocol)

Jembatan cerdas (bridge) berbasis **Model Context Protocol (MCP)** untuk menghubungkan **Antigravity AI** dengan **Ruijie Cloud / Reyee Cloud Network Management Platform**.

---

## 🌟 Fitur Utama (Fase 1: Autentikasi & Koneksi)

- **Dual-Mode Authentication**: Mendukung otentikasi resmi via **OpenAPI Developer (`appId` & `appSecret`)** maupun **Direct Cloud Account Login (`username` & `password`)**.
- **Automated Background Session & Auto-Refresh**: AI dapat beroperasi tanpa perlu membuka browser. Token sesi dicache secara aman di memori lokal dan otomatis diperbarui (*auto-renew*) sebelum kedaluwarsa.
- **Auto-Retry on 401**: Jika token kadaluarsa di tengah jalan, client secara otomatis memicu re-login dan mengulang request tanpa kegagalan.
- **FastMCP Standard**: Dibangun menggunakan SDK resmi `FastMCP` yang kompatibel penuh dengan arsitektur tool Antigravity.

---

## 📁 Struktur Direktori

```
ruijie-cloud-mcp/
├── .env.example              # Template kredensial dan konfigurasi
├── requirements.txt          # Dependensi Python
├── test_auth.py              # Tool diagnostik CLI untuk uji coba koneksi
├── README.md                 # Panduan instalasi dan penggunaan
└── src/
    └── ruijie_mcp/
        ├── __init__.py
        ├── auth.py           # Token manager, caching, dan Dual-Mode Auth
        ├── client.py         # HTTP client wrapper dengan interceptor 401
        └── server.py         # FastMCP Server (Tools: test_connection, get_auth_status)
```

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Instalasi Dependensi
Jalankan perintah berikut di terminal:
```powershell
cd C:\Users\User\.gemini\antigravity\scratch\ruijie-cloud-mcp
python -m pip install -r requirements.txt
```

### 2. Pengaturan Kredensial (`.env`)
Salin file `.env.example` menjadi `.env`:
```powershell
cp .env.example .env
```
Buka file `.env` dan sesuaikan nilainya:

#### Opsi A: Menggunakan OpenAPI Developer (Direkomendasikan)
```env
RUIJIE_BASE_URL=https://cloud-as.ruijienetworks.com
RUIJIE_AUTH_MODE=apikey
RUIJIE_APP_ID=your_app_id
RUIJIE_APP_SECRET=your_app_secret
RUIJIE_API_TOKEN=your_api_token
```

#### Opsi B: Menggunakan Akun Ruijie Cloud Langsung
```env
RUIJIE_BASE_URL=https://cloud-as.ruijienetworks.com
RUIJIE_AUTH_MODE=account
RUIJIE_USERNAME=email_anda@domain.com
RUIJIE_PASSWORD=password_akun_anda
```

### 3. Uji Coba Diagnostik
Jalankan script diagnostik untuk memverifikasi konfigurasi dan koneksi ke Ruijie Cloud:
```powershell
# Cek validasi konfigurasi (tanpa request ke server):
python test_auth.py --dry-run

# Uji koneksi langsung ke server Ruijie Cloud:
python test_auth.py
```

---

## 🔌 Integrasi ke Antigravity

Daftarkan MCP Server ini ke konfigurasi global Antigravity pada file `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "ruijie-cloud": {
      "command": "python",
      "args": [
        "C:/Users/User/.gemini/antigravity/scratch/ruijie-cloud-mcp/src/ruijie_mcp/server.py"
      ],
      "env": {
        "PYTHONPATH": "C:/Users/User/.gemini/antigravity/scratch/ruijie-cloud-mcp/src"
      }
    }
  }
}
```

Setelah ditambahkan, Antigravity akan langsung mengenali tools:
- `ruijie_test_connection`
- `ruijie_get_auth_status`

---

## 🗺️ Roadmap Pengembangan Berikutnya

- **Fase 2 (Monitoring & Discovery)**:
  - `ruijie_list_projects`: Mengambil seluruh daftar site / project.
  - `ruijie_list_devices`: Menampilkan semua AP, Switch, Gateway beserta status online/offline dan versi firmware.
  - `ruijie_list_clients`: Menampilkan daftar klien yang terhubung (IP, MAC, RSSI, AP terkait).
  - `ruijie_get_alarms`: Mengambil alert dan insiden jaringan aktif.
- **Fase 3 (Konfigurasi & Remediasi)**:
  - `ruijie_reboot_device`: Reboot AP atau Gateway tertentu.
  - `ruijie_configure_ssid`: Menambah/mengubah nama SSID dan password Wi-Fi.
  - `ruijie_set_switch_port_vlan`: Mengubah assignment VLAN pada port switch.
  - `ruijie_power_cycle_poe`: Restart daya port PoE switch (untuk restart IP Camera / AP).
