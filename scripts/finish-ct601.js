const { Client } = require("ssh2");

const conn = new Client();
console.log("🚀 Menyelesaikan konfigurasi akhir CT 601 (App) & CT 602 (DB)...");

conn
  .on("ready", () => {
    console.log("✅ Terhubung ke Proxmox sebagai ROOT.");

    const script = `
set -e

# Buat file skrip instalasi bersih di dalam CT 601
pct exec 601 -- bash -c 'cat << "EOF" > /root/run-build.sh
#!/bin/bash
set -e
cd /var/www/cbt-modern

# 1. Update Environment Variables
cat << "ENVEOF" > .env
DATABASE_URL="mysql://cbtuser:cbtpassword2026@172.16.0.211:3306/zyacbt_modern"
JWT_SECRET="super-secure-production-cbt-key-2026-proxmox"
NEXT_PUBLIC_APP_NAME="ZYACBT Modern Next-Gen"
NEXT_PUBLIC_APP_DESCRIPTION="Platform Ujian Berbasis Komputer Modern & Cepat"
NODE_ENV="production"
PORT=3000
ENVEOF

# 2. Update Prisma Provider
sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma

# 3. Install NPM Dependencies
echo "📦 Menginstal dependensi Node.js..."
npm install --no-audit --no-fund

# 4. Generate Prisma Client & Push Schema ke CT 602
echo "🗄️ Menghubungkan dan menerapkan skema database ke CT 602 (172.16.0.211)..."
npx prisma generate
npx prisma db push --accept-data-loss

# 5. Seeding Data Demo
echo "🌱 Menjalankan seeder awal..."
node prisma/seed.js || true

# 6. Next.js Production Build
echo "🏗️ Membangun Next.js Production..."
npm run build

# 7. Konfigurasi Nginx Reverse Proxy
echo "🌐 Menyiapkan Nginx Reverse Proxy..."
cat << "NGINXEOF" > /etc/nginx/sites-available/cbt
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
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
NGINXEOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/cbt
nginx -t
systemctl restart nginx

# 8. Start PM2 Cluster
echo "⚡ Menjalankan PM2 Cluster Mode..."
pm2 delete cbt-modern || true
pm2 start npm --name "cbt-modern" -i max -- start
pm2 save
env PATH=\\$PATH:/usr/bin pm2 startup systemd -u root --hp /root || true
systemctl enable pm2-root || true

echo "✅ SELESAI!"
EOF
chmod +x /root/run-build.sh
bash /root/run-build.sh
'

echo "=== [TEST] MENGUJI KONEKSI HTTP DARI PROXMOX HOST KE CT 601 ==="
sleep 3
curl -I http://172.16.0.210

echo "=========================================================="
echo "🎉 DEPLOYMENT 2 CT DI PROXMOX SUDAH SELESAI 100%!"
echo "=========================================================="
`;

    conn.exec(script, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`\n🏁 Selesai dengan code: ${code}`);
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .on("error", console.error)
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
