const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

async function uploadDocxViaPctPush() {
  const localFilePath = path.join(__dirname, "../BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx");
  const hostTempPath = "/tmp/BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx";
  const containerDest = "/var/www/cbt-modern/public/BANK_SOAL_50_KOMPLET_MTK_ARAB_JEPANG.docx";

  const conn = new Client();
  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;
        const readStream = fs.createReadStream(localFilePath);
        const writeStream = sftp.createWriteStream(hostTempPath);

        writeStream.on("close", () => {
          console.log("Uploaded to host /tmp, now pushing to CT 601...");
          const cmd = `pct push 601 ${hostTempPath} ${containerDest} && pct exec 601 -- chmod 644 ${containerDest}`;
          conn.exec(cmd, (err, stream) => {
            if (err) throw err;
            stream.on("close", (code) => {
              console.log(`✅ pct push selesai dengan code: ${code}`);
              conn.end();
            });
            stream.on("data", (d) => process.stdout.write(d.toString()));
          });
        });

        readStream.pipe(writeStream);
      });
    })
    .connect({
      host: "172.16.0.177",
      port: 22,
      username: "root",
      password: "P45und4n",
    });
}

uploadDocxViaPctPush().catch(console.error);
