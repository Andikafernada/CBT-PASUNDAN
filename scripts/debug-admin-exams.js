const http = require("http");

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://172.16.0.210");
    const req = http.request(
      url,
      { method: options.method || "GET", headers: options.headers || {} },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data || "{}") }));
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function debug() {
  const login = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" } }, { username: "admin", password: "admin123", deviceFingerprint: "DEBUG" });
  const rawCookie = login.headers["set-cookie"];
  const cookieStr = Array.isArray(rawCookie) ? rawCookie.map((c) => c.split(";")[0]).join("; ") : rawCookie?.split(";")[0];

  const exams = await request("/api/admin/exams", { headers: { Cookie: cookieStr } });
  console.log("EXAMS RESPONSE:", JSON.stringify(exams.body, null, 2));
}

debug();
