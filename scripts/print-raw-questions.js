const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "SELECT id, subjectId, type, content FROM Question ORDER BY createdAt DESC LIMIT 10;"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let data = "";
      stream
        .on("close", () => {
          console.log("=== RAW QUESTION CONTENTS ===");
          console.log(data);
          conn.end();
        })
        .on("data", (d) => (data += d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
