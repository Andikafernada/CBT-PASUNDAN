#!/bin/bash
# ==============================================================================
# SCRIPT DEPLOYMENT OTOMATIS ZYACBT MODERN KE PROXMOX VE (LXC CONTAINER)
# Target OS: Debian 11/12 atau Ubuntu 20.04/22.04/24.04
# Didesain khusus untuk kapasitas 2.000 Siswa Ujian Serentak
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 MEMULAI INSTALASI ZYACBT MODERN PADA PROXMOX CONTAINER"
echo "=========================================================="

# 1. Update Paket & Install Dependencies
echo "📦 [1/6] Mengupdate sistem dan menginstal dependensi dasar..."
apt-get update -y
apt-get install -y curl wget git unzip build-essential nginx ufw htop

# 2. Install Node.js 20 LTS
echo "📦 [2/6] Menginstal Node.js v20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v) dan NPM $(npm -v) terpasang."

# 3. Install PM2 (Process Manager untuk High-Concurrency)
echo "📦 [3/6] Menginstal PM2 Cluster Manager..."
npm install -g pm2

# 4. Install & Konfigurasi Database (MySQL 8 / MariaDB)
echo "📦 [4/6] Menyiapkan Database Server..."
apt-get install -y mariadb-server
systemctl enable mariadb
systemctl start mariadb

# Konfigurasi Tuning MySQL untuk 2000 Siswa
cat << 'EOF' > /etc/mysql/mariadb.conf.d/99-cbt-tuning.cnf
[mysqld]
max_connections = 500
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
query_cache_type = 0
query_cache_size = 0
open_files_limit = 65535
EOF

systemctl restart mariadb

# Buat Database & User
mysql -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS zyacbt_modern CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'cbtuser'@'localhost' IDENTIFIED BY 'cbtpassword2026';
GRANT ALL PRIVILEGES ON zyacbt_modern.* TO 'cbtuser'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "✅ Database 'zyacbt_modern' berhasil dibuat."

# 5. Setup Direktori Aplikasi CBT
echo "📦 [5/6] Menyiapkan Aplikasi ZYACBT Modern..."
APP_DIR="/var/www/cbt-modern"
mkdir -p $APP_DIR

# Clone / Setup Project
cd $APP_DIR
# Buat .env untuk produksi
cat << 'EOF' > $APP_DIR/.env
DATABASE_URL="mysql://cbtuser:cbtpassword2026@localhost:3306/zyacbt_modern"
JWT_SECRET="super-secure-production-cbt-key-2026-proxmox"
NEXT_PUBLIC_APP_NAME="ZYACBT Modern Next-Gen"
NEXT_PUBLIC_APP_DESCRIPTION="Platform Ujian Berbasis Komputer Modern & Cepat"
NODE_ENV="production"
PORT=3000
EOF

# 6. Konfigurasi Nginx Reverse Proxy
echo "📦 [6/6] Mengonfigurasi Nginx Web Server (Port 80)..."
cat << 'EOF' > /etc/nginx/sites-available/cbt
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    # Gzip Compression untuk Hemat Bandwidth & Akselerasi 2000 Siswa
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/cbt
nginx -t
systemctl restart nginx

echo "=========================================================="
echo "🎉 INSTALASI DASAR SERVER PROXMOX SELESAI!"
echo "=========================================================="
echo "Langkah selanjutnya: Jalankan 'pm2 start npm --name cbt-modern -- start' di folder $APP_DIR"
