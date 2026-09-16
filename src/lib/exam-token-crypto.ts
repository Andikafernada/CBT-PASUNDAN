import crypto from "crypto";

/**
 * Deterministically generates an HMAC-SHA256 token for a matching response
 * keyed to the active session ID.
 * This prevents students from discovering the answer key by comparing
 * premise.id with response.id in browser memory/network payloads.
 */
export function getMatchingResponseToken(pairId: string, sessionId: string = ""): string {
  const secret = process.env.NEXTAUTH_SECRET || "cbt-hebat-smk-pasundan-2-bandung-secret-key-2026";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`matching_pair:${pairId}:${sessionId}`);
  return "resp_" + hmac.digest("hex").slice(0, 16);
}
