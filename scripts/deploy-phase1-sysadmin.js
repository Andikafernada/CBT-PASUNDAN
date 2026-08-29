const { Client } = require("ssh2");

const conn = new Client();
console.log("🚀 Menerapkan Sysadmin Hardening Phase 1 (Auto-Backup MariaDB & Nginx Rate Limiting)...");

conn
  .on("ready", () => {
    console.log("✅ Terhubung ke Proxmox Host.");

    const cmd = `
set -e

echo "=== 1. MENYIAPKAN OTOMASI BACKUP MARIADB DI CT 602 ==="
pct exec 602 -- bash -c '
mkdir -p /var/backups/cbt

cat << "EOF" > /root/auto-backup-cbt.sh
#!/bin/bash
set -e
BACKUP_DIR="/var/backups/cbt"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="zyacbt_backup_\${TIMESTAMP}.sql.gz"

# 1. Dump database with gzip compression
mysqldump -u root -pP45und4n --single-transaction --quick --lock-tables=false zyacbt_modern | gzip > "\${BACKUP_DIR}/\${FILENAME}"

# 2. Keep only last 24 backups (purge older than 6 hours)
find "\${BACKUP_DIR}" -type f -name "zyacbt_backup_*.sql.gz" -mmin +360 -delete

echo "[\$(date)] Auto-backup successful: \${FILENAME} (\$(du -h "\${BACKUP_DIR}/\${FILENAME}" | cut -f1))"
EOF

chmod +x /root/auto-backup-cbt.sh

# Run immediate backup test
/root/auto-backup-cbt.sh

# Setup crontab to run every 15 minutes
cat << "CRONEOF" > /etc/cron.d/cbt-backup
*/15 * * * * root /root/auto-backup-cbt.sh >> /var/log/cbt-backup.log 2>&1
CRONEOF

chmod 644 /etc/cron.d/cbt-backup
systemctl restart cron || true
ls -la /var/backups/cbt/
'

echo "=== 2. MENYIAPKAN NGINX RATE LIMITING & SECURITY DI CT 601 ==="
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

    # Rate limiting login endpoint
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

    # Rate limiting student answer autosave
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
echo "✅ Nginx rate limiting & security active!"
'

echo "=== 3. BACKUP SYNC KE PROXMOX HOST ==="
mkdir -p /root/cbt-host-backups
pct exec 602 -- bash -c 'cp -r /var/backups/cbt/* /tmp/' || true
`;

    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`\n🏁 Sysadmin Phase 1 selesai dengan code: ${code}`);
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
