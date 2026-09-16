const http = require("http");

async function run() {
  const login = async (username, password) => {
    const loginData = JSON.stringify({ username, password });
    return new Promise((resolve) => {
      const req = http.request(
        "http://172.16.0.210/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(loginData),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            const cookie = res.headers["set-cookie"] ? res.headers["set-cookie"][0].split(";")[0] : null;
            resolve({ status: res.statusCode, cookie, data });
          });
        }
      );
      req.write(loginData);
      req.end();
    });
  };

  const get = (url, cookie) =>
    new Promise((resolve) => {
      http.get("http://172.16.0.210" + url, { headers: { Cookie: cookie } }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });
    });

  // 1. Login Teacher andika
  const tLogin = await login("andika", "andika");
  console.log("Teacher andika login status:", tLogin.status);

  if (tLogin.cookie) {
    const tQuestions = await get("/api/admin/questions", tLogin.cookie);
    console.log(`Teacher andika visible questions: ${tQuestions.questions?.length}`);
    const isExclusivelyMine = tQuestions.questions?.every((q) => q.createdBy?.username === "andika");
    console.log(`Are ALL questions authored exclusively by andika? ${isExclusivelyMine ? "✅ YA (100% Terisolasi Privasi)" : "❌ Tidak"}`);
  }

  // 2. Login Superuser root
  const aLogin = await login("root", "P45und4n2");
  console.log("\nSuperuser root login status:", aLogin.status);
  if (aLogin.cookie) {
    const aQuestions = await get("/api/admin/questions", aLogin.cookie);
    console.log(`Superuser root visible questions across all school: ${aQuestions.questions?.length}`);
  }
}

run().catch(console.error);
