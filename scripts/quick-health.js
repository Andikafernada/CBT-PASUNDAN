const http = require("http");

function testQuestionHtml() {
  const req = http.request(new URL("/api/student/exams", "http://172.16.0.210"), { method: "GET" }, (res) => {
    console.log("Health check status:", res.statusCode);
  });
  req.end();
}

testQuestionHtml();
