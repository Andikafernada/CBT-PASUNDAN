const { Client } = require("ssh2");
const path = require("path");

const conn = new Client();
console.log("🚀 Menerapkan FASE 2 (Analisis Butir Soal, Token Dinamis, Cetak Dokumen) ke Proxmox...");

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localZip = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern-ready.zip");
      const remoteZip = "/root/cbt-modern-ready.zip";

      sftp.fastPut(localZip, remoteZip, (upErr) => {
        if (upErr) throw upErr;
        console.log("✅ File zip terunggah. Memperbarui CT 601...");

        const cmd = `
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern

echo "🔄 Prisma Generate & DB Sync..."
npx prisma generate
npx prisma db push --accept-data-loss

echo "🏗️ Membangun Next.js Production..."
npm run build

echo "⚡ Reload PM2 Cluster..."
pm2 reload all --update-env
pm2 save

echo "🎉 FASE 2 BERHASIL DI-DEPLOY!"
'
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
