const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 601 -- bash -c "cd /var/www/cbt-modern && node -e '
        const { PrismaClient } = require(\\"@prisma/client\\");
        const bcrypt = require(\\"bcryptjs\\");
        const prisma = new PrismaClient();

        async function createRootSuperuser() {
          const hashedPassword = await bcrypt.hash(\\"P45und4n2\\", 10);

          const user = await prisma.user.upsert({
            where: { username: \\"root\\" },
            update: {
              password: hashedPassword,
              plainPassword: \\"P45und4n2\\",
              role: \\"ADMIN\\",
              name: \\"Super Administrator (Root)\\",
              isActive: true,
              isLoginLocked: false,
            },
            create: {
              username: \\"root\\",
              password: hashedPassword,
              plainPassword: \\"P45und4n2\\",
              role: \\"ADMIN\\",
              name: \\"Super Administrator (Root)\\",
              isActive: true,
              isLoginLocked: false,
            },
          });

          console.log(\\"✅ Superuser root berhasil dibuat/diupdate:\\", user.username, \\"Role:\\", user.role);
        }

        createRootSuperuser().finally(() => prisma.\\$disconnect());
      '"`,
      (err, stream) => {
        if (err) throw err;
        stream.on("close", (code) => {
          console.log(`Execution finished with code: ${code}`);
          conn.end();
        });
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
      }
    );
  })
  .connect({ host: "172.16.0.177", port: 22, username: "root", password: "P45und4n" });
