const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("Connected to Proxmox");
    const sql = `
      ALTER TABLE Question ADD COLUMN IF NOT EXISTS createdByUserId VARCHAR(191) NULL;
      ALTER TABLE Question ADD INDEX IF NOT EXISTS (createdByUserId);
    `;
    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`Alter table Question selesai dengan code: ${code}`);
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
