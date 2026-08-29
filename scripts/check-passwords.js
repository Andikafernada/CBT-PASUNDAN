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
          const u = await prisma.user.findUnique({ where: { username: \\"andika\\" } });
          const u2 = await prisma.user.findUnique({ where: { username: \\"andikaa\\" } });
          const u3 = await prisma.user.findUnique({ where: { username: \\"tkjd1\\" } });
          console.log(\\"andika matches 123?\\", u ? await bcrypt.compare(\\"123\\", u.password) : false);
          console.log(\\"andikaa matches 123?\\", u2 ? await bcrypt.compare(\\"123\\", u2.password) : false);
          console.log(\\"tkjd1 matches 123?\\", u3 ? await bcrypt.compare(\\"123\\", u3.password) : false);
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
