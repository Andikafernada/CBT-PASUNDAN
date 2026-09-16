const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `
pct exec 601 -- bash -c '
cd /var/www/cbt-modern
pm2 delete all || true
pm2 start node_modules/next/dist/bin/next --name "cbt-modern" -i max -- start -p 3000
pm2 save
sleep 5
pm2 status
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1
'
`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let out = "";
      stream
        .on("close", () => {
          console.log(out);
          conn.end();
        })
        .on("data", (d) => (out += d.toString()))
        .stderr.on("data", (d) => (out += d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
