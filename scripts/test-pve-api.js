const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function testPveAuth(username, password, realm) {
  const fullUser = `${username}@${realm}`;
  const postData = new URLSearchParams({
    username: fullUser,
    password: password,
  }).toString();

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "172.16.0.177",
        port: 8006,
        path: "/api2/json/access/ticket",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
        agent,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve({ status: res.statusCode, data, user: fullUser });
          } catch {
            resolve({ status: res.statusCode, body, user: fullUser });
          }
        });
      }
    );

    req.on("error", (err) => resolve({ error: err.message, user: fullUser }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log("🔍 Menguji autentikasi Proxmox API (Port 8006)...");

  const combos = [
    { u: "root", p: "andika", r: "pam" },
    { u: "andika", p: "andika", r: "pam" },
    { u: "andika", p: "andika", r: "pve" },
  ];

  for (const c of combos) {
    const res = await testPveAuth(c.u, c.p, c.r);
    console.log(`Test ${res.user}:`, res.status === 200 ? "✅ SUCCESS (Ticket Diperoleh!)" : "❌ Gagal (" + res.status + ")");
    if (res.status === 200) {
      console.log("   Token CSRF:", res.data?.data?.CSRFPreventionToken?.substring(0, 20) + "...");
      console.log("   Ticket:", res.data?.data?.ticket?.substring(0, 30) + "...");
    }
  }
}

run().catch(console.error);
