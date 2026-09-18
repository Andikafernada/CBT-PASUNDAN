import os
import sys
import json

# Ensure engine is on path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from normalizer_engine import audit_file, normalize_docx_file, batch_normalize_folder
from mcp.server.mcpserver import MCPServer

mcp = MCPServer("cbt-question-normalizer")

@mcp.tool()
def audit_exam_file(file_path: str) -> str:
    """
    Audit file dokumen soal (.docx) untuk memeriksa jumlah butir soal,
    ketersediaan nomor soal, kelengkapan label opsi A-E, dan gambar yang tertanam.
    """
    res = audit_file(file_path)
    return json.dumps(res, indent=2, ensure_ascii=False)

@mcp.tool()
def normalize_exam_docx(input_path: str, output_path: str = "") -> str:
    """
    Normalisasi dokumen soal (.docx) secara in-place tanpa mengubah isi soal:
    - Menambahkan penomoran soal berurutan (1, 2, ..., N)
    - Menambahkan label opsi (A, B, C, D, E) pada opsi yang belum berlabel
    - Merapikan baris KUNCI jawaban
    - Mempertahankan 100% semua gambar, rumus, tabel, dan kalimat asli soal.
    """
    res = normalize_docx_file(input_path, output_path)
    return json.dumps(res, indent=2, ensure_ascii=False)

@mcp.tool()
def batch_normalize_folder(folder_path: str, output_folder: str = "") -> str:
    """
    Normalisasi massal seluruh file soal (.docx) dalam satu folder (misal untuk 70 guru).
    Menghasilkan file terstandarisasi di folder output tanpa merusak gambar maupun konten asli.
    """
    res = batch_normalize_folder(folder_path, output_folder)
    return json.dumps(res, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    mcp.run(transport="stdio")
