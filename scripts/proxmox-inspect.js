const { Client } = require("ssh2");

const conn = new Client();

conn
  .on("ready", () => {
    console.log("✅ Terhubung ke Proxmox. Mengumpulkan informasi sistem...");

    const cmd = `
echo "=== SUDO TEST ==="
echo andika | sudo -S id

echo "=== PVE STORAGE STATUS ==="
echo andika | sudo -S pvesm status

echo "=== PVE CONTAINER TEMPLATES ==="
echo andika | sudo -S pveam list local
echo andika | sudo -S ls -lh /var/lib/vz/template/cache/

echo "=== EXISTING CONTAINERS ==="
echo andika | sudo -S pct list

echo "=== NETWORK BRIDGES ==="
echo andika | sudo -S cat /etc/network/interfaces | grep -E "^auto|^iface|bridge_ports|address|gateway"

echo "=== RAM & CPU HOST ==="
echo andika | sudo -S free -h
echo andika | sudo -S lscpu | grep "Model name\|CPU(s):"
`;

    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let output = "";
      stream
        .on("close", (code) => {
          console.log(output);
          conn.end();
        })
        .on("data", (d) => (output += d.toString()))
        .stderr.on("data", (d) => (output += d.toString()));
    });
  })
  .on("error", console.error)
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "andika",
    password: "andika",
  });
