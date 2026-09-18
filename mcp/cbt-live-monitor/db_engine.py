import os
import json
import pymysql
from datetime import datetime

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "host": "172.16.0.211",
        "port": 3306,
        "user": "cbtuser",
        "password": "cbtpassword2026",
        "database": "zyacbt_modern"
    }

def get_connection():
    cfg = load_config()
    return pymysql.connect(
        host=cfg.get("host", "172.16.0.211"),
        port=int(cfg.get("port", 3306)),
        user=cfg.get("user", "cbtuser"),
        password=cfg.get("password", "cbtpassword2026"),
        database=cfg.get("database", "zyacbt_modern"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

from decimal import Decimal

def _serialize_val(v):
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    elif isinstance(v, Decimal):
        return int(v) if v % 1 == 0 else float(v)
    elif isinstance(v, dict):
        return {k: _serialize_val(val) for k, val in v.items()}
    elif isinstance(v, list):
        return [_serialize_val(item) for item in v]
    elif isinstance(v, (int, float, str, bool)) or v is None:
        return v
    return str(v)

def _serialize_row(row):
    """Convert datetime, decimal, and nested objects to JSON-serializable types"""
    if not row:
        return row
    return {k: _serialize_val(v) for k, v in row.items()}


def get_active_exams():
    """Mengambil daftar ujian yang aktif/dipublikasikan beserta statistik peserta live"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
            SELECT 
                e.id, e.title, e.code, e.token, e.durationMinutes, 
                e.startTime, e.endTime, e.isPublished, e.requireKioskBrowser, 
                e.maxViolations, e.category,
                s.name as subjectName,
                (SELECT COUNT(*) FROM ExamSession es WHERE es.examId = e.id) as totalParticipants,
                (SELECT COUNT(*) FROM ExamSession es WHERE es.examId = e.id AND es.status = 'IN_PROGRESS') as activeStudents,
                (SELECT COUNT(*) FROM ExamSession es WHERE es.examId = e.id AND es.status = 'COMPLETED') as completedStudents,
                (SELECT COUNT(*) FROM ExamSession es WHERE es.examId = e.id AND es.status = 'SUSPENDED') as suspendedStudents
            FROM Exam e
            LEFT JOIN Subject s ON e.subjectId = s.id
            WHERE e.isPublished = 1
            ORDER BY e.createdAt DESC
            """
            cur.execute(sql)
            rows = cur.fetchall()
            return [_serialize_row(r) for r in rows]
    finally:
        conn.close()

def get_room_status(exam_id: str, room: str = ""):
    """Mengambil rincian status pengerjaan siswa dalam satu ujian atau ruangan"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Ambil data ujian
            cur.execute("SELECT id, title, code, token, durationMinutes FROM Exam WHERE id = %s OR code = %s", (exam_id, exam_id))
            exam = cur.fetchone()
            if not exam:
                return {"error": f"Ujian dengan ID/Kode '{exam_id}' tidak ditemukan."}

            actual_exam_id = exam["id"]

            # Query peserta & status sesi
            sql = """
            SELECT 
                es.id as sessionId,
                u.id as userId,
                u.username,
                u.name as studentName,
                g.name as groupName,
                es.status,
                es.remainingSeconds,
                es.violationCount,
                es.ipAddress,
                es.startedAt,
                es.finishedAt,
                (SELECT COUNT(*) FROM ExamAnswer ea WHERE ea.sessionId = es.id) as totalAnswered
            FROM ExamSession es
            JOIN User u ON es.userId = u.id
            LEFT JOIN `Group` g ON u.groupId = g.id
            WHERE es.examId = %s
            """
            params = [actual_exam_id]
            if room:
                sql += " AND g.name LIKE %s"
                params.append(f"%{room}%")

            sql += " ORDER BY es.status ASC, es.violationCount DESC, u.name ASC"
            cur.execute(sql, tuple(params))
            sessions = [_serialize_row(r) for r in cur.fetchall()]

            summary = {
                "examTitle": exam["title"],
                "examCode": exam["code"],
                "token": exam["token"],
                "total": len(sessions),
                "inProgress": sum(1 for s in sessions if s["status"] == "IN_PROGRESS"),
                "completed": sum(1 for s in sessions if s["status"] == "COMPLETED"),
                "suspended": sum(1 for s in sessions if s["status"] == "SUSPENDED"),
                "forceFinished": sum(1 for s in sessions if s["status"] == "FORCE_FINISHED"),
                "timeout": sum(1 for s in sessions if s["status"] == "TIMEOUT"),
                "students": sessions
            }
            return summary
    finally:
        conn.close()

def get_live_violations(exam_id: str = "", limit: int = 20):
    """Mengambil daftar pelanggaran siswa terbaru secara real-time"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sql = """
            SELECT 
                vl.id as violationId,
                vl.violationType,
                vl.details,
                vl.timestamp,
                u.username,
                u.name as studentName,
                g.name as groupName,
                e.id as examId,
                e.title as examTitle,
                es.id as sessionId,
                es.status as sessionStatus,
                es.violationCount,
                e.maxViolations
            FROM ViolationLog vl
            JOIN ExamSession es ON vl.sessionId = es.id
            JOIN User u ON es.userId = u.id
            LEFT JOIN `Group` g ON u.groupId = g.id
            JOIN Exam e ON es.examId = e.id
            """
            params = []
            if exam_id:
                sql += " WHERE e.id = %s OR e.code = %s"
                params.extend([exam_id, exam_id])

            sql += " ORDER BY vl.timestamp DESC LIMIT %s"
            params.append(limit)

            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
            return [_serialize_row(r) for r in rows]
    finally:
        conn.close()

def find_student_session(cur, student_identifier: str, exam_id: str = ""):
    """Mencari sesi ujian siswa berdasarkan username, nama, atau sessionId"""
    sql = """
    SELECT 
        es.id as sessionId,
        es.examId,
        es.userId,
        es.status,
        es.remainingSeconds,
        es.violationCount,
        es.startedAt,
        u.username,
        u.name as studentName,
        e.title as examTitle,
        e.durationMinutes
    FROM ExamSession es
    JOIN User u ON es.userId = u.id
    JOIN Exam e ON es.examId = e.id
    WHERE (u.username = %s OR u.name LIKE %s OR es.id = %s)
    """
    params = [student_identifier, f"%{student_identifier}%", student_identifier]
    if exam_id:
        sql += " AND (e.id = %s OR e.code = %s)"
        params.extend([exam_id, exam_id])

    sql += " ORDER BY es.updatedAt DESC LIMIT 1"
    cur.execute(sql, tuple(params))
    return cur.fetchone()

def unlock_student_session(student_identifier: str, exam_id: str = ""):
    """Membuka kunci sesi siswa yang terkunci/SUSPENDED dan mereset status ke IN_PROGRESS"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            session = find_student_session(cur, student_identifier, exam_id)
            if not session:
                return {"error": f"Sesi ujian untuk siswa '{student_identifier}' tidak ditemukan."}

            session_id = session["sessionId"]
            old_status = session["status"]

            # Update status kembali ke IN_PROGRESS, reset finishReason
            cur.execute("""
                UPDATE ExamSession 
                SET status = 'IN_PROGRESS', finishReason = NULL, violationCount = 0, updatedAt = NOW()
                WHERE id = %s
            """, (session_id,))

            return {
                "success": True,
                "message": f"Sesi siswa {session['studentName']} ({session['username']}) berhasil dibuka kembali!",
                "studentName": session["studentName"],
                "username": session["username"],
                "examTitle": session["examTitle"],
                "previousStatus": old_status,
                "newStatus": "IN_PROGRESS",
                "remainingMinutes": round(session["remainingSeconds"] / 60, 1),
                "sessionId": session_id
            }
    finally:
        conn.close()

def extend_student_time(student_identifier: str, extra_minutes: int, exam_id: str = ""):
    """Menambahkan kompensasi waktu pengerjaan kepada siswa tertentu"""
    if extra_minutes <= 0:
        return {"error": "extra_minutes harus bernilai positif lebih dari 0."}

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            session = find_student_session(cur, student_identifier, exam_id)
            if not session:
                return {"error": f"Sesi ujian untuk siswa '{student_identifier}' tidak ditemukan."}

            session_id = session["sessionId"]
            add_seconds = int(extra_minutes * 60)
            new_remaining = session["remainingSeconds"] + add_seconds

            # Kita geser startedAt maju dan tambahkan remainingSeconds
            cur.execute("""
                UPDATE ExamSession 
                SET remainingSeconds = remainingSeconds + %s,
                    startedAt = DATE_ADD(startedAt, INTERVAL %s MINUTE),
                    updatedAt = NOW()
                WHERE id = %s
            """, (add_seconds, extra_minutes, session_id))

            return {
                "success": True,
                "message": f"Waktu ujian untuk {session['studentName']} berhasil ditambahkan {extra_minutes} menit.",
                "studentName": session["studentName"],
                "username": session["username"],
                "examTitle": session["examTitle"],
                "extraMinutes": extra_minutes,
                "previousRemainingMinutes": round(session["remainingSeconds"] / 60, 1),
                "newRemainingMinutes": round(new_remaining / 60, 1),
                "sessionId": session_id
            }
    finally:
        conn.close()

def force_finish_student(student_identifier: str, reason: str = "ADMIN_FORCE", exam_id: str = ""):
    """Menghentikan paksa dan mensubmit ujian seorang siswa"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            session = find_student_session(cur, student_identifier, exam_id)
            if not session:
                return {"error": f"Sesi ujian untuk siswa '{student_identifier}' tidak ditemukan."}

            session_id = session["sessionId"]

            cur.execute("""
                UPDATE ExamSession 
                SET status = 'FORCE_FINISHED', finishReason = %s, remainingSeconds = 0, finishedAt = NOW(), updatedAt = NOW()
                WHERE id = %s
            """, (reason, session_id))

            return {
                "success": True,
                "message": f"Sesi ujian {session['studentName']} berhasil di-submit paksa.",
                "studentName": session["studentName"],
                "username": session["username"],
                "examTitle": session["examTitle"],
                "status": "FORCE_FINISHED",
                "finishReason": reason,
                "sessionId": session_id
            }
    finally:
        conn.close()

def diagnose_student(student_identifier: str, exam_id: str = ""):
    """Mendiagnosis kondisi akun, koneksi, sisa waktu, dan riwayat pelanggaran seorang siswa"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Cari User
            cur.execute("""
                SELECT u.id, u.username, u.name, u.role, g.name as groupName
                FROM User u
                LEFT JOIN `Group` g ON u.groupId = g.id
                WHERE u.username = %s OR u.name LIKE %s
                LIMIT 1
            """, (student_identifier, f"%{student_identifier}%"))
            user = cur.fetchone()
            if not user:
                return {"error": f"Siswa dengan nama/username '{student_identifier}' tidak terdaftar di database."}

            # Cari ExamSession terbaru
            sql_session = """
                SELECT 
                    es.id as sessionId, es.examId, es.status, es.finishReason,
                    es.startedAt, es.finishedAt, es.remainingSeconds, es.violationCount,
                    es.ipAddress, es.userAgent, es.score,
                    e.title as examTitle, e.code as examCode, e.durationMinutes, 
                    e.maxViolations, e.requireKioskBrowser, e.isPublished
                FROM ExamSession es
                JOIN Exam e ON es.examId = e.id
                WHERE es.userId = %s
            """
            params = [user["id"]]
            if exam_id:
                sql_session += " AND (e.id = %s OR e.code = %s)"
                params.extend([exam_id, exam_id])

            sql_session += " ORDER BY es.updatedAt DESC LIMIT 1"
            cur.execute(sql_session, tuple(params))
            session = cur.fetchone()

            if not session:
                return {
                    "user": _serialize_row(user),
                    "status": "NO_ACTIVE_SESSION",
                    "diagnosis": f"Akun siswa {user['name']} aktif, namun belum memulai/masuk ke sesi ujian."
                }

            # Hitung jumlah jawaban
            cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN isDoubtful = 1 THEN 1 ELSE 0 END) as doubtful FROM ExamAnswer WHERE sessionId = %s", (session["sessionId"],))
            ans_stat = cur.fetchone()

            # Ambil log pelanggaran
            cur.execute("SELECT violationType, details, timestamp FROM ViolationLog WHERE sessionId = %s ORDER BY timestamp DESC LIMIT 10", (session["sessionId"],))
            violations = [_serialize_row(v) for v in cur.fetchall()]

            # Analisis AI diagnosis
            diagnosis_msg = []
            if session["status"] == "SUSPENDED":
                diagnosis_msg.append(f"⚠️ AKUN DIBEKUKAN: Siswa mencapai batas pelanggaran ({session['violationCount']}/{session['maxViolations']}). Gunakan 'cbt_unlock_student_session' untuk mengizinkan login kembali.")
            elif session["status"] == "IN_PROGRESS":
                rem_min = round(session["remainingSeconds"] / 60, 1)
                diagnosis_msg.append(f"✅ Sesi aktif normal. Sisa waktu: {rem_min} menit. Terjawab: {ans_stat['total']} soal.")
            elif session["status"] in ["COMPLETED", "FORCE_FINISHED", "TIMEOUT"]:
                diagnosis_msg.append(f"ℹ️ Ujian telah selesai dengan status {session['status']} (Alasan: {session['finishReason'] or 'Selesai mandiri'}).")

            if session["violationCount"] > 0:
                diagnosis_msg.append(f"Terdeteksi {session['violationCount']} pelanggaran selama pengerjaan.")

            return {
                "user": _serialize_row(user),
                "session": _serialize_row(session),
                "answers": _serialize_row({
                    "totalAnswered": ans_stat["total"] if ans_stat else 0,
                    "doubtful": ans_stat["doubtful"] if ans_stat else 0
                }),
                "recentViolations": violations,
                "diagnosticSummary": " ".join(diagnosis_msg)
            }

    finally:
        conn.close()

def update_exam_token(exam_id: str, new_token: str):
    """Memperbarui token ujian secara real-time langsung ke database"""
    token_clean = new_token.strip().upper()
    if not token_clean:
        return {"error": "Token baru tidak boleh kosong."}

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title, code, token FROM Exam WHERE id = %s OR code = %s", (exam_id, exam_id))
            exam = cur.fetchone()
            if not exam:
                return {"error": f"Ujian dengan ID/Kode '{exam_id}' tidak ditemukan."}

            old_token = exam["token"]
            cur.execute("UPDATE Exam SET token = %s, updatedAt = NOW() WHERE id = %s", (token_clean, exam["id"]))

            return {
                "success": True,
                "examId": exam["id"],
                "examTitle": exam["title"],
                "examCode": exam["code"],
                "previousToken": old_token,
                "newToken": token_clean,
                "message": f"Token ujian '{exam['title']}' berhasil diubah dari '{old_token}' menjadi '{token_clean}'."
            }
    finally:
        conn.close()

def get_live_question_stats(exam_id: str):
    """Menganalisis butir soal secara real-time untuk mendeteksi anomali atau kunci jawaban keliru"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, title FROM Exam WHERE id = %s OR code = %s", (exam_id, exam_id))
            exam = cur.fetchone()
            if not exam:
                return {"error": f"Ujian dengan ID/Kode '{exam_id}' tidak ditemukan."}

            # Cek apakah menggunakan ExamQuestion atau fallback subjectId
            cur.execute("SELECT COUNT(*) as cnt FROM ExamQuestion WHERE examId = %s", (exam["id"],))
            has_eq = (cur.fetchone()["cnt"] or 0) > 0

            if has_eq:
                sql = """
                SELECT 
                    eq.orderIndex,
                    q.id as questionId,
                    q.type as questionType,
                    LEFT(q.content, 120) as questionSnippet,
                    q.points,
                    COUNT(ea.id) as totalAnswersSubmitted,
                    SUM(CASE WHEN ea.isCorrect = 1 THEN 1 ELSE 0 END) as correctAnswers,
                    SUM(CASE WHEN ea.isCorrect = 0 THEN 1 ELSE 0 END) as wrongAnswers,
                    SUM(CASE WHEN ea.isDoubtful = 1 THEN 1 ELSE 0 END) as doubtfulAnswers
                FROM ExamQuestion eq
                JOIN Question q ON eq.questionId = q.id
                LEFT JOIN ExamSession es ON es.examId = eq.examId
                LEFT JOIN ExamAnswer ea ON ea.questionId = q.id AND ea.sessionId = es.id
                WHERE eq.examId = %s
                GROUP BY eq.orderIndex, q.id, q.type, q.content, q.points
                ORDER BY eq.orderIndex ASC
                """
                cur.execute(sql, (exam["id"],))
            else:
                sql = """
                SELECT 
                    (@row_number:=@row_number + 1) AS orderIndex,
                    q.id as questionId,
                    q.type as questionType,
                    LEFT(q.content, 120) as questionSnippet,
                    q.points,
                    COUNT(ea.id) as totalAnswersSubmitted,
                    SUM(CASE WHEN ea.isCorrect = 1 THEN 1 ELSE 0 END) as correctAnswers,
                    SUM(CASE WHEN ea.isCorrect = 0 THEN 1 ELSE 0 END) as wrongAnswers,
                    SUM(CASE WHEN ea.isDoubtful = 1 THEN 1 ELSE 0 END) as doubtfulAnswers
                FROM (SELECT @row_number:=0) as t, Question q
                LEFT JOIN ExamSession es ON es.examId = %s
                LEFT JOIN ExamAnswer ea ON ea.questionId = q.id AND ea.sessionId = es.id
                WHERE q.subjectId = (SELECT subjectId FROM Exam WHERE id = %s)
                GROUP BY q.id, q.type, q.content, q.points
                ORDER BY q.createdAt ASC
                """
                cur.execute(sql, (exam["id"], exam["id"]))
            questions = cur.fetchall()


            analyzed = []
            alerts = []

            for idx, q in enumerate(questions, 1):
                total = int(q["totalAnswersSubmitted"] or 0)
                correct = int(q["correctAnswers"] or 0)
                wrong = int(q["wrongAnswers"] or 0)
                doubtful = int(q["doubtfulAnswers"] or 0)

                correct_rate = round((correct / total) * 100, 1) if total > 0 else 0
                doubtful_rate = round((doubtful / total) * 100, 1) if total > 0 else 0

                item = {
                    "no": idx,
                    "questionId": q["questionId"],
                    "type": q["questionType"],
                    "snippet": q["questionSnippet"],
                    "points": float(q["points"]) if q["points"] is not None else 1.0,
                    "totalSubmitted": total,
                    "correct": correct,
                    "wrong": wrong,
                    "doubtful": doubtful,
                    "correctRate": f"{correct_rate}%",
                    "doubtfulRate": f"{doubtful_rate}%"
                }

                if total >= 5 and correct_rate == 0:
                    alerts.append(f"⚠️ No. {idx} ({correct_rate}% benar dari {total} siswa): Perlu dicek, kemungkinan kunci jawaban salah input!")
                elif total >= 5 and doubtful_rate >= 50:
                    alerts.append(f"❓ No. {idx} ({doubtful_rate}% siswa ragu-ragu): Soal mungkin membingungkan atau ada opsi ambigu.")


                analyzed.append(item)

            return {
                "examTitle": exam["title"],
                "totalQuestions": len(analyzed),
                "anomaliesDetected": len(alerts),
                "anomalyAlerts": alerts,
                "questions": analyzed
            }
    finally:
        conn.close()
