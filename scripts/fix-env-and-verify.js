const { Client } = require("ssh2");

const conn = new Client();
console.log("🚀 Memperbaiki .env dan database connection di CT 601...");

conn
  .on("ready", () => {
    const cmd = `
pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern

cat << "EOF" > .env
DATABASE_URL="mysql://cbtuser:cbtpassword2026@172.16.0.211:3306/zyacbt_modern"
JWT_SECRET="super-secure-production-cbt-key-2026-proxmox"
NEXT_PUBLIC_APP_NAME="ZYACBT Modern Next-Gen"
NEXT_PUBLIC_APP_DESCRIPTION="Platform Ujian Berbasis Komputer Modern & Cepat"
NODE_ENV="production"
PORT=3000
EOF

sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma || true

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "🌱 Menjalankan Seeding User & Ujian..."
node prisma/seed.js

echo "⚡ Reload PM2 Cluster..."
pm2 reload all --update-env
pm2 save
'
`;

    conn.exec(cmd, (err, stream) => {
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
