const { Client } = require("ssh2");

function runRootCommands(commands, onDone) {
  const conn = new Client();
  conn
    .on("ready", () => {
      conn.shell({ rows: 30, cols: 120, term: "xterm" }, (err, stream) => {
        if (err) throw err;
        let buf = "";
        let authed = false;

        stream.on("data", (data) => {
          const str = data.toString();
          buf += str;

          if (str.includes("Password:") && !authed) {
            authed = true;
            stream.write("andika\n");
            setTimeout(() => {
              // Now we are root
              commands.forEach((c) => stream.write(c + "\n"));
              stream.write("echo '___COMMANDS_FINISHED___'\n");
            }, 1000);
          }

          if (buf.includes("___COMMANDS_FINISHED___")) {
            console.log(buf);
            conn.end();
            if (onDone) onDone(buf);
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

runRootCommands([
  "echo 'andika ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/andika",
  "chmod 440 /etc/sudoers.d/andika",
  "pvesm status",
  "pveam list local",
  "ls -la /var/lib/vz/template/cache/",
  "ip route show default",
  "ip addr show vmbr0 || ip a",
  "pct list",
  "free -m",
  "lscpu | grep 'Model name\\|CPU(s):'",
]);
