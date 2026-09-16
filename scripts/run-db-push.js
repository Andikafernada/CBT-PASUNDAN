const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      'pct exec 601 -- bash -c "cd /var/www/cbt-modern && npx prisma db push"',
      (err, stream) => {
        if (err) throw err;
        stream.on("close", (code) => {
          console.log(`Prisma DB Push finished with code: ${code}`);
          conn.end();
        });
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
      }
    );
  })
  .connect({ host: "172.16.0.177", port: 22, username: "root", password: "P45und4n" });
