import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { getSessionUser } from "@/lib/auth";

function cleanPlainText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Akses dibatasi hanya untuk Administrator & Guru" }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah" }, { status: 400 });
    }

    const auditResults: any[] = [];

    for (const file of files) {
      const fileName = file.name;
      const lowerName = fileName.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      let parsedQuestions: any[] = [];
      let parseError: string | null = null;

      try {
        if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv")) {
          // --- EXCEL PARSER (Smart Header & Column Matching) ---
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);

          const getVal = (row: any, ...keys: string[]) => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
                return String(row[k]).trim();
              }
              const foundKey = Object.keys(row).find(
                (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, "")
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== "") {
                return String(row[foundKey]).trim();
              }
            }
            return "";
          };

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const content = getVal(row, "Soal", "Pertanyaan", "Question", "Teks Soal", "Soal / Pertanyaan", "Isi Soal");
            if (!content) continue;

            const optA = getVal(row, "Pilihan A", "Opsi A", "A", "Jawaban A");
            const optB = getVal(row, "Pilihan B", "Opsi B", "B", "Jawaban B");
            const optC = getVal(row, "Pilihan C", "Opsi C", "C", "Jawaban C");
            const optD = getVal(row, "Pilihan D", "Opsi D", "D", "Jawaban D");
            const optE = getVal(row, "Pilihan E", "Opsi E", "E", "Jawaban E");

            const rawKey = getVal(row, "Kunci Jawaban", "Kunci", "Jawaban Benar", "Key", "Ans", "Answer", "Kunci Soal");
            let key = rawKey.toUpperCase().trim();

            if (!key) {
              const opts = [
                { label: "A", val: optA },
                { label: "B", val: optB },
                { label: "C", val: optC },
                { label: "D", val: optD },
                { label: "E", val: optE },
              ];
              for (const opt of opts) {
                if (opt.val.startsWith("*") || /\(kunci\)/i.test(opt.val) || /\(benar\)/i.test(opt.val)) {
                  key = opt.label;
                  break;
                }
              }
            }

            const options: any[] = [];
            if (optA) options.push({ label: "A", content: optA, isCorrect: key.includes("A") });
            if (optB) options.push({ label: "B", content: optB, isCorrect: key.includes("B") });
            if (optC) options.push({ label: "C", content: optC, isCorrect: key.includes("C") });
            if (optD) options.push({ label: "D", content: optD, isCorrect: key.includes("D") });
            if (optE) options.push({ label: "E", content: optE, isCorrect: key.includes("E") });

            const isComplex = (key.match(/[A-E]/g) || []).length > 1;

            parsedQuestions.push({
              number: i + 1,
              content,
              type: isComplex ? "COMPLEX_MULTIPLE_CHOICE" : "MULTIPLE_CHOICE",
              options,
              key,
            });
          }
        } else if (lowerName.endsWith(".docx")) {
          // --- MICROSOFT WORD PARSER (Unified Multi-Format & Anchor-Based Segmenter) ---
          const { value: rawHtml } = await mammoth.convertToHtml({ buffer });

          let html = rawHtml;
          // Normalize lists
          html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match: string, listContent: string) => {
            let itemIdx = 1;
            return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, item: string) => {
              const clean = item.replace(/<[^>]+>/g, "").trim();
              if (/^\d+[\.\)]/i.test(clean) || /^[A-Ea-e][\.\)]/i.test(clean)) {
                return `<p>${item}</p>`;
              }
              return `<p>${itemIdx++}. ${item}</p>`;
            });
          });
          html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<p>$1</p>");

          const rawParagraphs = html
            .split(/<\/p>|<br\s*\/?>|<\/tr>/gi)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

          const cleanParas: { html: string; text: string }[] = [];
          for (const rawP of rawParagraphs) {
            const text = cleanPlainText(rawP);
            if (!text && !rawP.includes("<img")) continue;
            if (/^[-=_\*]{3,}$/.test(text)) continue;
            if (/^---\s*BENTUK\s*\d+/i.test(text)) continue;
            if (/^[A-E]\.\s*(?:PILIHAN GANDA|SOAL|PETUNJUK|ESSAY|URAIAN|ISIAN)/i.test(text)) continue;
            if (/^(petunjuk\s+umum|panduan\s+guru|identitas\s+soal|kartu\s+soal)/i.test(text)) continue;
            cleanParas.push({ html: rawP, text });
          }

          // 1. Scan for Endpoints (KUNCI lines or Matching Pairs)
          const endpoints: { index: number; type: "KUNCI" | "MATCHING" }[] = [];
          for (let i = 0; i < cleanParas.length; i++) {
            const t = cleanParas[i].text;
            const isKunci = /^\.?\s*(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*:/i.test(t);
            const isMatching = /<=>|<->|===|PASANGAN\s*\d*:/i.test(t);

            if (isKunci) {
              endpoints.push({ index: i, type: "KUNCI" });
            } else if (isMatching) {
              const nextIsMatching = i + 1 < cleanParas.length && /<=>|<->|===|PASANGAN\s*\d*:/i.test(cleanParas[i + 1].text);
              if (!nextIsMatching) {
                endpoints.push({ index: i, type: "MATCHING" });
              }
            }
          }

          // 2. Parse using Anchor-Based Endpoint Segmentation if endpoints exist
          if (endpoints.length > 0) {
            const starts: number[] = [0];
            for (let k = 1; k < endpoints.length; k++) {
              const prevEnd = endpoints[k - 1].index;
              const currEnd = endpoints[k].index;

              let foundStart = prevEnd + 1;
              for (let cand = prevEnd + 1; cand < currEnd; cand++) {
                const cText = cleanParas[cand].text;
                if (/^\s*\[TIPE:\s*[^\]]+\]/i.test(cText) || /^\s*\d+[\.\)]\s+/.test(cText)) {
                  foundStart = cand;
                  break;
                }
              }
              starts.push(foundStart);
            }

            for (let k = 0; k < endpoints.length; k++) {
              const startIdx = starts[k];
              const endIdx = endpoints[k].index;
              const epType = endpoints[k].type;

              let actualEndIdx = endIdx;
              if (k === endpoints.length - 1) {
                actualEndIdx = cleanParas.length - 1;
              } else if (k + 1 < starts.length) {
                actualEndIdx = starts[k + 1] - 1;
              }

              const qBlock = cleanParas.slice(startIdx, actualEndIdx + 1);

              let key = "";
              let qType = "MULTIPLE_CHOICE";
              const options: any[] = [];
              const matchingPairs: any[] = [];
              const promptLines: string[] = [];

              if (epType === "MATCHING") {
                qType = "MATCHING";
                key = "MATCHING";
                for (const item of qBlock) {
                  if (/<=>|<->|===|PASANGAN\s*\d*:/i.test(item.text)) {
                    const sep = item.text.includes("<=>") ? "<=>" : item.text.includes("<->") ? "<->" : item.text.includes("===") ? "===" : ":";
                    const parts = item.text.split(sep);
                    const left = parts[0].replace(/^(?:PASANGAN|PAIR)\s*\d*[:\.]?\s*/i, "").trim();
                    const right = parts.slice(1).join(sep).trim();
                    matchingPairs.push({ left, right });
                  } else {
                    promptLines.push(item.html);
                  }
                }
              } else {
                let kunciIdxInBlock = -1;
                for (let bi = 0; bi < qBlock.length; bi++) {
                  if (/^\.?\s*(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*:/i.test(qBlock[bi].text)) {
                    kunciIdxInBlock = bi;
                    break;
                  }
                }

                if (kunciIdxInBlock >= 0) {
                  const kLine = qBlock[kunciIdxInBlock];
                  let rawKey = kLine.text.replace(/^\.?\s*(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*:\s*/i, "").trim();
                  const trailingKeyLines = qBlock.slice(kunciIdxInBlock + 1);
                  if (trailingKeyLines.length > 0) {
                    rawKey += " " + trailingKeyLines.map((t) => t.text).join(" ");
                  }
                  key = rawKey.trim();

                  const contentAndOpts = qBlock.slice(0, kunciIdxInBlock);
                  const hasOptLabels = contentAndOpts.some((l) => /^\*?\s*[A-Ea-e][\.\)]\s+/.test(l.text));

                  const isTf = ["BENAR", "SALAH", "TRUE", "FALSE"].includes(key.toUpperCase());
                  const isEssay =
                    contentAndOpts.some((l) => /\[TIPE:\s*ESSAY\]/i.test(l.text)) ||
                    (contentAndOpts.length <= 2 && !hasOptLabels && key.length > 4 && !/^[A-E](?:\s*,\s*[A-E])*$/i.test(key));

                  if (isEssay) {
                    qType = "ESSAY";
                    for (const co of contentAndOpts) promptLines.push(co.html);
                  } else if (isTf) {
                    qType = "TRUE_FALSE";
                    for (const co of contentAndOpts) promptLines.push(co.html);
                    options.push(
                      { label: "A", content: "Benar", isCorrect: ["BENAR", "TRUE"].includes(key.toUpperCase()) },
                      { label: "B", content: "Salah", isCorrect: ["SALAH", "FALSE"].includes(key.toUpperCase()) }
                    );
                  } else if (hasOptLabels) {
                    for (const item of contentAndOpts) {
                      const m = item.text.match(/^\*?\s*([A-Ea-e])[\.\)]\s*(.*)/);
                      if (m) {
                        const label = m[1].toUpperCase();
                        const isCorrect = key.toUpperCase().includes(label);
                        options.push({ label, content: item.html, isCorrect });
                      } else if (options.length === 0) {
                        promptLines.push(item.html);
                      } else {
                        options[options.length - 1].content += "<br/>" + item.html;
                      }
                    }
                    const isComplex = key.split(",").length > 1 || (key.match(/[A-E]/gi) || []).length > 1;
                    qType = isComplex ? "COMPLEX_MULTIPLE_CHOICE" : "MULTIPLE_CHOICE";
                  } else {
                    // Plain options without letter prefixes (PKN & Sejarah format)
                    let optItems: typeof contentAndOpts = [];
                    let promptItems: typeof contentAndOpts = [];

                    if (contentAndOpts.length >= 5) {
                      optItems = contentAndOpts.slice(-5);
                      promptItems = contentAndOpts.slice(0, -5);
                    } else if (contentAndOpts.length >= 4) {
                      optItems = contentAndOpts.slice(-4);
                      promptItems = contentAndOpts.slice(0, -4);
                    } else {
                      promptItems = contentAndOpts;
                    }

                    const labels = ["A", "B", "C", "D", "E"];
                    for (let li = 0; li < optItems.length; li++) {
                      const label = labels[li];
                      const isCorrect = key.toUpperCase().includes(label);
                      options.push({ label, content: optItems[li].html, isCorrect });
                    }
                    for (const pi of promptItems) promptLines.push(pi.html);

                    const isComplex = key.split(",").length > 1 || (key.match(/[A-E]/gi) || []).length > 1;
                    qType = isComplex ? "COMPLEX_MULTIPLE_CHOICE" : "MULTIPLE_CHOICE";
                  }
                }
              }

              let contentHtml = promptLines.join("<br/>");
              contentHtml = contentHtml.replace(/^(?:<p>)?\s*(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?/i, "");

              parsedQuestions.push({
                number: k + 1,
                content: contentHtml,
                type: qType,
                key,
                options,
                matchingPairs,
              });
            }
          } else {
            // Fallback: Numbered Question Scanner for older formats without inline KUNCI
            let currentQ: any = null;
            let qNum = 1;
            const globalKeyMap: Record<number, string> = {};

            for (const rawP of rawParagraphs) {
              const clean = cleanPlainText(rawP);
              const tableMatches = clean.matchAll(/(?:^|[\s,;|])(\d+)[\.\:=]\s*([A-Ea-e])(?=[\s,;|]|$)/g);
              for (const match of tableMatches) {
                const num = parseInt(match[1]);
                const k = match[2].toUpperCase();
                globalKeyMap[num] = k;
              }
            }

            for (const p of rawParagraphs) {
              const cleanText = cleanPlainText(p);
              if (/^[-=_\*]{3,}$/.test(cleanText) || /^(petunjuk|panduan|identitas|kartu soal)/i.test(cleanText)) {
                continue;
              }

              const qHeaderMatch = cleanText.match(/^(?:soal\s*)?(?:\[[^\]]+\]\s*)?(\d+)[\.\)]\s*(.*)/i);
              const isOptionLine = /^\*?\s*([A-Ea-e])[\.\)]\s*(.*)/.test(cleanText);
              const keyHeaderMatch = cleanText.match(/^(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?|key|ans)\s*[:=]\s*([A-Ea-e])/i);

              if (qHeaderMatch && !isOptionLine && !keyHeaderMatch) {
                if (currentQ) parsedQuestions.push(currentQ);
                const num = parseInt(qHeaderMatch[1]);
                currentQ = {
                  number: num || qNum++,
                  content: p,
                  options: [],
                  type: "MULTIPLE_CHOICE",
                  key: globalKeyMap[num] || "",
                };
              } else if (keyHeaderMatch && currentQ) {
                const inlineKey = keyHeaderMatch[1].toUpperCase();
                currentQ.key = inlineKey;
                for (const opt of currentQ.options) {
                  if (opt.label === inlineKey) opt.isCorrect = true;
                }
              } else if (isOptionLine && currentQ) {
                const optMatch = cleanText.match(/^\*?\s*([A-Ea-e])[\.\)]\s*(.*)/);
                if (optMatch) {
                  const label = optMatch[1].toUpperCase();
                  const isCorrect = currentQ.key === label || cleanText.startsWith("*");
                  if (isCorrect && !currentQ.key) currentQ.key = label;
                  currentQ.options.push({ label, content: p, isCorrect });
                }
              } else if (currentQ && currentQ.options.length === 0) {
                currentQ.content += "<br/>" + p;
              }
            }
            if (currentQ) parsedQuestions.push(currentQ);

            for (const q of parsedQuestions) {
              if (!q.key && globalKeyMap[q.number]) {
                q.key = globalKeyMap[q.number];
                for (const opt of q.options) {
                  if (opt.label === q.key) opt.isCorrect = true;
                }
              }
            }
          }
        }
      } catch (err: any) {
        parseError = err.message;
      }

      // Quality Audit Checks
      const errors: string[] = [];
      const warnings: string[] = [];

      if (parseError) {
        errors.push(`Gagal membaca file: ${parseError}`);
      } else if (parsedQuestions.length === 0) {
        errors.push("Tidak ada butir soal yang terdeteksi dalam file ini.");
      } else {
        let missingKeyCount = 0;
        let missingOptionCount = 0;
        let shortPromptCount = 0;

        for (const q of parsedQuestions) {
          const isMatching = q.type === "MATCHING";
          const hasKey =
            (q.options && q.options.some((opt: any) => opt.isCorrect)) ||
            (q.key && q.key.length > 0) ||
            (isMatching && q.matchingPairs && q.matchingPairs.length > 0);

          if (!hasKey) missingKeyCount++;
          if (q.type === "MULTIPLE_CHOICE" && q.options && q.options.length > 0 && q.options.length < 4) {
            missingOptionCount++;
          }
          if (q.content && q.content.replace(/<[^>]+>/g, "").trim().length < 5) {
            shortPromptCount++;
          }
        }

        if (missingKeyCount > 0) {
          errors.push(`${missingKeyCount} butir soal kunci jawabannya tidak terdeteksi.`);
        }
        if (missingOptionCount > 0) {
          warnings.push(`${missingOptionCount} butir soal memiliki opsi pilihan kurang dari 4.`);
        }
        if (shortPromptCount > 0) {
          warnings.push(`${shortPromptCount} butir soal teks pertanyaannya sangat pendek / terpotong.`);
        }
      }

      const status = errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "VALID";

      auditResults.push({
        fileName,
        fileSize: file.size,
        totalQuestions: parsedQuestions.length,
        status, // VALID, WARNING, ERROR
        errors,
        warnings,
        questionsSample: parsedQuestions.slice(0, 5),
      });
    }

    const validFilesCount = auditResults.filter((r) => r.status === "VALID").length;
    const warningFilesCount = auditResults.filter((r) => r.status === "WARNING").length;
    const errorFilesCount = auditResults.filter((r) => r.status === "ERROR").length;

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      summary: {
        valid: validFilesCount,
        warning: warningFilesCount,
        error: errorFilesCount,
      },
      results: auditResults,
    });
  } catch (error: any) {
    console.error("Batch Audit API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
