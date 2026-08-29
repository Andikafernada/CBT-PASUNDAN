const { Client } = require("ssh2");

const conn = new Client();

conn
  .on("ready", () => {
    console.log("Terhubung ke Proxmox. Menjalankan discovery sebagai root...");

    conn.shell((err, stream) => {
      if (err) throw err;
      let output = "";
      let suSent = false;
      let passwordSent = false;
      let commandsSent = false;

      stream.on("data", (data) => {
        const str = data.toString();
        output += str;

        if (str.includes("Password:") && !passwordSent) {
          passwordSent = true;
          stream.write("andika\n");
        }

        if ((str.includes("root@") || str.includes("#")) && !commandsSent) {
          commandsSent = true;
          // Run discovery commands
          stream.write(`
echo "==SUDOERS=="
echo "andika ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/andika
chmod 440 /etc/sudoers.d/andika

echo "==STORAGE=="
pvesm status

echo "==TEMPLATES=="
pveam list local
ls -la /var/lib/vz/template/cache/

echo "==NETWORK=="
ip route show default
ip addr show vmbr0 || ip addr show

echo "==EXISTING_CTS=="
pct list

echo "==DISCOVERY_DONE=="
`);
        }

        if (output.includes("==DISCOVERY_DONE==")) {
          console.log(output);
          conn.end();
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
