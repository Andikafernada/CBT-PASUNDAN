const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "UPDATE User SET password='123' WHERE username='P45und4n'; SELECT id, username, role, name, password FROM User;"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", () => conn.end())
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
