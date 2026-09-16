const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("Testing sudo execution...");
    const cmd = `
echo "=== SUDO PRIVILEGE ==="
sudo id

echo "=== STORAGE STATUS ==="
sudo pvesm status

echo "=== TEMPLATES AVAILABLE ==="
sudo pveam list local
sudo ls -la /var/lib/vz/template/cache/

echo "=== DEFAULT GATEWAY & NETWORK ==="
sudo ip route show default
sudo ip addr show vmbr0

echo "=== EXISTING LXC CONTAINERS ==="
sudo pct list

echo "=== HOST RESOURCES ==="
sudo free -m
sudo lscpu | grep "Model name\|CPU(s):"
`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      let out = "";
      stream
        .on("close", (code) => {
          console.log(out);
          conn.end();
        })
        .on("data", (d) => (out += d.toString()))
        .stderr.on("data", (d) => (out += d.toString()));
    });
  })
  .on("error", console.error)
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "andika",
    password: "andika",
  });
