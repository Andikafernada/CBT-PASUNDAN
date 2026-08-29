const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `pct exec 602 -- mysql -u root -pP45und4n -e "USE zyacbt_modern; SHOW TABLES;"`,
      (err, stream) => {
        if (err) throw err;
        stream.on("data", (d) => process.stdout.write(d.toString()));
        stream.on("close", () => {
          conn.end();
        });
      }
    );
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
