const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const localFilePath = path.join(__dirname, "../scripts/set-root-user.js");
const hostTempPath = "/tmp/set-root-user.js";
const containerDest = "/var/www/cbt-modern/scripts/set-root-user.js";

const conn = new Client();
conn
  .on("ready", () => {
    conn.sftp((err, sftp) => {
      if (err) throw err;
      const readStream = fs.createReadStream(localFilePath);
      const writeStream = sftp.createWriteStream(hostTempPath);

      writeStream.on("close", () => {
        const cmd = `
          pct push 601 ${hostTempPath} ${containerDest} &&
          pct exec 601 -- bash -c "cd /var/www/cbt-modern && node scripts/set-root-user.js"
        `;
        conn.exec(cmd, (err, stream) => {
          if (err) throw err;
          stream.on("close", (code) => {
            console.log(`Execution finished with code: ${code}`);
            conn.end();
          });
          stream.on("data", (d) => process.stdout.write(d.toString()));
          stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
        });
      });

      readStream.pipe(writeStream);
    });
  })
  .connect({ host: "172.16.0.177", port: 22, username: "root", password: "P45und4n" });
