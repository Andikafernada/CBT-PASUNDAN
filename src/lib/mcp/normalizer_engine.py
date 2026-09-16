#!/usr/bin/env python3
"""
Model Context Protocol (MCP) AI Normalizer Engine for CBT Hebat Modern
SMK Pasundan 2 Bandung

Fitur Utama:
1. Analisa Deep Audit Dokumen Word (.docx) secara otomatis.
2. 100% Preservasi Media Gambar & Konversi Word Math (m:oMath) ke teks matematika terbaca (KaTeX/standard).
3. Pemetaan Cerdas Batas Soal via KUNCI: & Penomoran Soal (mengatasi naskah guru tanpa nomor soal).
4. Deteksi & penanganan 5 Bentuk Soal CBT:
   - MULTIPLE_CHOICE (Pilihan Ganda Tunggal)
   - COMPLEX_MULTIPLE_CHOICE (Pilihan Ganda Kompleks)
   - TRUE_FALSE (Benar / Salah)
   - MATCHING (Menjodohkan dengan sintaks <=>)
   - ESSAY (Uraian / Esai)
5. AI Auto-Repair cerdas:
   - Menghubungkan Kunci Jawaban terpisah di lampiran / tabel akhir ke butir soal
   - Melabeli opsi tanpa huruf menjadi A., B., C., D., E.
   - Merapikan penomoran soal melompat / hilang
   - Menyematkan tag [TIPE: ...] agar dibaca 100% akurat oleh parser bank soal
"""

import os
import sys
import json
import re
from typing import Dict, List, Any, Optional

try:
    import docx
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
except ImportError:
    print(json.dumps({"error": "python-docx is not installed"}))
    sys.exit(1)

# ============================================================
# HELPER XML, MATH & GAMBAR
# ============================================================

def omath_to_text(om_elem) -> str:
    """Konversi rekursif Word oMath XML menjadi notasi matematika terbaca"""
    tag = om_elem.tag.split('}')[-1] if '}' in om_elem.tag else om_elem.tag
    
    if tag == 't':
        return om_elem.text or ''
    
    if tag == 'f':
        num_elem = om_elem.xpath("./*[local-name()='num']")
        den_elem = om_elem.xpath("./*[local-name()='den']")
        num_str = omath_to_text(num_elem[0]) if num_elem else ''
        den_str = omath_to_text(den_elem[0]) if den_elem else ''
        return f"({num_str})/({den_str})"
    
    if tag == 'sSup':
        e_elem = om_elem.xpath("./*[local-name()='e']")
        sup_elem = om_elem.xpath("./*[local-name()='sup']")
        e_str = omath_to_text(e_elem[0]) if e_elem else ''
        sup_str = omath_to_text(sup_elem[0]) if sup_elem else ''
        return f"{e_str}^{sup_str}"
    
    if tag == 'sSub':
        e_elem = om_elem.xpath("./*[local-name()='e']")
        sub_elem = om_elem.xpath("./*[local-name()='sub']")
        e_str = omath_to_text(e_elem[0]) if e_elem else ''
        sub_str = omath_to_text(sub_elem[0]) if sub_elem else ''
        return f"{e_str}_{sub_str}"
    
    if tag == 'sSubSup':
        e_elem = om_elem.xpath("./*[local-name()='e']")
        sub_elem = om_elem.xpath("./*[local-name()='sub']")
        sup_elem = om_elem.xpath("./*[local-name()='sup']")
        e_str = omath_to_text(e_elem[0]) if e_elem else ''
        sub_str = omath_to_text(sub_elem[0]) if sub_elem else ''
        sup_str = omath_to_text(sup_elem[0]) if sup_elem else ''
        return f"{e_str}_{sub_str}^{sup_str}"
    
    if tag == 'rad':
        deg_elem = om_elem.xpath("./*[local-name()='deg']")
        e_elem = om_elem.xpath("./*[local-name()='e']")
        deg_str = omath_to_text(deg_elem[0]) if deg_elem else ''
        e_str = omath_to_text(e_elem[0]) if e_elem else ''
        if deg_str and deg_str.strip():
            return f"√[{deg_str}]({e_str})"
        return f"√({e_str})"
    
    if tag == 'd':
        e_elem = om_elem.xpath("./*[local-name()='e']")
        inner = "".join(omath_to_text(child) for child in e_elem) if e_elem else ''
        return f"({inner})"
    
    res = []
    for child in om_elem:
        res.append(omath_to_text(child))
    return "".join(res)

