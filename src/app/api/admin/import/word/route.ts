import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import sharp from "sharp";
import { getSessionUser } from "@/lib/auth";

function decodeHtmlText(raw: string): string {
  // Preserve <=> and other arrow separators from being stripped as html tags
  let text = raw
    .replace(/&lt;=&gt;|<=>/gi, " __MATCH_ARROW_EQ__ ")
    .replace(/&lt;-&gt;|<->/gi, " __MATCH_ARROW_DASH__ ")
    .replace(/===/g, " __MATCH_ARROW_TRIPLE__ ");

  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (_match, src) => {
    return ` <img src="${src}" alt="Gambar Soal" /> `;
  });
  text = text.replace(/<(?!\/?(?:img|sup|sub|b|strong|i|em|u)\b)[^>]+>/gi, "");
  text = text
    .replace(/__MATCH_ARROW_EQ__/g, "<=>")
    .replace(/__MATCH_ARROW_DASH__/g, "<->")
    .replace(/__MATCH_ARROW_TRIPLE__/g, "===")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text;
}

function cleanPlainText(raw: string): string {
  return raw
    .replace(/&lt;=&gt;|<=>/gi, " __MATCH_ARROW_EQ__ ")
    .replace(/&lt;-&gt;|<->/gi, " __MATCH_ARROW_DASH__ ")
    .replace(/===/g, " __MATCH_ARROW_TRIPLE__ ")
    .replace(/<[^>]+>/g, "")
    .replace(/__MATCH_ARROW_EQ__/g, "<=>")
    .replace(/__MATCH_ARROW_DASH__/g, "<->")
    .replace(/__MATCH_ARROW_TRIPLE__/g, "===")
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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File soal (.docx atau .xlsx) tidak ditemukan" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const questions: any[] = [];

    // 1. Handle Excel (.xlsx / .xls / .csv)
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rawRows || rawRows.length === 0) {
        return NextResponse.json({ error: "File Excel soal kosong atau format tidak sesuai" }, { status: 400 });
      }

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            const foundKey = Object.keys(row).find(
              (rk) => rk.toLowerCase().trim() === k.toLowerCase().trim()
            );
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
              return String(row[foundKey]).trim();
            }
          }
          return "";
        };

        const content = getVal("soal", "pertanyaan", "question", "content", "isi");
        if (!content) continue;

        let rawType = getVal("tipe", "type", "bentuk").toUpperCase();
        let qType = "MULTIPLE_CHOICE";
        if (rawType.includes("KOMPLEKS") || rawType.includes("MC") || rawType.includes("COMPLEX")) {
          qType = "COMPLEX_MULTIPLE_CHOICE";
        } else if (rawType.includes("BENAR") || rawType.includes("TF") || rawType.includes("TRUE")) {
          qType = "TRUE_FALSE";
        } else if (rawType.includes("JODOH") || rawType.includes("MATCH")) {
          qType = "MATCHING";
        } else if (rawType.includes("ESAI") || rawType.includes("ESSAY") || rawType.includes("URAIAN")) {
          qType = "ESSAY";
        }

        const optA = getVal("opsi_a", "opsi a", "pilihan a", "a");
        const optB = getVal("opsi_b", "opsi b", "pilihan b", "b");
        const optC = getVal("opsi_c", "opsi c", "pilihan c", "c");
        const optD = getVal("opsi_d", "opsi d", "pilihan d", "d");
        const optE = getVal("opsi_e", "opsi e", "pilihan e", "e");

        const rawKey = getVal("kunci", "kunci_jawaban", "jawaban", "key", "answer").toUpperCase();
        const difficulty = getVal("tingkat", "kesulitan", "difficulty") || "MEDIUM";
        const points = parseFloat(getVal("bobot", "poin", "points")) || 1.0;

        const options: any[] = [];
        if (optA) options.push({ label: "A", content: optA, isCorrect: rawKey.includes("A") });
        if (optB) options.push({ label: "B", content: optB, isCorrect: rawKey.includes("B") });
        if (optC) options.push({ label: "C", content: optC, isCorrect: rawKey.includes("C") });
        if (optD) options.push({ label: "D", content: optD, isCorrect: rawKey.includes("D") });
        if (optE) options.push({ label: "E", content: optE, isCorrect: rawKey.includes("E") });

        questions.push({
          number: questions.length + 1,
          content,
          type: qType,
          difficulty: ["EASY", "MEDIUM", "HARD"].includes(difficulty.toUpperCase()) ? difficulty.toUpperCase() : "MEDIUM",
          points,
          correctAnswer: rawKey,
          options,
          matchingPairs: [],
        });
      }

      return NextResponse.json({
        success: true,
        fileType: "EXCEL",
        parsedCount: questions.length,
        questions,
      });
    }

    // 2. Handle Word (.docx) with Mammoth & Sharp Base64 image compression
    const optionsMammoth = {
      convertImage: (mammoth.images as any).imgElement((image: any) => {
        return image.read().then(async (imageBuffer: Buffer) => {
          try {
            const optimized = await sharp(imageBuffer)
              .resize({ width: 800, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            return {
              src: `data:image/webp;base64,${optimized.toString("base64")}`,
            };
          } catch {
            return image.readAsBase64String().then((b64: string) => ({
              src: `data:${image.contentType};base64,${b64}`,
            }));
          }
        });
      }),
    };

    const result = await mammoth.convertToHtml({ buffer }, optionsMammoth);
    let html = result.value;

    // Normalize list items in HTML
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match: string, listContent: string) => {
      let itemIdx = 1;
      const converted = listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, item: string) => {
        const cleanText = item.replace(/<[^>]+>/g, "").trim();
        if (/^(?:\[[^\]]+\]\s*)?(?:\d+|[A-Ea-e])[\.\)]/i.test(cleanText)) {
          return `</p><p>${item}</p><p>`;
        }
        return `</p><p>${itemIdx++}. ${item}</p><p>`;
      });
      return `</p><p>${converted}</p><p>`;
    });

    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m: string, listContent: string) => {
      return `</p><p>${listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "</p><p>$1</p><p>")}</p><p>`;
    });

    html = html.replace(/<[ou]l[^>]*>/gi, "</p><p>");
    html = html.replace(/<\/[ou]l>/gi, "</p><p>");
    html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "</p><p>$1</p><p>");

    const rawParagraphs = html
      .split(/<\/p>|<br\s*\/?>|<\/tr>/gi)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const cleanParas: { html: string; text: string }[] = [];
    for (const rawP of rawParagraphs) {
      const decodedHtml = decodeHtmlText(rawP);
      const text = cleanPlainText(decodedHtml);
      if (!text && !decodedHtml.includes("<img")) continue;
      if (/^[-=_\*]{3,}$/.test(text)) continue;
      if (/^---\s*BENTUK\s*\d+/i.test(text)) continue;
      if (/^[A-E]\.\s*(?:PILIHAN GANDA|SOAL|PETUNJUK|ESSAY|URAIAN|ISIAN)/i.test(text)) continue;
      if (/^(petunjuk\s+umum|panduan\s+guru|identitas\s+soal|kartu\s+soal)/i.test(text)) continue;
      cleanParas.push({ html: decodedHtml, text });
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
            if (/<=>|<->|===|=>|->|PASANGAN\s*\d*:/i.test(item.text)) {
              let sep = "";
              if (item.text.includes("<=>")) sep = "<=>";
              else if (item.text.includes("<->")) sep = "<->";
              else if (item.text.includes("===")) sep = "===";
              else if (item.text.includes("=>")) sep = "=>";
              else if (item.text.includes("->")) sep = "->";
              else if (item.text.includes(":")) {
                const afterPasangan = item.text.replace(/^(?:PASANGAN|PAIR|ITEM)\s*[A-Za-z0-9]*\s*[:\.]?\s*/i, "");
                if (afterPasangan.includes(":")) {
                  sep = ":";
                }
              }

              if (sep) {
                let left = "";
                let right = "";

                if (sep === ":") {
                  const withoutHeader = item.text.replace(/^(?:PASANGAN|PAIR|ITEM)\s*[A-Za-z0-9]*\s*[:\.]?\s*/i, "");
                  const parts = withoutHeader.split(":");
                  left = parts[0].trim();
                  right = parts.slice(1).join(":").trim();
                } else {
                  const parts = item.text.split(sep);
                  left = parts[0].trim().replace(/^(?:PASANGAN|PAIR|ITEM)\s*[A-Za-z0-9]*\s*[:\.]?\s*/i, "");
                  right = parts.slice(1).join(sep).trim();
                }

                left = left.replace(/^\d+[\.\)]\s*/, "").replace(/^[A-Za-z][\.\)]\s*/, "").trim();

                if (left && right) {
                  matchingPairs.push({
                    premise: left,
                    response: right,
                    orderIndex: matchingPairs.length,
                  });
                  continue;
                }
              }
            }
            promptLines.push(item.html);
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

            const isTf =
              ["BENAR", "SALAH", "TRUE", "FALSE"].includes(key.toUpperCase()) ||
              contentAndOpts.some((l) => /\[TIPE:\s*TF\]/i.test(l.text));
            const isEssay =
              contentAndOpts.some((l) => /\[TIPE:\s*ESSAY\]/i.test(l.text)) ||
              (contentAndOpts.length <= 2 && !hasOptLabels && key.length > 4 && !/^[A-E](?:\s*,\s*[A-E])*$/i.test(key));

            if (isEssay) {
              qType = "ESSAY";
              for (const co of contentAndOpts) promptLines.push(co.html);
            } else if (isTf) {
              qType = "TRUE_FALSE";
              for (const co of contentAndOpts) {
                if (!/^(?:[A-B][\.\)]\s*)?(?:benar|salah|true|false)$/i.test(co.text.trim())) {
                  promptLines.push(co.html);
                }
              }
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
        contentHtml = contentHtml.replace(/^(?:<p>)?\s*(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?/i, "").trim();

        if (!contentHtml) {
          if (options.length > 2 && /^\s*(?:\[TIPE:[^\]]+\]\s*)?\d+[\.\)]/i.test(options[0].content.replace(/<[^>]+>/g, "").trim())) {
            const recovered = options.shift();
            contentHtml = recovered.content.replace(/^(?:<p>)?\s*(?:\[TIPE:[^\]]+\]\s*)?(?:\d+[\.\)]\s*)?/i, "").trim();
            const labels = ["A", "B", "C", "D", "E"];
            for (let oi = 0; oi < options.length; oi++) {
              options[oi].label = labels[oi] || String.fromCharCode(65 + oi);
            }
          }
        }

        if (!contentHtml) {
          contentHtml = qType === "MATCHING"
            ? "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan:"
            : `Soal Nomor ${k + 1}`;
        }

        questions.push({
          number: k + 1,
          content: contentHtml,
          type: qType,
          difficulty: "MEDIUM",
          points: 1.0,
          correctAnswer: key,
          options,
          matchingPairs,
        });
      }
    } else {
      // Fallback: Numbered Question Scanner for older formats without inline KUNCI
      let currentQuestion: any = null;

      let activeSectionType: string | null = null;
      for (let p of cleanParas.map((c) => c.html)) {
        const pText = cleanPlainText(p);
        const sectionMatch = pText.match(/^\[(?:TIPE|BENTUK|BAGIAN)?\s*:?\s*([A-Za-z_\/\s]+)\]$/i);
        if (sectionMatch) {
          const sTag = sectionMatch[1].toUpperCase();
          if (sTag.includes("MC") || sTag.includes("KOMPLEKS")) activeSectionType = "COMPLEX_MULTIPLE_CHOICE";
          else if (sTag.includes("TF") || sTag.includes("BENAR") || sTag.includes("SALAH")) activeSectionType = "TRUE_FALSE";
          else if (sTag.includes("MATCH") || sTag.includes("JODOH")) activeSectionType = "MATCHING";
          else if (sTag.includes("ESAI") || sTag.includes("ESSAY") || sTag.includes("URAIAN") || sTag.includes("ISIAN")) activeSectionType = "ESSAY";
          else if (sTag.includes("PILIHAN GANDA") || sTag.includes("PG")) activeSectionType = "MULTIPLE_CHOICE";
          continue;
        }


        const hasPairSep = pText.includes("<=>") || pText.includes("<->") || pText.includes("===") || (pText.toUpperCase().startsWith("PASANGAN") && (pText.includes(":") || pText.includes("<=")));
        if (hasPairSep && currentQuestion) {
          let sep = "<=>";
          if (pText.includes("<=>")) sep = "<=>";
          else if (pText.includes("<->")) sep = "<->";
          else if (pText.includes("===")) sep = "===";
          else if (pText.includes(":")) sep = ":";

          const parts = pText.split(sep);
          if (parts.length >= 2) {
            let left = parts[0].trim();
            let right = parts.slice(1).join(sep).trim();

            left = left
              .replace(/^(?:PASANGAN|PAIR|ITEM)\s*[A-Za-z0-9]*\s*[:\.]?\s*/i, "")
              .replace(/^\d+[\.\)]\s*/, "")
              .replace(/^[A-Za-z][\.\)]\s*/, "")
              .trim();

            if (left && right) {
              currentQuestion.type = "MATCHING";
              currentQuestion.matchingPairs.push({
                premise: left,
                response: right,
                orderIndex: currentQuestion.matchingPairs.length,
              });
              continue;
            }
          }
        }

        const qMatch = pText.match(/^(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*([A-Za-z_\/]+)\]\s*)?(.*)/i);
        const optMatch = pText.match(/^([A-Ea-e])[\.\)]\s*(.*)/);
        const keyMatch = pText.match(/^(?:KUNCI|JAWABAN|KEY)\s*:\s*(.+)/i);

        if (qMatch) {
          if (currentQuestion) questions.push(currentQuestion);
          const tag = (qMatch[1] || qMatch[3] || "").toUpperCase();
          let qType = "MULTIPLE_CHOICE";
          if (tag.includes("MC") || tag.includes("KOMPLEKS")) qType = "COMPLEX_MULTIPLE_CHOICE";
          else if (tag.includes("TF") || tag.includes("BENAR") || tag.includes("SALAH")) qType = "TRUE_FALSE";
          else if (tag.includes("MATCH") || tag.includes("JODOH")) qType = "MATCHING";
          else if (tag.includes("ESSAY") || tag.includes("URAIAN") || tag.includes("ISIAN")) qType = "ESSAY";

          let qContent = p.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
          qContent = qContent.replace(/^(?:<[^>]+>)*\s*(?:\[TIPE:\s*[A-Za-z_\/]+\]\s*)?(\d+)[\.\)]\s*(?:\[TIPE:\s*[A-Za-z_\/]+\]\s*)?(?:<\/[^>]+>)?\s*/i, "").trim();
          if (!qContent) qContent = qMatch[4].trim();

          currentQuestion = {
            number: parseInt(qMatch[2]),
            content: qContent,
            type: qType,
            options: [],
            matchingPairs: [],
            correctAnswer: "",
            points: 1.0,
            difficulty: "MEDIUM",
          };
        } else if (keyMatch && currentQuestion) {
          const rawKey = keyMatch[1].replace(/<[^>]+>/g, "").trim().toUpperCase();
          currentQuestion.correctAnswer = rawKey;

          if (["BENAR", "SALAH", "TRUE", "FALSE"].includes(rawKey)) {
            currentQuestion.type = "TRUE_FALSE";
          } else if (currentQuestion.type === "MULTIPLE_CHOICE") {
            if (rawKey.includes(",") || (rawKey.match(/[A-E]/g) || []).length > 1) {
              currentQuestion.type = "COMPLEX_MULTIPLE_CHOICE";
            }
          }

          currentQuestion.options = currentQuestion.options.map((opt: any) => {
            let isCorrect = false;
            if (["BENAR", "TRUE"].includes(rawKey)) {
              isCorrect = (opt.label === "A" || opt.content.toLowerCase().includes("benar"));
            } else if (["SALAH", "FALSE"].includes(rawKey)) {
              isCorrect = (opt.label === "B" || opt.content.toLowerCase().includes("salah"));
            } else {
              isCorrect = rawKey.includes(opt.label);
            }
            return { ...opt, isCorrect };
          });
          } else if (optMatch && currentQuestion) {
            let optContent = p.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "").trim();
            optContent = optContent.replace(/^(?:<[^>]+>)*\s*([A-Ea-e])[\.\)]\s*(?:<\/[^>]+>)?\s*/i, "").trim();
            if (!optContent) optContent = optMatch[2].trim();

            currentQuestion.options.push({
              label: optMatch[1].toUpperCase(),
              content: optContent,
              isCorrect: false,
            });
          if (currentQuestion.options.length === 0) {
            currentQuestion.content = (currentQuestion.content ? currentQuestion.content + "<br/>" : "") + p;
          } else {
            currentQuestion.options[currentQuestion.options.length - 1].content += " " + p;
          }
        }
      }

      if (currentQuestion) {
        questions.push(currentQuestion);
      }
    }

    const sanitizedQuestions = questions.map((q, idx) => {
      let content = (q.content || "").trim();
      if (!content) {
        content = q.type === "MATCHING"
          ? "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan:"
          : `Soal Nomor ${q.number || idx + 1}`;
      }
      return { ...q, content };
    });

    return NextResponse.json({
      success: true,
      fileType: "WORD",
      parsedCount: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    });
  } catch (error: any) {
    console.error("Word Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
