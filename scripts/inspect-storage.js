const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    const cmd = `
echo "=== PVE STORAGE STATUS ==="
pvesm status
echo "=== NETWORK INTERFACES ==="
cat /etc/network/interfaces
echo "=== IP ROUTE ==="
ip route show default
`;
    conn.exec(cmd, (err, stream) => {
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
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
