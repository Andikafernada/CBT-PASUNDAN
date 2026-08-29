const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const script = `
# 1. Update schema on CT 601
pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern
sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma || true
npx prisma generate
npx prisma db push --accept-data-loss
node prisma/seed.js
npm run build
pm2 reload all --update-env
pm2 save
'

# 2. Setup backup cron in CT 602
pct exec 602 -- bash -c '
mkdir -p /var/backups/cbt

cat << "BKEOF" > /root/auto-backup-cbt.sh
#!/bin/bash
BACKUP_DIR="/var/backups/cbt"
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
FILENAME="zyacbt_backup_\${TIMESTAMP}.sql.gz"
mysqldump -u root -pP45und4n --single-transaction --quick --lock-tables=false zyacbt_modern | gzip > "\${BACKUP_DIR}/\${FILENAME}"
find "\${BACKUP_DIR}" -type f -name "zyacbt_backup_*.sql.gz" -mmin +360 -delete
echo "[\$(date)] Auto-backup successful: \${FILENAME}"
BKEOF

chmod +x /root/auto-backup-cbt.sh
/root/auto-backup-cbt.sh

cat << "CRONEOF" > /etc/cron.d/cbt-backup
*/15 * * * * root /root/auto-backup-cbt.sh >> /var/log/cbt-backup.log 2>&1
CRONEOF

chmod 644 /etc/cron.d/cbt-backup
systemctl restart cron || true
ls -lh /var/backups/cbt/
'

# 3. Setup Nginx rate limit in CT 601
pct exec 601 -- bash -c '
cat << "NGINXEOF" > /etc/nginx/sites-available/cbt
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
NGINXEOF

nginx -t
systemctl restart nginx
'
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
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
