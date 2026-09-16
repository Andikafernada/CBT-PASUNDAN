const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const sql = `
      UPDATE User SET createdAt = '2026-08-28 16:00:00.000', updatedAt = '2026-08-28 16:00:00.000' WHERE updatedAt IS NULL OR updatedAt < '2000-01-01';
      UPDATE \\\`Group\\\` SET createdAt = '2026-08-28 16:00:00.000', updatedAt = '2026-08-28 16:00:00.000' WHERE updatedAt IS NULL OR updatedAt < '2000-01-01';
      UPDATE Exam SET createdAt = '2026-08-28 16:00:00.000', updatedAt = '2026-08-28 16:00:00.000' WHERE updatedAt IS NULL OR updatedAt < '2000-01-01';
      UPDATE Question SET createdAt = '2026-08-28 16:00:00.000', updatedAt = '2026-08-28 16:00:00.000' WHERE updatedAt IS NULL OR updatedAt < '2000-01-01';
    `;
    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`Fix datetime selesai dengan code: ${code}`);
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
