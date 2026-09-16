const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 602 -- mysql -u root -pP45und4n -e "USE zyacbt_modern; UPDATE User SET deviceFingerprint = NULL, isLoginLocked = 0; DELETE FROM ExamAnswer; DELETE FROM ExamSession;"`,
      (err, stream) => {
        if (err) throw err;
        stream.on("close", () => {
          console.log("✅ MariaDB Users deviceFingerprint & sessions reset clean!");
          conn.end();
        });
      }
    );
  })
  .on("error", (e) => console.error(e))
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
    readyTimeout: 30000,
  });
