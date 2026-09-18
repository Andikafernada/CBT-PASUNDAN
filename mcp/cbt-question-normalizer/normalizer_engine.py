import docx
import re
import os
import shutil

def has_drawing(p):
    return (
        len(p._p.xpath('.//a:blip')) > 0
        or len(p._p.xpath('.//w:drawing')) > 0
        or len(p._p.xpath('.//w:pict')) > 0
    )

def count_document_images(doc):
    count = 0
    for p in doc.paragraphs:
        count += len(p._p.xpath('.//a:blip'))
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    count += len(p._p.xpath('.//a:blip'))
    return count

def safe_set_paragraph_text(p, new_text):
    if not has_drawing(p):
        p.text = new_text
    else:
        text_runs = [r for r in p.runs if r.text.strip()]
        if text_runs:
            text_runs[0].text = new_text
            for r in text_runs[1:]:
                r.text = ""
        else:
            p.add_run(new_text)

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

    valid_p_indices = []
    for i, p in enumerate(paragraphs):
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

    endpoints = []
    for vi, p_idx in enumerate(valid_p_indices):
        p = paragraphs[p_idx]
        t = p.text.strip()
        if re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", t, re.I):
            endpoints.append((vi, "KUNCI"))
        elif re.search(r"<=>|<->|===|PASANGAN\s*\d*:", t, re.I):
            if vi + 1 >= len(valid_p_indices):
                endpoints.append((vi, "MATCHING"))
            else:
                next_p = paragraphs[valid_p_indices[vi + 1]]
                if not re.search(r"<=>|<->|===|PASANGAN\s*\d*:", next_p.text.strip(), re.I):
                    endpoints.append((vi, "MATCHING"))

    q_count = len(endpoints)
    unlabelled_options_count = 0
    unnumbered_questions_count = 0

    starts = [0]
    for k in range(1, len(endpoints)):
        prev_end = endpoints[k - 1][0]
        curr_end = endpoints[k][0]
        found_start = prev_end + 1
        for cand in range(prev_end + 1, curr_end):
            c_text = paragraphs[valid_p_indices[cand]].text.strip()
            if re.match(r"^\s*\[TIPE:\s*[^\]]+\]", c_text, re.I) or re.match(r"^\s*\d+[\.\)]\s+", c_text):
                found_start = cand
                break
        starts.append(found_start)

    for k in range(len(endpoints)):
        start_vi = starts[k]
        end_vi = endpoints[k][0]
        actual_end_vi = len(valid_p_indices) - 1 if k == len(endpoints) - 1 else (starts[k + 1] - 1 if k + 1 < len(starts) else end_vi)
        block_indices = [valid_p_indices[x] for x in range(start_vi, actual_end_vi + 1)]

        first_p = paragraphs[block_indices[0]]
        if not re.match(r"^\s*\d+[\.\)]", first_p.text.strip()):
            unnumbered_questions_count += 1

        if endpoints[k][1] == "KUNCI":
            kunci_p_idx = -1
            for pi in block_indices:
                if re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", paragraphs[pi].text.strip(), re.I):
                    kunci_p_idx = pi
                    break
            if kunci_p_idx >= 0:
                kunci_pos = block_indices.index(kunci_p_idx)
                content_opts = block_indices[:kunci_pos]
                raw_k = re.sub(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:\s*", "", paragraphs[kunci_p_idx].text.strip(), flags=re.I).strip()
                has_opt_labels = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]\s+", paragraphs[pi].text.strip()) for pi in content_opts)
                is_tf = raw_k.upper() in ["BENAR", "SALAH", "TRUE", "FALSE"]
                is_essay = any("[TIPE: ESSAY]" in paragraphs[pi].text.upper() for pi in content_opts) or (
                    not has_opt_labels and len(raw_k) > 8 and not re.match(r"^[A-E](?:\s*,\s*[A-E])*$", raw_k.strip()) and raw_k.strip().upper() not in ["BENAR", "SALAH", "TRUE", "FALSE"]
                )
                candidates = [pi for pi in content_opts if paragraphs[pi].text.strip()]
                if not is_tf and not is_essay and len(candidates) >= 4 and not has_opt_labels:
                    unlabelled_options_count += 1

    needs_normalization = unnumbered_questions_count > 0 or unlabelled_options_count > 0

    return {
        "file_name": os.path.basename(filepath),
        "total_paragraphs": total_paras,
        "total_images": total_images,
        "total_questions": q_count,
        "unnumbered_questions": unnumbered_questions_count,
        "questions_without_opt_labels": unlabelled_options_count,
        "status": "VALID_STANDAR" if not needs_normalization else "NEEDS_NORMALIZATION",
        "recommendation": "File sudah rapi sesuai standar CBT" if not needs_normalization else "Perlu dinormalisasi: tambahkan nomor soal dan label opsi A-E otomatis"
    }

