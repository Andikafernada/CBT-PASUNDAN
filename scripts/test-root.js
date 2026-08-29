const { Client } = require("ssh2");

// Test root with password 'andika'
const conn = new Client();

console.log("🔌 Menguji koneksi langsung sebagai 'root' dengan password 'andika'...");

conn
  .on("ready", () => {
    console.log("✅ BERHASIL LOGIN SEBAGAI ROOT!");
    conn.exec("pct list; pvesm status; pveam list local", (err, stream) => {
      if (err) throw err;
      stream
        .on("close", () => conn.end())
        .on("data", (d) => console.log(d.toString()))
        .stderr.on("data", (d) => console.error(d.toString()));
    });
  })
  .on("error", (err) => {
    console.error("❌ Root direct login gagal:", err.message);
    // Try su root via andika
    trySuRoot();
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "andika",
    readyTimeout: 10000,
  });

function trySuRoot() {
  console.log("🔌 Menguji 'su -' dari user 'andika'...");
  const conn2 = new Client();
  conn2
    .on("ready", () => {
      conn2.shell((err, stream) => {
        if (err) throw err;
        let buf = "";
        stream.on("data", (data) => {
          const str = data.toString();
          buf += str;
          if (str.includes("Password:")) {
            stream.write("andika\n");
          }
          if (buf.includes("root@") || buf.includes("#")) {
            console.log("✅ Berhasil beralih ke root via su!");
            stream.write("pvesm status\n");
            setTimeout(() => conn2.end(), 2000);
          }
        });
        stream.write("su -\n");
      });
    })
    .connect({
      host: "172.16.0.177",
      port: 22,
      username: "andika",
      password: "andika",
    });
}
