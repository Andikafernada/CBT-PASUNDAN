const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      "pct exec 601 -- bash -c 'cd /var/www/cbt-modern && npx prisma db push --accept-data-loss'",
      (err, stream) => {
        if (err) throw err;
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.on("close", () => {
          console.log("✅ MariaDB Schema Synced via Prisma db push!");
          conn.end();
        });
      }
    );
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
