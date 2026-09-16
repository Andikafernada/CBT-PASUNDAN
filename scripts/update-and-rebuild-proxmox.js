const { Client } = require("ssh2");
const path = require("path");

const conn = new Client();
console.log("🚀 Mengunggah update perbaikan login ke Proxmox CT 601...");

conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localZip = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern-ready.zip");
      const remoteZip = "/root/cbt-modern-ready.zip";

      sftp.fastPut(localZip, remoteZip, (upErr) => {
        if (upErr) throw upErr;
        console.log("✅ File zip berhasil diunggah ke Proxmox Host. Menerapkan ke CT 601...");

        const cmd = `
set -e
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern
sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma

echo "🏗️ Membangun ulang Next.js Production Build..."
npm run build

echo "⚡ Memuat ulang PM2 Cluster..."
pm2 reload all
pm2 save

echo "✅ Update selesai!"
'

echo "=== [TEST] SIMULASI LOGIN BROWSER MENGGUNAKAN COOKIE JAR ==="
# Test with cookie file like a real web browser (Chrome/Edge)
curl -s -c /tmp/cookies.txt -X POST http://172.16.0.210/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"admin","password":"admin123"}'

echo ""
echo "=== [TEST] PERIKSA COOKIE YANG TERSIMPAN ==="
cat /tmp/cookies.txt

echo "=== [TEST] AKSES /api/auth/me DENGAN COOKIE ==="
curl -s -b /tmp/cookies.txt http://172.16.0.210/api/auth/me
`;

        conn.exec(cmd, (execErr, stream) => {
          if (execErr) throw execErr;
          stream
            .on("close", (code) => {
              console.log(`\n🏁 Selesai dengan exit code: ${code}`);
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
