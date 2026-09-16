/**
 * Modul Generator Akun Siswa Cerdas (AI & Smart Semantic Fallback)
 * SMK Pasundan 2 Bandung
 * 
 * Integrasi OpenCode AI / OpenAI API & High-Performance Fallback Semantic Generator
 */

import { hashPassword } from "@/lib/auth";

export interface GenerateStudentOptions {
  count: number;
  groupId?: string | null;
  className?: string;
  prefix?: string;
  passwordType?: "PIN_6_DIGIT" | "READABLE_WORD" | "CUSTOM";
  customPassword?: string;
  useAI?: boolean;
}

export interface GeneratedStudentData {
  name: string;
  username: string;
  plainPassword: string;
  hashedPassword: string;
  nis: string;
  groupId?: string | null;
}

export interface GenerateStudentsResult {
  students: GeneratedStudentData[];
  source: "AI_OPENCODE" | "AI_SMART_GENERATOR";
}

const INDONESIAN_FIRST_NAMES = [
  "Ahmad", "Muhammad", "Rizky", "Dimas", "Bintang", "Fajar", "Aditya", "Bagas", "Ilham", "Farhan",
  "Gilang", "Rafi", "Arif", "Hafiz", "Bayu", "Danang", "Eko", "Galih", "Fikri", "Aldi",
  "Siti", "Nur", "Putri", "Aulia", "Anisa", "Dewi", "Rina", "Nabila", "Zahra", "Salma",
  "Dinda", "Fitri", "Tiara", "Indah", "Lestari", "Maya", "Salsabila", "Syifa", "Rahma", "Intan"
];

const INDONESIAN_LAST_NAMES = [
  "Pratama", "Saputra", "Hidayat", "Kusuma", "Wijaya", "Setiawan", "Nugraha", "Ramadhan", "Santoso", "Firmansyah",
  "Maulana", "Wibowo", "Putra", "Pradana", "Utomo", "Kurniawan", "Suryadi", "Gunawan", "Permana", "Subekti",
  "Lestari", "Anggraini", "Wulandari", "Maharani", "Safitri", "Handayani", "Novitasari", "Kusumawardani", "Rahayu", "Puspitasari"
];

const READABLE_WORDS = [
  "hebat", "pintar", "cerdas", "juara", "unggul", "sukses", "berkah", "pasundan", "santun", "mahir",
  "rajin", "kreatif", "amanah", "disiplin", "semangat", "terbaik", "prima", "tanggap", "bijak", "cerah"
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePinPassword(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateReadablePassword(): string {
  const word = getRandomItem(READABLE_WORDS);
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}${num}`;
}

async function fetchNamesFromAI(count: number, className?: string): Promise<string[]> {
  const apiKey = process.env.OPENCODE_API_KEY || process.env.OPENAI_API_KEY;
  const apiEndpoint = process.env.AI_GRADER_ENDPOINT || "https://api.openai.com/v1/chat/completions";
  if (!apiKey) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const sampleCount = Math.min(count, 40);
    const prompt = `Buatkan daftar ${sampleCount} nama lengkap siswa-siswi sekolah Indonesia yang alami, realistis, dan beragam (laki-laki dan perempuan).
Konteks kelas: ${className || "Umum"}.
Berikan HANYA respon dalam format JSON valid (tanpa markdown codeblock dan tanpa teks penjelasan):
{"names": ["Nama 1", "Nama 2", ...]}`;

    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
        messages: [
          { role: "system", content: "Anda adalah AI pembuat data peserta ujian sekolah Indonesia dalam format JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        const cleanJson = content.replace(/```json|```/g, "").trim();
        try {
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed.names) && parsed.names.length > 0) {
            return parsed.names;
          }
        } catch {
          // ignore parsing error, proceed to fallback
        }
      }
    }
  } catch {
    // Graceful fallback to smart generator without log spam
  }
  return [];
}

export async function generateStudentsWithAI(options: GenerateStudentOptions): Promise<GenerateStudentsResult> {
  const count = Math.max(1, Math.min(1000, Number(options.count) || 10));
  const prefix = (options.prefix || "siswa").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const padLength = count >= 1000 ? 4 : count >= 100 ? 3 : 2;

  let aiNames: string[] = [];
  let source: "AI_OPENCODE" | "AI_SMART_GENERATOR" = "AI_SMART_GENERATOR";

  if (options.useAI !== false) {
    aiNames = await fetchNamesFromAI(count, options.className || "");
    if (aiNames.length > 0) {
      source = "AI_OPENCODE";
    }
  }

  const baseYear = new Date().getFullYear().toString().substring(2);
  const randomNisPrefix = `${baseYear}26`;
  const usedUsernames = new Set<string>();
  const students: GeneratedStudentData[] = [];

  for (let i = 1; i <= count; i++) {
    const numStr = String(i).padStart(padLength, "0");
    let username = `${prefix}${numStr}`;
    let suffix = 1;
    while (usedUsernames.has(username)) {
      username = `${prefix}${numStr}_${suffix}`;
      suffix++;
    }
    usedUsernames.add(username);

    // Tentukan Nama
    let fullName = "";
    if (aiNames.length >= i) {
      fullName = aiNames[i - 1];
    } else {
      const fn = getRandomItem(INDONESIAN_FIRST_NAMES);
      const ln = getRandomItem(INDONESIAN_LAST_NAMES);
      fullName = `${fn} ${ln}`;
    }

    // Tentukan Password
    let plainPassword = "";
    if (options.passwordType === "PIN_6_DIGIT") {
      plainPassword = generatePinPassword();
    } else if (options.passwordType === "CUSTOM" && options.customPassword) {
      plainPassword = options.customPassword;
    } else {
      plainPassword = generateReadablePassword();
    }

    const hashedPassword = await hashPassword(plainPassword);
    const nis = `${randomNisPrefix}${String(i).padStart(4, "0")}`;

    students.push({
      name: fullName,
      username,
      plainPassword,
      hashedPassword,
      nis,
      groupId: options.groupId || null,
    });
  }

  return { students, source };
}
