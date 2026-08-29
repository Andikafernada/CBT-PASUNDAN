const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 601 -- bash -c "cd /var/www/cbt-modern && node -e '
        const { PrismaClient } = require(\\"@prisma/client\\");
        const prisma = new PrismaClient();
        prisma.user.findMany({
          take: 10,
          select: { id: true, username: true, role: true, name: true }
        }).then(users => console.log(JSON.stringify(users, null, 2)));
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
