import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "super-secure-production-cbt-key-2026-proxmox";

/**
 * Generate a 6-character uppercase alphanumeric dynamic token that refreshes every 15 minutes.
 * @param examId The ID of the exam
 * @param windowOffset 0 for current 15-min window, -1 for previous window (grace period)
 */
export function getDynamicToken(examId: string, windowOffset: number = 0): string {
  const windowMs = 15 * 60 * 1000;
  const currentWindow = Math.floor(Date.now() / windowMs) + windowOffset;
  const raw = `${examId}-${currentWindow}-${JWT_SECRET}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
  // Filter only letters and numbers (excluding confusing chars like 0, O, 1, I)
  const clean = hash.replace(/[0O1I]/g, "");
  return clean.substring(0, 6);
}

/**
 * Get remaining seconds until the next dynamic token refresh.
 */
export function getDynamicTokenSecondsRemaining(): number {
  const windowMs = 15 * 60 * 1000;
  const elapsedInWindow = Date.now() % windowMs;
  return Math.floor((windowMs - elapsedInWindow) / 1000);
}

/**
 * Verify whether an input token matches either the static token or current/previous dynamic token.
 */
export function verifyExamToken(
  inputToken: string,
  exam: { id: string; token: string | null; isTokenDynamic: boolean }
): boolean {
  const trimmed = inputToken.trim().toUpperCase();

  if (exam.isTokenDynamic) {
    const currentDynamic = getDynamicToken(exam.id, 0);
    const previousDynamic = getDynamicToken(exam.id, -1); // 15-minute grace period
    const staticFallback = (exam.token || "ZYACBT").toUpperCase();
    return trimmed === currentDynamic || trimmed === previousDynamic || trimmed === staticFallback;
  }

  const expected = (exam.token || "ZYACBT").toUpperCase();
  return trimmed === expected;
}
