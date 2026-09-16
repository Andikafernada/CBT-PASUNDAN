import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { JWT_SECRET } from "./secret";

export interface TokenPayload {
  userId: string;
  username: string;
  name: string;
  role: string; // ADMIN, TEACHER, OPERATOR, STUDENT
  groupId?: string | null;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cbt_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { group: true },
  });

  if (!user || !user.isActive) return null;
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate password acak 8 karakter alfanumerik yang aman untuk dicetak di kartu.
// Password asli hanya dikembalikan sekali saat create/import/reset, lalu TIDAK disimpan (hanya hash).
export function generateRandomPassword(length: number = 8): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // tanpa karakter ambigu O/0/I/l/1
  let password = "";
  const randomValues = new Uint32Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) randomValues[i] = Math.floor(Math.random() * 0xffffffff);
  }
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}
