const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const sql = `UPDATE User SET password='123', isLoginLocked=0, deviceFingerprint=NULL WHERE role='STUDENT';`;
    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", () => {
          console.log("All student passwords reset to 123 and unlocked");
          conn.end();
        })
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
