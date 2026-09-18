import os
import sys
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import db_engine
from mcp.server.mcpserver import MCPServer

mcp = MCPServer("cbt-live-monitor")

@mcp.tool()
def cbt_get_active_exams() -> str:
    """
    Mengambil daftar ujian CBT yang sedang aktif atau dipublikasikan beserta rekap jumlah peserta live
    (total terdaftar, sedang mengerjakan/in progress, selesai/completed, dan dibekukan/suspended).
    """
    try:
        data = db_engine.get_active_exams()
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_get_room_status(exam_id: str, room: str = "") -> str:
    """
    Mengambil rincian status pengerjaan seluruh peserta dalam satu ujian atau ruangan/kelas tertentu.
    Menampilkan ringkasan jumlah status (in progress, completed, suspended, force finished, timeout)
    dan daftar detail siswa yang sedang mengerjakan beserta sisa waktu dan pelanggarannya.
    """
    try:
        data = db_engine.get_room_status(exam_id, room)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_get_live_violations(exam_id: str = "", limit: int = 20) -> str:
    """
    Mengambil log pelanggaran siswa terbaru secara real-time (misal: TAB_SWITCH, keluar fullscreen, kiosk breach).
    Menampilkan nama siswa, username, kelas, nama ujian, jenis pelanggaran, detail, dan timestamp.
    """
    try:
        data = db_engine.get_live_violations(exam_id, limit)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_unlock_student_session(student_identifier: str, exam_id: str = "") -> str:
    """
    Membuka kunci sesi ujian siswa yang berstatus SUSPENDED (karena melampaui batas pelanggaran)
    atau terkunci karena komputer crash/ganti perangkat, dan mengembalikan status ke IN_PROGRESS
    sehingga siswa dapat langsung login dan melanjutkan ujiannya.
    """
    try:
        data = db_engine.unlock_student_session(student_identifier, exam_id)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_extend_student_time(student_identifier: str, extra_minutes: int, exam_id: str = "") -> str:
    """
    Menambahkan kompensasi waktu pengerjaan ujian (dalam satuan menit) kepada seorang siswa tertentu
    yang mengalami kendala teknis (misal komputer mati, restart, atau gangguan jaringan).
    Waktu ditambahkan secara otoritatif pada database sehingga timer siswa otomatis bertambah.
    """
    try:
        data = db_engine.extend_student_time(student_identifier, extra_minutes, exam_id)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_force_finish_student(student_identifier: str, reason: str = "ADMIN_FORCE", exam_id: str = "") -> str:
    """
    Men-submit paksa sesi ujian seorang siswa (misal karena melanggar aturan berat,
    meninggalkan ruangan tanpa izin, atau waktu sesi sudah resmi ditutup oleh panitia).
    """
    try:
        data = db_engine.force_finish_student(student_identifier, reason, exam_id)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_diagnose_student(student_identifier: str, exam_id: str = "") -> str:
    """
    Melakukan inspeksi mendalam (troubleshooting cerdas) terhadap kondisi siswa di database CBT:
    data akun, kelas, sesi ujian aktif, sisa waktu, jumlah soal yang sudah dijawab/ragu-ragu,
    riwayat log pelanggaran, IP address, user agent browser kiosk, dan analisis penyebab masalah.
    """
    try:
        data = db_engine.diagnose_student(student_identifier, exam_id)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_update_exam_token(exam_id: str, new_token: str) -> str:
    """
    Memperbarui token ujian secara instan langsung ke database tanpa perlu me-restart aplikasi/server.
    Siswa baru yang akan masuk ke sesi ujian harus menggunakan token baru ini.
    """
    try:
        data = db_engine.update_exam_token(exam_id, new_token)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

@mcp.tool()
def cbt_get_live_question_stats(exam_id: str) -> str:
    """
    Menganalisis statistik butir soal secara real-time saat ujian sedang berlangsung:
    menghitung persentase siswa yang menjawab benar, salah, dan ragu-ragu untuk setiap nomor soal,
    serta otomatis mendeteksi anomali (misal: 0% siswa benar = indikasi kunci jawaban salah input).
    """
    try:
        data = db_engine.get_live_question_stats(exam_id)
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)

if __name__ == "__main__":
    mcp.run(transport="stdio")
