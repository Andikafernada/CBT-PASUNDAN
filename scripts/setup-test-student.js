const { Client } = require("ssh2");

const conn = new Client();
conn
  .on("ready", () => {
    console.log("Connected to Proxmox");
    // Ensure Group and Student exist
    const sql = `
      INSERT IGNORE INTO \\\`Group\\\` (id, code, name, description, createdAt, updatedAt) 
      VALUES ('grp_tkj1', 'XII-TKJ-1', 'XII Teknik Komputer Jaringan 1', 'Kelas Uji', NOW(3), NOW(3));

      INSERT INTO User (id, username, password, name, role, groupId, createdAt, updatedAt) 
      VALUES ('stu_test1', 'siswa1', '123', 'Budi Santoso (Siswa Uji)', 'STUDENT', 'grp_tkj1', NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE password='123', role='STUDENT', groupId='grp_tkj1', updatedAt=NOW(3);

      UPDATE Exam SET isPublished=1, durationMinutes=60 WHERE code='MKK2' OR code='BKJBKBJ';

      INSERT IGNORE INTO ExamGroup (id, examId, groupId)
      SELECT CONCAT('eg_', e.id, '_grp_tkj1'), e.id, 'grp_tkj1' FROM Exam e;
    `;

    const cmd = `pct exec 602 -- mysql -u cbtuser -pcbtpassword2026 zyacbt_modern -e "${sql}"`;
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream
        .on("close", (code) => {
          console.log(`Setup student selesai dengan code: ${code}`);
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
