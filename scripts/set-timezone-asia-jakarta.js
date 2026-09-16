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

async function setTimezoneAsiaJakarta() {
  console.log("=================================================================");
  console.log("🌏 MENYINKRONKAN SISTEM KE ZONA WAKTU ASIA/JAKARTA (WIB - UTC+7)");
  console.log("=================================================================\n");

  // 1. Set Timezone on Host Proxmox
  console.log("1️⃣ Mengatur Timezone di Proxmox Host (172.16.0.177)...");
  await runSSH("timedatectl set-timezone Asia/Jakarta && ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime");
  const hostDate = await runSSH("date");
  console.log(`   Host Date: ${hostDate.stdout.trim()}`);

  // 2. Set Timezone on CT 601 (cbt-app)
  console.log("\n2️⃣ Mengatur Timezone di Container CT 601 (cbt-app)...");
  await runSSH(
    `pct exec 601 -- bash -c "timedatectl set-timezone Asia/Jakarta 2>/dev/null || ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime"`
  );
  await runSSH(
    `pct exec 601 -- bash -c "echo 'export TZ=Asia/Jakarta' >> /etc/profile; echo 'TZ=Asia/Jakarta' >> /etc/environment"`
  );
  const ct601Date = await runSSH("pct exec 601 -- date");
  console.log(`   CT 601 Date: ${ct601Date.stdout.trim()}`);

  // 3. Set Timezone on CT 602 (cbt-db MariaDB)
  console.log("\n3️⃣ Mengatur Timezone di Container CT 602 (cbt-db / MariaDB)...");
  await runSSH(
    `pct exec 602 -- bash -c "timedatectl set-timezone Asia/Jakarta 2>/dev/null || ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime"`
  );
  await runSSH(
    `pct exec 602 -- mariadb -u root -p'P45und4n' -e "SET GLOBAL time_zone = '+07:00'; SET time_zone = '+07:00'; SELECT NOW() as current_wib_time;"`
  );
  const ct602Date = await runSSH("pct exec 602 -- date");
  console.log(`   CT 602 Date: ${ct602Date.stdout.trim()}`);

  console.log("\n=================================================================");
  console.log("🎉 SELURUH HOST, CONTAINER, & DATABASE KINI MENGGUNAKAN ASIA/JAKARTA (WIB)!");
  console.log("=================================================================");
}

setTimezoneAsiaJakarta().catch(console.error);