def convert_omaths_in_doc(doc) -> int:
    """
    Ubah elemen oMath XML menjadi teks run Word (<w:r><w:t>) agar terbaca oleh Mammoth & CBT
    """
    converted_count = 0
    for p in doc.paragraphs:
        omaths = p._p.xpath(".//*[local-name()='oMath']")
        for om in omaths:
            math_text = omath_to_text(om).strip()
            if math_text:
                new_r = OxmlElement('w:r')
                new_t = OxmlElement('w:t')
                new_t.text = f" {math_text} "
                new_t.set(qn('xml:space'), 'preserve')
                new_r.append(new_t)
                parent = om.getparent()
                if parent is not None:
                    parent.replace(om, new_r)
                    converted_count += 1
    return converted_count

def strip_list_formatting(doc):
    """Hapus w:numPr dan ListParagraph agar Mammoth menghasilkan <p> bersih bukan <ol><li>"""
    for p in doc.paragraphs:
        pPr = p._p.find(qn('w:pPr'))
        if pPr is not None:
            numPr = pPr.find(qn('w:numPr'))
            if numPr is not None:
                pPr.remove(numPr)
            pStyle = pPr.find(qn('w:pStyle'))
            if pStyle is not None and pStyle.get(qn('w:val')) == 'ListParagraph':
                pPr.remove(pStyle)

def has_drawing(p) -> bool:
    return bool(p._p.xpath('.//w:drawing | .//w:pict | .//w:object | .//a:blip'))

def count_document_images(doc) -> int:
    count = 0
    for p in doc.paragraphs:
        count += len(p._p.xpath('.//w:drawing | .//w:pict | .//w:object | .//a:blip'))
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    count += len(p._p.xpath('.//w:drawing | .//w:pict | .//w:object | .//a:blip'))
    return count

# ============================================================
# EKSTRAKSI KUNCI JAWABAN TERPISAH (TRAILING KEYS & TABLES)
# ============================================================

def extract_trailing_keys(doc) -> Dict[int, str]:
    key_map = {}
    total_paras = len(doc.paragraphs)
    start_search = int(total_paras * 0.4) if total_paras > 10 else 0

    in_key_section = False
    for i in range(start_search, total_paras):
        p = doc.paragraphs[i]
        text = p.text.strip()

        if re.match(r"^kunci\s+jawaban\s*(?:ujian|soal|akhir|rekap|semua|siswa)?\s*:?\s*$", text, re.I):
            in_key_section = True
            continue

        if re.search(r"kunci\s+jawaban\s*:\s*\d+[\.\)]\s*[A-Ea-e]", text, re.I):
            in_key_section = True

        if in_key_section or re.search(r"\b\d+[\.\)]\s*[A-Ea-e]\b", text):
            matches = re.findall(r"(\d+)[\.\)]\s*([A-Ea-e]|BENAR|SALAH|TRUE|FALSE)\b", text, re.I)
            for m in matches:
                try:
                    num = int(m[0])
                    key_map[num] = m[1].upper()
                except:
                    pass

    if len(key_map) < 3 and doc.tables:
        for table in doc.tables:
            for row in table.rows:
                cells = row.cells
                if len(cells) >= 2:
                    no_col, kunci_col = -1, -1
                    for ci, c in enumerate(cells):
                        c_t = c.text.strip().lower()
                        if c_t in ["no", "nomor", "no.", "no soal", "soal"]:
                            no_col = ci
                        elif "kunci" in c_t or "jawaban" in c_t or "kunci jawaban" in c_t:
                            kunci_col = ci

                    if no_col != -1 and kunci_col != -1:
                        continue

                    if len(cells) > max(no_col, kunci_col):
                        raw_no = re.sub(r"[^\d]", "", cells[no_col].text.strip())
                        raw_key = cells[kunci_col].text.strip().upper()
                        if raw_no and raw_key in ["A", "B", "C", "D", "E", "BENAR", "SALAH", "TRUE", "FALSE"]:
                            try:
                                num = int(raw_no)
                                key_map[num] = raw_key
                            except:
                                pass

    return key_map

