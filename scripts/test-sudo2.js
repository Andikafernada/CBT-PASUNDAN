const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("Menjalankan discovery dengan sudo -S...");
    const cmd = `
echo andika | sudo -S sh -c "
echo '=== SUDO USER ==='
id
echo '=== STORAGE STATUS ==='
pvesm status
echo '=== TEMPLATES AVAILABLE ==='
pveam list local
ls -la /var/lib/vz/template/cache/
echo '=== NETWORK & ROUTING ==='
ip route show default
ip addr show vmbr0 || ip a
echo '=== EXISTING LXC CONTAINERS ==='
pct list
echo '=== HOST RESOURCES ==='
free -m
lscpu | grep 'Model name\|CPU(s):'
"
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
