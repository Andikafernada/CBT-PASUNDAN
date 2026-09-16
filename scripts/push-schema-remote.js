const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("✅ SSH Connected ke Proxmox 172.16.0.177");

    const cmd = `pct exec 601 -- bash -c 'cd /var/www/cbt-modern && npx prisma db push --accept-data-loss 2>&1'`;

    console.log("🔄 Menjalankan prisma db push di CT 601...\n");

    conn.exec(cmd, (execErr, stream) => {
      if (execErr) {
        console.error("❌ Exec Error:", execErr.message);
        conn.end();
        return;
      }
      stream
        .on("close", (code) => {
          console.log(`\n🏁 db push selesai dengan code: ${code}`);
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .on("error", (err) => {
    console.error("❌ SSH Connection Error:", err.message);
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
    readyTimeout: 30000,
  });
