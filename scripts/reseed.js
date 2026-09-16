const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `
pct exec 601 -- bash -c '
cd /var/www/cbt-modern
node prisma/seed.js
'
`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", () => {
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