def normalize_docx_file(input_path: str, output_path: str = "") -> dict:
    if not os.path.exists(input_path):
        return {"error": f"File input tidak ditemukan: {input_path}"}

    if not output_path:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_NORMALIZED{ext}"

    doc = docx.Document(input_path)
    initial_images = count_document_images(doc)

    paragraphs = doc.paragraphs
    valid_p_indices = []
    for i, p in enumerate(paragraphs):
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

    endpoints = []
    for vi, p_idx in enumerate(valid_p_indices):
        p = paragraphs[p_idx]
        t = p.text.strip()
        if re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", t, re.I):
            endpoints.append((vi, "KUNCI"))
        elif re.search(r"<=>|<->|===|PASANGAN\s*\d*:", t, re.I):
            if vi + 1 >= len(valid_p_indices):
                endpoints.append((vi, "MATCHING"))
            else:
                next_p = paragraphs[valid_p_indices[vi + 1]]
                if not re.search(r"<=>|<->|===|PASANGAN\s*\d*:", next_p.text.strip(), re.I):
                    endpoints.append((vi, "MATCHING"))

    if not endpoints:
        return {"error": "Tidak ada pembatas soal atau kunci yang terdeteksi dalam file ini"}

    starts = [0]
    for k in range(1, len(endpoints)):
        prev_end = endpoints[k - 1][0]
        curr_end = endpoints[k][0]
        found_start = prev_end + 1
        for cand in range(prev_end + 1, curr_end):
            c_text = paragraphs[valid_p_indices[cand]].text.strip()
            if re.match(r"^\s*\[TIPE:\s*[^\]]+\]", c_text, re.I) or re.match(r"^\s*\d+[\.\)]\s+", c_text):
                found_start = cand
                break
        starts.append(found_start)

    for k in range(len(endpoints)):
        q_num = k + 1
        start_vi = starts[k]
        end_vi = endpoints[k][0]
        ep_type = endpoints[k][1]

        actual_end_vi = len(valid_p_indices) - 1 if k == len(endpoints) - 1 else (starts[k + 1] - 1 if k + 1 < len(starts) else end_vi)
        block_p_indices = [valid_p_indices[x] for x in range(start_vi, actual_end_vi + 1)]

        if ep_type == "MATCHING":
            first_p = paragraphs[block_p_indices[0]]
            t_first = first_p.text.strip()
            if not re.match(rf"^\s*{q_num}[\.\)]", t_first):
                clean_t = re.sub(r"^(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?", "", t_first)
                safe_set_paragraph_text(first_p, f"{q_num}. {clean_t}")
        else:
            kunci_p_idx = -1
            for pi in block_p_indices:
                if re.match(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:", paragraphs[pi].text.strip(), re.I):
                    kunci_p_idx = pi
                    break

            if kunci_p_idx >= 0:
                kunci_pos = block_p_indices.index(kunci_p_idx)
                content_opts_indices = block_p_indices[:kunci_pos]

                k_p = paragraphs[kunci_p_idx]
                raw_k = re.sub(r"^\.?\s*(?:KUNCI|JAWABAN|KEY)\s*:\s*", "", k_p.text.strip(), flags=re.I).strip()
                safe_set_paragraph_text(k_p, f"KUNCI: {raw_k}")

                has_opt_labels = any(re.match(r"^\*?\s*[A-Ea-e][\.\)]\s+", paragraphs[pi].text.strip()) for pi in content_opts_indices)
                is_tf = raw_k.upper() in ["BENAR", "SALAH", "TRUE", "FALSE"]
                is_essay = any("[TIPE: ESSAY]" in paragraphs[pi].text.upper() for pi in content_opts_indices) or (
                    not has_opt_labels and len(raw_k) > 8 and not re.match(r"^[A-E](?:\s*,\s*[A-E])*$", raw_k.strip()) and raw_k.strip().upper() not in ["BENAR", "SALAH", "TRUE", "FALSE"]
                )

                if content_opts_indices:
                    first_p = paragraphs[content_opts_indices[0]]
                    t_first = first_p.text.strip()
                    if not re.match(rf"^\s*{q_num}[\.\)]", t_first):
                        clean_t = re.sub(r"^(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?", "", t_first)
                        safe_set_paragraph_text(first_p, f"{q_num}. {clean_t}")

                if not is_essay and not is_tf:
                    if not has_opt_labels:
                        candidates = [pi for pi in content_opts_indices if paragraphs[pi].text.strip()]
                        opt_indices = []
                        if len(candidates) >= 5:
                            opt_indices = candidates[-5:]
                        elif len(candidates) >= 4:
                            opt_indices = candidates[-4:]

                        labels = ["A", "B", "C", "D", "E"]
                        for li, opi in enumerate(opt_indices):
                            p_opt = paragraphs[opi]
                            opt_text = p_opt.text.strip()
                            if not re.match(r"^[A-E][\.\)]", opt_text):
                                safe_set_paragraph_text(p_opt, f"{labels[li]}. {opt_text}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc.save(output_path)

    doc_out = docx.Document(output_path)
    final_images = count_document_images(doc_out)

    return {
        "success": True,
        "input_file": input_path,
        "output_file": output_path,
        "total_questions": len(endpoints),
        "initial_images": initial_images,
        "final_images": final_images,
        "images_preserved": initial_images == final_images,
        "message": f"Normalisasi selesai! {len(endpoints)} butir soal distandarisasi, {final_images} gambar dipertahankan 100%."
    }

def batch_normalize_folder(folder_path: str, output_folder: str = "") -> dict:
    if not os.path.exists(folder_path):
        return {"error": f"Folder tidak ditemukan: {folder_path}"}

    if not output_folder:
        output_folder = os.path.join(folder_path, "NORMALIZED_CBT")

    os.makedirs(output_folder, exist_ok=True)

    results = []
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".docx") and not f.startswith("~$")]

    for f in sorted(files):
        in_file = os.path.join(folder_path, f)
        base, ext = os.path.splitext(f)
        out_file = os.path.join(output_folder, f"{base}_STANDAR{ext}")
        res = normalize_docx_file(in_file, out_file)
        results.append(res)

    return {
        "success": True,
        "total_files": len(files),
        "output_folder": output_folder,
        "results": results
    }
