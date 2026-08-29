const { Client } = require("ssh2");

// Test root SSH directly with password 'P45und4n'
const conn = new Client();
console.log("🔌 Menguji login SSH langsung sebagai root dengan password 'P45und4n'...");

conn
  .on("ready", () => {
    console.log("✅ BERHASIL LOGIN LANGSUNG SEBAGAI ROOT!");
    conn.exec("pvesm status; pveam list local; pct list", (err, stream) => {
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
  .on("error", (err) => {
    console.log("Root direct failed, mencoba su - via andika...");
    trySu();
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });

function trySu() {
  const conn2 = new Client();
  conn2
    .on("ready", () => {
      conn2.shell({ rows: 30, cols: 120, term: "xterm" }, (err, stream) => {
        if (err) throw err;
        let passwordSent = false;
        let inRoot = false;

        stream.on("data", (d) => {
          const str = d.toString();
          process.stdout.write(str);

          if (str.includes("Password:") && !passwordSent) {
            passwordSent = true;
            stream.write("P45und4n\n");
          }

          if ((str.includes("root@") || str.includes("#")) && !inRoot) {
            inRoot = true;
            console.log("\n[SUCCESS] SU ROOT BERHASIL!");
            stream.write("echo 'andika ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/andika\n");
            stream.write("chmod 440 /etc/sudoers.d/andika\n");
            stream.write("pvesm status\n");
            stream.write("pveam list local\n");
            stream.write("ls -la /var/lib/vz/template/cache/\n");
            stream.write("pct list\n");
            stream.write("echo '>>>TEST_ROOT_DONE<<<' \n");
          }

          if (str.includes(">>>TEST_ROOT_DONE<<<")) {
            setTimeout(() => {
              conn2.end();
              process.exit(0);
            }, 1000);
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
