const { Client } = require("ssh2");

const conn = new Client();

console.log("🔌 Mencoba menghubungkan ke Proxmox VE (172.16.0.177:22) dengan user 'andika'...");

const timeout = setTimeout(() => {
  console.error("⏱️ Connection timeout ke 172.16.0.177 setelah 10 detik.");
  conn.end();
  process.exit(1);
}, 10000);

conn
  .on("ready", () => {
    clearTimeout(timeout);
    console.log("✅ Berhasil terhubung via SSH ke Proxmox VE!");
    conn.exec("pveversion -v || uname -a", (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code, signal) => {
          console.log(`Command selesai dengan exit code: ${code}`);
          conn.end();
        })
        .on("data", (data) => {
          console.log("Output Proxmox:\n" + data.toString());
        })
        .stderr.on("data", (data) => {
          console.error("STDERR:\n" + data.toString());
        });
    });
  })
  .on("error", (err) => {
    clearTimeout(timeout);
    console.error("❌ SSH Error:", err.message);
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "andika",
    password: "andika",
    readyTimeout: 10000,
  });
