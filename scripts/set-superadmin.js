const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 601 -- bash -c "cd /var/www/cbt-modern && node -e '
        const { PrismaClient } = require(\\"@prisma/client\\");
        const bcrypt = require(\\"bcryptjs\\");
        const prisma = new PrismaClient();

        async function createOrUpdateSuperadmin() {
          const hashedPassword = await bcrypt.hash(\\"andika1\\", 10);
          
          // Upsert superadmin user 'andika1'
          const user = await prisma.user.upsert({
            where: { username: \\"andika1\\" },
            update: {
              password: hashedPassword,
              role: \\"ADMIN\\",
              name: \\"Super Administrator\\",
              isActive: true,
              isLoginLocked: false,
            },
            create: {
              username: \\"andika1\\",
              password: hashedPassword,
              role: \\"ADMIN\\",
              name: \\"Super Administrator\\",
              isActive: true,
              isLoginLocked: false,
            },
          });

          console.log("✅ Superadmin berhasil diupdate/dibuat:", user.username, "Role:", user.role);
        }

        createOrUpdateSuperadmin();
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
