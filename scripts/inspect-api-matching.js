const http = require("http");

const BASE_URL = "http://172.16.0.210";

function login(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password });
    const req = http.request(
      new URL("/api/auth/login", BASE_URL),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const rawCookies = res.headers["set-cookie"] || [];
          let tokenCookie = "";
          for (const c of rawCookies) {
            if (c.startsWith("cbt_token=")) {
              tokenCookie = c.split(";")[0];
              break;
            }
          }
          resolve({ status: res.statusCode, cookie: tokenCookie, body: JSON.parse(data || "{}") });
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function reqApi(path, cookie = "") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      new URL(path, BASE_URL),
      {
        method: "GET",
        headers: { ...(cookie ? { Cookie: cookie } : {}) },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data || "{}") });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function inspectLiveMatching() {
  const g = await login("guru1", "guru123");
  console.log("Guru login status:", g.status);

  const res = await reqApi("/api/admin/questions", g.cookie);
  const questions = res.body.questions || [];
  console.log(`Total questions in DB: ${questions.length}`);

  const matchings = questions.filter((q) => q.type === "MATCHING");
  console.log(`Found ${matchings.length} MATCHING questions:`);
  matchings.forEach((m, idx) => {
    console.log(`\n--- [#${idx + 1}] ---`);
    console.log("Content:", m.content);
    console.log("MatchingPairs:", m.matchingPairs);
    console.log("Options:", m.options);
  });
}

inspectLiveMatching().catch(console.error);
