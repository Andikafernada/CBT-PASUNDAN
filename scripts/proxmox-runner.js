const { Client } = require("ssh2");

const conn = new Client();

conn
  .on("ready", () => {
    console.log("Connected to SSH. Elevating to root via su - ...");
    conn.shell({ rows: 40, cols: 140, term: "xterm" }, (err, stream) => {
      if (err) throw err;
      let passwordSent = false;
      let inRoot = false;

      stream.on("data", (d) => {
        const text = d.toString();
        process.stdout.write(text);

        if (text.includes("Password:") && !passwordSent) {
          passwordSent = true;
          setTimeout(() => {
            stream.write("andika\n");
          }, 300);
        }

        if ((text.includes("root@node1") || text.includes("root@")) && !inRoot) {
          inRoot = true;
          console.log("\n[SUCCESS] Root shell active! Executing discovery...\n");
          setTimeout(() => {
            stream.write("pvesm status\n");
            stream.write("pveam list local\n");
            stream.write("ls -lh /var/lib/vz/template/cache/\n");
            stream.write("pct list\n");
            stream.write("ip route show default\n");
            stream.write("ip -4 addr show vmbr0\n");
            stream.write("free -h\n");
            stream.write("lscpu | grep 'Model name\\|CPU(s):'\n");
            stream.write("echo '>>>DISCOVERY_DONE<<<'\n");
          }, 500);
        }

        if (text.includes(">>>DISCOVERY_DONE<<<")) {
          setTimeout(() => {
            conn.end();
            process.exit(0);
          }, 1500);
        }
      });

      // Start by requesting su -
      setTimeout(() => {
        stream.write("su -\n");
      }, 500);
    });
  })
  .on("error", console.error)
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "andika",
    password: "andika",
  });
