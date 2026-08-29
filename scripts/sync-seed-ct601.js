const { Client } = require("ssh2");
const path = require("path");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("✅ SSH Terhubung.");
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const localZip = path.resolve("C:/Users/User/.gemini/antigravity/scratch/cbt-modern-ready.zip");
      const remoteZip = "/root/cbt-modern-ready.zip";

      sftp.fastPut(localZip, remoteZip, (upErr) => {
        if (upErr) throw upErr;
        console.log("✅ File zip terkirim.");
        const cmd = `
pct push 601 /root/cbt-modern-ready.zip /root/cbt-modern-ready.zip

pct exec 601 -- bash -c '
cd /var/www/cbt-modern
unzip -o /root/cbt-modern-ready.zip -d /var/www/cbt-modern
sed -i "s/provider = \\"sqlite\\"/provider = \\"mysql\\"/g" prisma/schema.prisma || true

node -e "
const { PrismaClient } = require(\\"@prisma/client\\");
const prisma = new PrismaClient();
async function clean() {
  await prisma.examAnswer.deleteMany({});
  await prisma.examSession.deleteMany({});
  console.log(\\"✅ Sesi database dibersihkan!\\");
  await prisma.\\$disconnect();
}
clean();
"

node prisma/seed.js
pm2 reload all
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
  .on("error", (err) => {
    console.error("SSH Error:", err);
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
    readyTimeout: 30000,
  });
