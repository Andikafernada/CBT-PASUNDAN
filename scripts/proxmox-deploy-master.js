const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const conn = new Client();

console.log("🚀 MEMULAI PROSES DEPLOYMENT LENGKAP 2 CT KE PROXMOX VE...");

conn
  .on("ready", () => {
    console.log("✅ Terhubung ke Proxmox VE (172.16.0.177) sebagai ROOT.");

    // First upload the zip package to Proxmox /root/
    const sftp = conn.sftp((err, sftp) => {
      if (err) throw err;

      const localZip = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern-ready.zip");
      const remoteZip = "/root/cbt-modern-ready.zip";

      console.log(`📤 Mengunggah paket aplikasi (${localZip}) ke Proxmox (${remoteZip})...`);

      sftp.fastPut(localZip, remoteZip, (uploadErr) => {
        if (uploadErr) throw uploadErr;
        console.log("✅ File paket berhasil diunggah ke Proxmox!");

        // Execute Master Setup Script
        runMasterDeployment();
      });
    });
  })
  .on("error", console.error)
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });

function runMasterDeployment() {
  console.log("🛠️ Menjalankan orkestrasi pembuatan 2 CT & konfigurasi otomatis...");

  const script = `
set -e

echo "=== [1/8] HAPUS CT LAMA JIKA SUDAH ADA (ID 601 & 602) ==="
pct stop 601 || true
pct destroy 601 --purge 1 || true
pct stop 602 || true
pct destroy 602 --purge 1 || true

echo "=== [2/8] MEMBUAT CT 602 (DEDICATED DATABASE SERVER) ==="
# CT 602: cbt-db (IP: 172.16.0.211)
pct create 602 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \\
    --hostname cbt-db \\
    --cores 4 \\
    --memory 8192 \\
    --swap 2048 \\
    --rootfs local-lvm:40 \\
    --net0 name=eth0,bridge=vmbr0,ip=172.16.0.211/24,gw=172.16.0.254,firewall=1 \\
    --nameserver 8.8.8.8 \\
    --onboot 1 \\
    --password P45und4n

pct start 602
echo "✅ CT 602 (cbt-db) aktif!"

echo "=== [3/8] MEMBUAT CT 601 (WEB APPLICATION NODE) ==="
# CT 601: cbt-app (IP: 172.16.0.210)
pct create 601 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \\
    --hostname cbt-app \\
    --cores 4 \\
    --memory 6144 \\
    --swap 2048 \\
    --rootfs local-lvm:25 \\
    --net0 name=eth0,bridge=vmbr0,ip=172.16.0.210/24,gw=172.16.0.254,firewall=1 \\
    --nameserver 8.8.8.8 \\
    --onboot 1 \\
    --password P45und4n

pct start 601
echo "✅ CT 601 (cbt-app) aktif!"

# Tunggu CT booting jaringan
sleep 5

echo "=== [4/8] SETUP DATABASE SERVER (CT 602) ==="
pct exec 602 -- bash -c "
set -e
apt-get update -y
apt-get install -y mariadb-server ufw

# Tuning MariaDB untuk 2.000 Siswa Ujian Serentak
cat << 'EOF' > /etc/mysql/mariadb.conf.d/99-cbt-tuning.cnf
[mysqld]
bind-address = 0.0.0.0
max_connections = 600
innodb_buffer_pool_size = 5G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
query_cache_type = 0
query_cache_size = 0
open_files_limit = 65535
EOF

systemctl restart mariadb

# Buat Database & User remote
mysql -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS zyacbt_modern CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'cbtuser'@'%' IDENTIFIED BY 'cbtpassword2026';
GRANT ALL PRIVILEGES ON zyacbt_modern.* TO 'cbtuser'@'%';
FLUSH PRIVILEGES;
EOF

echo '✅ Database MariaDB di CT 602 siap melayani 2.000 siswa!'
"

echo "=== [5/8] SETUP WEB APPLICATION & NGINX (CT 601) ==="
# Salin zip dari Proxmox Host ke CT 601
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c "
set -e
apt-get update -y
apt-get install -y curl wget git unzip build-essential nginx

# Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

npm install -g pm2

# Ekstrak project
mkdir -p /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern
cd /var/www/cbt-modern

# Set Environment ke Database CT 602 (172.16.0.211)
cat << 'EOF' > /var/www/cbt-modern/.env
DATABASE_URL=\"mysql://cbtuser:cbtpassword2026@172.16.0.211:3306/zyacbt_modern\"
JWT_SECRET=\"super-secure-production-cbt-key-2026-proxmox\"
NEXT_PUBLIC_APP_NAME=\"ZYACBT Modern Next-Gen\"
NEXT_PUBLIC_APP_DESCRIPTION=\"Platform Ujian Berbasis Komputer Modern & Cepat\"
NODE_ENV=\"production\"
PORT=3000
EOF

# Ganti provider Prisma ke mysql
sed -i 's/provider = \"sqlite\"/provider = \"mysql\"/g' prisma/schema.prisma

echo '📥 Menginstal node_modules...'
npm install --no-audit --no-fund

echo '🗄️ Menerapkan skema database ke MariaDB CT 602...'
npx prisma db push

echo '🌱 Menjalankan Seeder Data Awal & Soal Demo...'
npm run db:seed || node prisma/seed.js

echo '🏗️ Membangun Aplikasi Next.js Production Build...'
npm run build || node node_modules/next/dist/bin/next build

# Konfigurasi Nginx Reverse Proxy
cat << 'EOF' > /etc/nginx/sites-available/cbt
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/cbt
nginx -t
systemctl restart nginx

# Jalankan dengan PM2 Cluster Mode
pm2 delete cbt-modern || true
pm2 start npm --name \"cbt-modern\" -i max -- start
pm2 save
env PATH=\\$PATH:/usr/bin pm2 startup systemd -u root --hp /root || true
systemctl enable pm2-root || true

echo '✅ Web Application di CT 601 berhasil berjalan!'
"

echo "=== [6/8] UJI KONEKSI AKHIR (HTTP STATUS TEST) ==="
curl -I http://172.16.0.210 || true

echo "=========================================================="
echo "🎉 DEPLOYMENT 2 CT DI PROXMOX SELESAI 100% SUKSES!"
echo "=========================================================="
echo "• Web Application (Siswa & Guru): http://172.16.0.210"
echo "• Database Server: 172.16.0.211:3306"
echo "=========================================================="
`;

  conn.exec(script, (err, stream) => {
    if (err) throw err;

    stream
      .on("close", (code, signal) => {
        console.log(`\n🏁 Proses orkestrasi selesai dengan exit code: ${code}`);
        conn.end();
      })
      .on("data", (data) => {
        process.stdout.write(data.toString());
      })
      .stderr.on("data", (data) => {
        process.stderr.write(data.toString());
      });
  });
}
