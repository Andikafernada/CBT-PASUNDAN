const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("Connected to Proxmox");
    // Attach questions of MKK 2 to exams that have 0 questions
    const sql = `
      INSERT INTO ExamQuestion (id, examId, questionId, orderIndex, score)
      SELECT 
        CONCAT('eq_', e.id, '_', q.id) as id,
        e.id as examId,
        q.id as questionId,
        1 as orderIndex,
        q.points as score
      FROM Exam e
      JOIN Question q ON e.subjectId = q.subjectId
      LEFT JOIN ExamQuestion eq ON eq.examId = e.id AND eq.questionId = q.id
      WHERE eq.id IS NULL;
    `;

    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`Sync exam questions selesai dengan code: ${code}`);
          conn.end();
        })
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .connect({
    host: "172.16.0.177",
    port: 22,
    username: "root",
    password: "P45und4n",
  });