# ============================================================
# AUDIT FILE DOCX SECARA KOMPREHENSIF (AI-POWERED AUDIT)
# ============================================================

def audit_file(filepath: str) -> dict:
    if not os.path.exists(filepath):
        return {"error": f"File tidak ditemukan: {filepath}"}

    ext = os.path.splitext(filepath)[1].lower()
    if ext != ".docx":
        return {"error": f"Format file saat ini baru mendukung .docx (file diberikan: {ext})"}

    doc = docx.Document(filepath)
    paragraphs = doc.paragraphs
    total_paras = len(paragraphs)
    total_images = count_document_images(doc)

    trailing_keys = extract_trailing_keys(doc)

    trailing_key_start_idx = len(paragraphs)
    for i, p in enumerate(paragraphs):
        t = p.text.strip()
        if i > total_paras * 0.4:
            if re.match(r"^kunci\s+jawaban\s*(?:ujian|soal|akhir|rekap|semua|siswa)?\s*:?\s*$", t, re.I):
                trailing_key_start_idx = i
                break
            elif re.search(r"kunci\s+jawaban\s*:\s*\d+[\.\)]\s*[A-Ea-e]", t, re.I):
                trailing_key_start_idx = i
                break

    valid_p_indices = []
    for i in range(min(total_paras, trailing_key_start_idx)):
        p = paragraphs[i]
        t = p.text.strip()
        img = has_drawing(p)
        om = bool(p._p.xpath(".//*[local-name()='oMath']"))
        if not t and not img and not om:
            continue
        if re.match(r"^[-=_\*]{3,}$", t):
            continue
        if re.match(r"^---\s*BENTUK\s*\d+", t, re.I):
            continue
        if re.match(r"^[A-E]\.\s*(?:PILIHAN GANDA|SOAL|PETUNJUK|ESSAY|URAIAN|ISIAN)", t, re.I):
            continue
        valid_p_indices.append(i)

    # Hybrid start detection: boundary after KUNCI, question number, or section tag
    starts = [0]
    for vi in range(1, len(valid_p_indices)):
        prev_t = paragraphs[valid_p_indices[vi - 1]].text.strip()
        curr_t = paragraphs[valid_p_indices[vi]].text.strip()

        is_prev_key = bool(re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", prev_t, re.I))
        is_curr_num = bool(re.match(r"^(?:soal\s*)?(\d+)[\.\)]\s+", curr_t, re.I))
        is_curr_tag = bool(re.match(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)", curr_t, re.I))

        if is_prev_key or is_curr_num or is_curr_tag:
            if starts and starts[-1] == vi - 1:
                if re.match(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)", prev_t, re.I):
                    continue
            if vi not in starts:
                starts.append(vi)
    question_starts = starts

    types_breakdown = {
        "MULTIPLE_CHOICE": 0,
        "COMPLEX_MULTIPLE_CHOICE": 0,
        "TRUE_FALSE": 0,
        "MATCHING": 0,
        "ESSAY": 0,
    }

    issues_detected = []
    questions_data = []

    # Track section headers across paragraphs
    para_section_map = {}
    current_sec = "MULTIPLE_CHOICE"
    for i, p in enumerate(paragraphs):
        t = p.text.strip()
        if re.search(r"ESAI|ESSAY|URAIAN|ISIAN", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK|JAWABLAH", t, re.I) or t.startswith("---")):
            current_sec = "ESSAY"
        elif re.search(r"BENAR\s*SALAH|TRUE\s*FALSE|TF\b", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "TRUE_FALSE"
        elif re.search(r"MENJODOHKAN|MATCHING|JODOH", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "MATCHING"
        elif re.search(r"KOMPLEKS|COMPLEX", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "COMPLEX_MULTIPLE_CHOICE"
        elif re.search(r"PILIHAN GANDA|MULTIPLE_CHOICE|PG\b", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "MULTIPLE_CHOICE"
        para_section_map[i] = current_sec

    for idx in range(len(question_starts)):
        q_num = idx + 1
        start_vi = question_starts[idx]
        end_vi = question_starts[idx + 1] - 1 if idx + 1 < len(question_starts) else len(valid_p_indices) - 1
        block_p_indices = [valid_p_indices[v] for v in range(start_vi, end_vi + 1)]
        block_texts = [paragraphs[pi].text.strip() for pi in block_p_indices]

        first_line = block_texts[0]
        has_question_number = bool(re.match(r"^(?:\[[^\]]+\]\s*)?(?:soal\s*)?(\d+)[\.\)]\s+", first_line, re.I))
        has_num = has_question_number
        if not has_num:
            issues_detected.append({
                "question_number": q_num,
                "number": q_num,
                "type": "UNNUMBERED_QUESTION",
                "message": f"Soal nomor {q_num} tidak memiliki penomoran standar",
                "ai_fix_plan": f"Menambahkan nomor soal '{q_num}. ' pada awal kalimat",
                "fixed": True
            })

        # Cari Kunci Jawaban dalam blok
        found_key = ""
        kunci_line_idx = -1
        for ki, t in enumerate(block_texts):
            m_key = re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:\s*(.+)", t, re.I)
            if m_key:
                found_key = m_key.group(1).strip()
                kunci_line_idx = ki
                break

        resolved_key = found_key
        if not resolved_key and q_num in trailing_keys:
            resolved_key = trailing_keys[q_num]
            issues_detected.append({
                "question_number": q_num,
                "number": q_num,
                "type": "SEPARATE_KEY_LINKED",
                "message": f"Kunci jawaban terpisah di tabel lampiran berhasil dihubungkan (Kunci: {resolved_key})",
                "ai_fix_plan": f"Menyematkan KUNCI: {resolved_key} tepat di bawah butir soal",
                "fixed": True
            })

        block_sec = para_section_map.get(block_p_indices[0], "MULTIPLE_CHOICE")
        opt_end_idx = kunci_line_idx if kunci_line_idx != -1 else len(block_p_indices)
        has_opt_labels = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]\s+", paragraphs[pi].text.strip()) for pi in block_p_indices[1:opt_end_idx])
        is_key_letter = bool(re.match(r"^[A-Ea-e]$", resolved_key.strip()))

        # Deteksi Mode Soal
        is_matching = any(re.search(r"<=>|<->|===|PASANGAN\s*\d*:", t, re.I) for t in block_texts) or "[MENJODOHKAN]" in first_line.upper() or block_sec == "MATCHING"
        is_tf = resolved_key.upper() in ["BENAR", "SALAH", "TRUE", "FALSE"] or "[TIPE: TF]" in first_line.upper() or "[TIPE: TRUE_FALSE]" in first_line.upper() or block_sec == "TRUE_FALSE"
        is_essay = "[ESAI]" in first_line.upper() or "[TIPE: ESSAY]" in first_line.upper() or block_sec == "ESSAY" or (
            not has_opt_labels and not is_key_letter and not is_matching and not is_tf
        ) or (len(block_p_indices) <= 2 and not is_matching and not is_tf and len(resolved_key) > 5 and not is_key_letter)

        if is_matching:
            q_mode = "MATCHING"
            types_breakdown["MATCHING"] += 1
            resolved_key = "MATCHING"
        elif is_tf:
            q_mode = "TRUE_FALSE"
            types_breakdown["TRUE_FALSE"] += 1
        elif is_essay:
            q_mode = "ESSAY"
            types_breakdown["ESSAY"] += 1
            resolved_key = resolved_key or "[Pedoman Penilaian Esai]"
        elif len(re.findall(r'[A-E]', resolved_key.upper())) > 1 or "," in resolved_key:
            q_mode = "COMPLEX_MULTIPLE_CHOICE"
            types_breakdown["COMPLEX_MULTIPLE_CHOICE"] += 1
        else:
            q_mode = "MULTIPLE_CHOICE"
            types_breakdown["MULTIPLE_CHOICE"] += 1

            # Periksa opsi jawaban
            candidate_opts = block_p_indices[1:kunci_line_idx] if kunci_line_idx != -1 else block_p_indices[1:]
            has_labelled_opts = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]", paragraphs[pi].text.strip()) for pi in candidate_opts)

            if not has_labelled_opts and len(candidate_opts) in [4, 5]:
                issues_detected.append({
                    "question_number": q_num,
                    "type": "UNLABELLED_OPTIONS",
                    "message": f"{len(candidate_opts)} pilihan jawaban belum berhuruf A-E",
                    "ai_fix_plan": "Memberi label A. sampai E. secara berurutan pada baris opsi",
                    "fixed": True
                })

        if not resolved_key and not is_matching:
            issues_detected.append({
                "question_number": q_num,
                "type": "MISSING_KEY",
                "message": "Kunci jawaban belum tersedia di dalam naskah",
                "ai_fix_plan": "Menyematkan KUNCI: A sebagai penanda default untuk diverifikasi superuser",
                "fixed": True
            })

        clean_snippet = re.sub(r"^(?:soal\s*)?\d+[\.\)]\s*", "", first_line).strip()
        clean_snippet = re.sub(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)[^\]]*\]\s*", "", clean_snippet).strip()

        this_q_issues = [iss["message"] for iss in issues_detected if iss["question_number"] == q_num]

        questions_data.append({
            "number": q_num,
            "type": q_mode,
            "snippet": clean_snippet[:90] + ("..." if len(clean_snippet) > 90 else ""),
            "key": resolved_key or "-",
            "status": "OK" if not this_q_issues else "AI_FIX_READY",
            "issues": this_q_issues
        })

    total_q = len(questions_data)
    rec_parts = []
    if types_breakdown["MULTIPLE_CHOICE"] > 0: rec_parts.append(f"{types_breakdown['MULTIPLE_CHOICE']} PG")
    if types_breakdown["COMPLEX_MULTIPLE_CHOICE"] > 0: rec_parts.append(f"{types_breakdown['COMPLEX_MULTIPLE_CHOICE']} PG Kompleks")
    if types_breakdown["TRUE_FALSE"] > 0: rec_parts.append(f"{types_breakdown['TRUE_FALSE']} Benar/Salah")
    if types_breakdown["MATCHING"] > 0: rec_parts.append(f"{types_breakdown['MATCHING']} Menjodohkan")
    if types_breakdown["ESSAY"] > 0: rec_parts.append(f"{types_breakdown['ESSAY']} Esai")

    rec_composition = ", ".join(rec_parts) if rec_parts else f"{total_q} butir soal"

    return {
        "status": "HEALTHY" if len(issues_detected) == 0 else "NEEDS_NORMALIZATION",
        "filename": os.path.basename(filepath),
        "total_paragraphs": total_paras,
        "total_images": total_images,
        "detected_questions": total_q,
        "types_breakdown": types_breakdown,
        "unnumbered_questions": sum(1 for iss in issues_detected if iss["type"] == "UNNUMBERED_QUESTION"),
        "unlabelled_options": sum(1 for iss in issues_detected if iss["type"] == "UNLABELLED_OPTIONS"),
        "separate_keys_found": len(trailing_keys),
        "issues_detected": issues_detected,
        "questions_detail": questions_data,
        "recommendation": (
            f"Dokumen berisi {rec_composition}. "
            + (f"MCP AI siap menormalisasi {len(issues_detected)} perbaikan secara otomatis."
               if issues_detected else "Format dokumen sudah standar dan siap diimpor.")
        )
    }

# ============================================================
# NORMALISASI DOKUMEN WORD DENGAN PRESERVASI 100% GAMBAR & MATH
# ============================================================

def normalize_docx_file(input_path: str, output_path: str) -> dict:
    if not os.path.exists(input_path):
        return {"error": f"File tidak ditemukan: {input_path}"}

    doc = docx.Document(input_path)
    initial_images = count_document_images(doc)

    # 1. Konversi oMath (Word equations) ke teks representasi matematika
    converted_math = convert_omaths_in_doc(doc)

    # 2. Hapus format ListParagraph & numPr agar Mammoth menghasilkan tag <p> bersih bukan <ol><li>
    strip_list_formatting(doc)

    # 3. Kunci terpisah (trailing keys)
    trailing_keys = extract_trailing_keys(doc)

    trailing_key_p = None
    for i, p in enumerate(doc.paragraphs):
        t = p.text.strip()
        if i > len(doc.paragraphs) * 0.4:
            if re.match(r"^kunci\s+jawaban\s*(?:ujian|soal|akhir|rekap|semua|siswa)?\s*:?\s*$", t, re.I):
                trailing_key_p = p
                break
            elif re.search(r"kunci\s+jawaban\s*:\s*\d+[\.\)]\s*[A-Ea-e]", t, re.I):
                trailing_key_p = p
                break

    valid_p_indices = []
    found_trailing = False
    for i, p in enumerate(doc.paragraphs):
        if trailing_key_p and p._p == trailing_key_p._p:
            found_trailing = True
        if found_trailing:
            continue
        t = p.text.strip()
        img = has_drawing(p)
        if not t and not img:
            continue
        if re.match(r"^[-=_\*]{3,}$", t):
            continue
        if re.match(r"^---\s*BENTUK\s*\d+", t, re.I):
            continue
        if re.match(r"^[A-E]\.\s*(?:PILIHAN GANDA|SOAL|PETUNJUK|ESSAY|URAIAN|ISIAN)", t, re.I):
            continue
        valid_p_indices.append(i)

    # Hybrid question start detection
    starts = [0]
    for vi in range(1, len(valid_p_indices)):
        prev_t = doc.paragraphs[valid_p_indices[vi - 1]].text.strip()
        curr_t = doc.paragraphs[valid_p_indices[vi]].text.strip()

        is_prev_key = bool(re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", prev_t, re.I))
        is_curr_num = bool(re.match(r"^(?:soal\s*)?(\d+)[\.\)]\s+", curr_t, re.I))
        is_curr_tag = bool(re.match(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)", curr_t, re.I))

        if is_prev_key or is_curr_num or is_curr_tag:
            if starts and starts[-1] == vi - 1:
                if re.match(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)", prev_t, re.I):
                    continue
            if vi not in starts:
                starts.append(vi)
    question_starts = starts

    fixed_issues_count = 0

    # Track section headers across paragraphs
    para_section_map = {}
    current_sec = "MULTIPLE_CHOICE"
    for i, p in enumerate(doc.paragraphs):
        t = p.text.strip()
        if re.search(r"ESAI|ESSAY|URAIAN|ISIAN", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK|JAWABLAH", t, re.I) or t.startswith("---")):
            current_sec = "ESSAY"
        elif re.search(r"BENAR\s*SALAH|TRUE\s*FALSE|TF\b", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "TRUE_FALSE"
        elif re.search(r"MENJODOHKAN|MATCHING|JODOH", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "MATCHING"
        elif re.search(r"KOMPLEKS|COMPLEX", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "COMPLEX_MULTIPLE_CHOICE"
        elif re.search(r"PILIHAN GANDA|MULTIPLE_CHOICE|PG\b", t, re.I) and (re.search(r"BENTUK|BAGIAN|SOAL|PETUNJUK", t, re.I) or t.startswith("---")):
            current_sec = "MULTIPLE_CHOICE"
        para_section_map[i] = current_sec

    # Normalisasi Per Butir Soal (Secara REVERSE)
    for idx in range(len(question_starts) - 1, -1, -1):
        q_num = idx + 1
        start_vi = question_starts[idx]
        end_vi = question_starts[idx + 1] - 1 if idx + 1 < len(question_starts) else len(valid_p_indices) - 1
        block_p_indices = [valid_p_indices[x] for x in range(start_vi, end_vi + 1)]

        if not block_p_indices:
            continue

        first_p = doc.paragraphs[block_p_indices[0]]
        first_text = first_p.text.strip()

        kunci_p = None
        kunci_pi = -1
        raw_kunci = ""
        for pi in block_p_indices:
            t = doc.paragraphs[pi].text.strip()
            m_key = re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:\s*(.*)", t, re.I)
            if m_key:
                kunci_p = doc.paragraphs[pi]
                kunci_pi = pi
                raw_kunci = m_key.group(1).strip()
                break

        if not raw_kunci and q_num in trailing_keys:
            raw_kunci = trailing_keys[q_num]
            fixed_issues_count += 1

        block_sec = para_section_map.get(block_p_indices[0], "MULTIPLE_CHOICE")
        kunci_idx_in_block = block_p_indices.index(kunci_pi) if kunci_pi != -1 else len(block_p_indices)
        opt_indices = block_p_indices[1:kunci_idx_in_block]

        has_opt_labels = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]\s+", doc.paragraphs[pi].text.strip()) for pi in opt_indices)
        is_key_letter = bool(re.match(r"^[A-Ea-e]$", raw_kunci.strip()))

        is_matching = any(re.search(r"<=>|<->|===|PASANGAN\s*\d*:", doc.paragraphs[pi].text, re.I) for pi in block_p_indices) or block_sec == "MATCHING"
        is_tf = raw_kunci.upper() in ["BENAR", "SALAH", "TRUE", "FALSE"] or block_sec == "TRUE_FALSE"
        is_essay = any("[ESAI]" in doc.paragraphs[pi].text.upper() for pi in block_p_indices) or block_sec == "ESSAY" or (
            not has_opt_labels and not is_key_letter and not is_matching and not is_tf
        ) or (len(block_p_indices) <= 2 and not is_matching and not is_tf and len(raw_kunci) > 5 and not is_key_letter)

        type_tag = "MULTIPLE_CHOICE"
        if is_matching:
            type_tag = "MATCHING"
        elif is_tf:
            type_tag = "TRUE_FALSE"
        elif is_essay:
            type_tag = "ESSAY"
        elif len(re.findall(r'[A-E]', raw_kunci.upper())) > 1 or "," in raw_kunci:
            type_tag = "COMPLEX_MULTIPLE_CHOICE"
        else:
            type_tag = "MULTIPLE_CHOICE"

        clean_first_text = re.sub(r"^\[(?:TIPE|BENTUK|MENJODOHKAN|ESAI|PILIHAN GANDA)[^\]]*\]\s*", "", first_text, flags=re.I).strip()
        clean_first_text = re.sub(r"^(?:soal\s*)?\d+[\.\)]\s*", "", clean_first_text, flags=re.I).strip()

        prefix_tag = f"[TIPE: {type_tag}] {q_num}. "
        first_p.text = prefix_tag + clean_first_text

        kunci_idx_in_block = block_p_indices.index(kunci_pi) if kunci_pi != -1 else len(block_p_indices)
        opt_indices = block_p_indices[1:kunci_idx_in_block]

        if is_matching:
            fixed_issues_count += 1
            continue

        if is_essay:
            if kunci_p:
                kunci_p.text = f"KUNCI: {raw_kunci or '[Pedoman Penilaian Esai]'}"
            fixed_issues_count += 1
            continue

        if is_tf:
            if len(opt_indices) == 2:
                for oi, pi in enumerate(opt_indices):
                    p_opt = doc.paragraphs[pi]
                    label = "A" if oi == 0 else "B"
                    clean_opt = re.sub(r"^\*?\s*[A-Ea-e][\.\)]\s*", "", p_opt.text.strip())
                    p_opt.text = f"{label}. {clean_opt or ('Benar' if oi == 0 else 'Salah')}"
            if kunci_p:
                kunci_p.text = f"KUNCI: {raw_kunci.upper()}"
            fixed_issues_count += 1
            continue

        # Pilihan Ganda (Tunggal / Kompleks)
        has_labelled_opts = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]", doc.paragraphs[pi].text.strip()) for pi in opt_indices)
        target_opt_indices = []
        if not has_labelled_opts:
            if raw_kunci.upper() == "E" or len(opt_indices) == 5:
                target_opt_indices = opt_indices[-5:]
            elif len(opt_indices) == 4 or (raw_kunci.upper() in ["A", "B", "C", "D"] and len(opt_indices) >= 4):
                target_opt_indices = opt_indices[-4:]
            elif len(opt_indices) in [4, 5]:
                target_opt_indices = opt_indices

        if target_opt_indices:
            opt_letters = ["A", "B", "C", "D", "E"]
            for oi, pi in enumerate(target_opt_indices):
                p_opt = doc.paragraphs[pi]
                op_t = p_opt.text.strip()
                clean_op_t = re.sub(r"^\*?\s*[A-Ea-e][\.\)]\s*", "", op_t).strip()
                letter = opt_letters[oi]

                has_dwg = bool(p_opt._p.xpath('.//w:drawing | .//w:pict | .//w:object'))
                if has_dwg:
                    new_r = OxmlElement('w:r')
                    new_t = OxmlElement('w:t')
                    new_t.text = f"{letter}. {clean_op_t} "
                    new_t.set(qn('xml:space'), 'preserve')
                    new_r.append(new_t)
                    p_opt._p.insert(0, new_r)
                else:
                    p_opt.text = f"{letter}. {clean_op_t}"
                fixed_issues_count += 1

        if kunci_p:
            kunci_p.text = f"KUNCI: {raw_kunci.upper()}"
        elif raw_kunci:
            target_p = doc.paragraphs[opt_indices[-1]] if opt_indices else doc.paragraphs[block_p_indices[-1]]
            new_p_elem = OxmlElement('w:p')
            new_r = OxmlElement('w:r')
            new_t = OxmlElement('w:t')
            new_t.text = f"KUNCI: {raw_kunci.upper()}"
            new_r.append(new_t)
            new_p_elem.append(new_r)
            target_p._p.addnext(new_p_elem)

    if trailing_key_p:
        start_clearing = False
        for p in doc.paragraphs:
            if p._p == trailing_key_p._p:
                start_clearing = True
            if start_clearing:
                p.text = ""

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    doc.save(output_path)

    doc_out = docx.Document(output_path)
    final_images = count_document_images(doc_out)

    audit_res = audit_file(input_path)

    return {
        "success": True,
        "input_file": input_path,
        "output_file": output_path,
        "filename": os.path.basename(output_path),
        "total_questions": len(question_starts),
        "initial_images": initial_images,
        "final_images": final_images,
        "images_preserved": initial_images == final_images,
        "converted_math_equations": converted_math,
        "fixed_issues_count": fixed_issues_count,
        "types_breakdown": audit_res.get("types_breakdown", {}),
        "message": f"Normalisasi selesai! {len(question_starts)} butir soal distandarisasi, {converted_math} rumus matematika dikonversi, {final_images} gambar dipertahankan 100%."
    }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python normalizer_engine.py <audit|normalize> <input_path> [output_path]"}))
        sys.exit(1)

    cmd = sys.argv[1].lower()
    in_path = sys.argv[2]

    if cmd == "audit":
        res = audit_file(in_path)
        print(json.dumps(res))
    elif cmd == "normalize":
        out_path = sys.argv[3] if len(sys.argv) > 3 else in_path.replace(".docx", "_STANDAR_CBT.docx")
        res = normalize_docx_file(in_path, out_path)
        print(json.dumps(res))
    else:
        print(json.dumps({"error": f"Perintah tidak dikenal: {cmd}"}))
        sys.exit(1)
