const { Client } = require("ssh2");
const path = require("path");

const conn = new Client();
console.log("🚀 Menerapkan perbaikan validasi token & resume session ke Proxmox CT 601...");

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
set -e
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c '
set -e
cd /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern
sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma || true

echo "🧹 Mereset sesi ujian uji coba agar siswa bisa mulai dari awal..."
node -e "
const { PrismaClient } = require(\\"@prisma/client\\");
const prisma = new PrismaClient();
async function clean() {
  await prisma.examAnswer.deleteMany({});
  await prisma.examViolationLog.deleteMany({});
  await prisma.examSession.deleteMany({});
  console.log(\\"✅ Sesi ujian bersih!\\");
  await prisma.\\$disconnect();
}
clean();
"

echo "🏗️ Membangun Next.js..."
npm run build

echo "⚡ Reload PM2..."
pm2 reload all
pm2 save
'

echo "=== [TEST] PENGUJIAN OTOMATIS TOKEN UJIAN & RESUME SESSION ==="
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
