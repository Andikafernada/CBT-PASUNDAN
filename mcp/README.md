# Navin CBT - Model Context Protocol (MCP) Servers

Direktori ini berisi implementasi server **Model Context Protocol (MCP)** terintegrasi khusus untuk ekosistem **Navin CBT**.

## Server yang Terintegrasi

### 1. cbt-live-monitor
Server MCP untuk pengawasan ujian real-time oleh pengawas/proktor:
* Mengambil status sesi ujian aktif (cbt_get_active_exams, cbt_get_room_status).
* Monitoring pelanggaran siswa real-time (cbt_get_live_violations).
* Intervensi sesi siswa (cbt_unlock_student_session, cbt_extend_student_time, cbt_force_finish_student).
* Diagnosa kendala teknis koneksi siswa (cbt_diagnose_student).
* Pembaruan token ujian secara dinamis (cbt_update_exam_token).
* Statistik butir soal (cbt_get_live_question_stats).

### 2. cbt-question-normalizer
Server MCP untuk normalisasi dan audit bank soal Microsoft Word (.docx):
* Audit kelayakan file dokumen ujian (udit_exam_file).
* Konversi otomatis formula matematika Word OMML ke LaTeX / KaTeX standar (
ormalize_exam_docx).
* Pemrosesan masal folder bank soal (atch_normalize_folder).

---
*Catatan: Modul MCP infrastruktur jaringan dan hypervisor (Proxmox VE & Ruijie Cloud) dikelola secara terpisah untuk menjaga modularitas repositori aplikasi CBT.*
