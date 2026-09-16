const { Client } = require("ssh2");
const path = require("path");

const conn = new Client();
console.log("🚀 Menerapkan FASE 1 secara menyeluruh ke Proxmox...");

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localZip = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern-ready.zip");
      const remoteZip = "/root/cbt-modern-ready.zip";

      sftp.fastPut(localZip, remoteZip, (upErr) => {
        if (upErr) throw upErr;
        console.log("✅ File zip terunggah. Memperbarui CT 601 & CT 602...");

        const cmd = `
set -e
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern

cat << "EOF" > .env
DATABASE_URL="mysql://cbtuser:cbtpassword2026@172.16.0.211:3306/zyacbt_modern"
JWT_SECRET="super-secure-production-cbt-key-2026-proxmox"
NEXT_PUBLIC_APP_NAME="ZYACBT Modern Next-Gen"
NEXT_PUBLIC_APP_DESCRIPTION="Platform Ujian Berbasis Komputer Modern & Cepat"
NODE_ENV="production"
PORT=3000
EOF

sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma || true

echo "🔄 Menerapkan Skema Prisma Terbaru (Single Device Lock & Audit Log)..."
npx prisma generate
npx prisma db push --accept-data-loss

echo "🌱 Menjalankan Seeder Data..."
node prisma/seed.js

echo "🏗️ Membangun Next.js Production..."
npm run build

echo "⚡ Reload PM2 Cluster..."
pm2 reload all --update-env
pm2 save
'

echo "=== MENYIAPKAN OTOMASI BACKUP MARIADB DI CT 602 ==="
pct exec 602 -- bash -c '
mkdir -p /var/backups/cbt

cat << "EOF" > /root/auto-backup-cbt.sh
#!/bin/bash
set -e
BACKUP_DIR="/var/backups/cbt"
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
FILENAME="zyacbt_backup_\${TIMESTAMP}.sql.gz"

mysqldump -u root -pP45und4n --single-transaction --quick --lock-tables=false zyacbt_modern | gzip > "\${BACKUP_DIR}/\${FILENAME}"
find "\${BACKUP_DIR}" -type f -name "zyacbt_backup_*.sql.gz" -mmin +360 -delete
echo "[\$(date)] Auto-backup successful: \${FILENAME} (\$(du -h "\${BACKUP_DIR}/\${FILENAME}" | cut -f1))"
EOF

chmod +x /root/auto-backup-cbt.sh
/root/auto-backup-cbt.sh

cat << "CRONEOF" > /etc/cron.d/cbt-backup
*/15 * * * * root /root/auto-backup-cbt.sh >> /var/log/cbt-backup.log 2>&1
CRONEOF

chmod 644 /etc/cron.d/cbt-backup
systemctl restart cron || true
ls -la /var/backups/cbt/
'

echo "=== MENYIAPKAN NGINX RATE LIMITING DI CT 601 ==="
pct exec 601 -- bash -c '
cat << "EOF" > /etc/nginx/sites-available/cbt
limit_req_zone $binary_remote_addr zone=loginlimit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=apilimit:10m rate=40r/s;

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    location /api/auth/login {
        limit_req zone=loginlimit burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/student/ {
        limit_req zone=apilimit burst=60 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t
systemctl restart nginx
'

echo "=========================================================="
echo "🎉 DEPLOYMENT FASE 1 SELESAI 100%!"
echo "=========================================================="
`;

        conn.exec(cmd, (execErr, stream) => {
          if (execErr) throw execErr;
          stream
            .on("close", (code) => {
              console.log(`\n🏁 Selesai dengan code: ${code}`);
              conn.end();
            })
            .on("data", (d) => process.stdout.write(d.toString()))
            .stderr.on("data", (d) => process.stderr.write(d.toString()));
        });
      });
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
