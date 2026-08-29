const { Client } = require("ssh2");

const config = {
  host: "172.16.0.177",
  port: 22,
  username: "root",
  password: "P45und4n",
};

function runSSH(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(cmd, (err, stream) => {
          if (err) return reject(err);
          let stdout = "";
          let stderr = "";
          stream
            .on("close", (code) => {
              conn.end();
              resolve({ code, stdout, stderr });
            })
            .on("data", (data) => (stdout += data))
            .stderr.on("data", (data) => (stderr += data));
        });
      })
      .on("error", reject)
      .connect(config);
  });
}

async function pushDb() {
  console.log("Pushing updated schema to MariaDB...");
  const res = await runSSH(`pct exec 601 -- bash -c "cd /var/www/cbt-modern && npx prisma db push && npx prisma generate"`);
  console.log(res.stdout);
  console.log(res.stderr);
}

pushDb().catch(console.error);
