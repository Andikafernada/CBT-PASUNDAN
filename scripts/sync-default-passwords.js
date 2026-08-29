const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 601 -- bash -c "cd /var/www/cbt-modern && node -e '
        const { PrismaClient } = require(\\"@prisma/client\\");
        const bcrypt = require(\\"bcryptjs\\");
        const prisma = new PrismaClient();
        async function run() {
          const hash123 = await bcrypt.hash(\\"123\\", 10);
          const res = await prisma.user.updateMany({
            where: {
              role: { in: [\\"TEACHER\\", \\"STUDENT\\"] }
            },
            data: { password: hash123 }
          });
          console.log(\\"Berhasil mereset password default 123 untuk user:\\", res.count);
        }
        run();
      '"`,
      (err, stream) => {
        if (err) throw err;
        stream.on("close", () => conn.end());
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
      }
    );
  })
  .connect({ host: "172.16.0.177", port: 22, username: "root", password: "P45und4n" });
