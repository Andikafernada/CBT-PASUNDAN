import { describe, it, expect } from "vitest";
import {
  gradeMultipleChoice,
  gradeComplexMultipleChoice,
  gradeMatching,
  countMatchingCorrect,
  safeParseObject,
  OptionItem,
  MatchingPairItem,
} from "@/lib/exam-score";
import { getMatchingResponseToken } from "@/lib/exam-token-crypto";

describe("🎯 CBT Scoring Engine Unit Tests (Fase 1: Automated Testing)", () => {
  // -------------------------------------------------------------
  // 1. Multiple Choice (Pilihan Ganda Tunggal & Benar/Salah)
  // -------------------------------------------------------------
  describe("1. Multiple Choice Evaluation", () => {
    const options: OptionItem[] = [
      { id: "opt_a", content: "Option A", isCorrect: false },
      { id: "opt_b", content: "Option B", isCorrect: true },
      { id: "opt_c", content: "Option C", isCorrect: false },
      { id: "opt_d", content: "Option D", isCorrect: false },
    ];

    it("should award full points when the single correct option is selected", () => {
      const result = gradeMultipleChoice(options, ["opt_b"], 10.0);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(10.0);
    });

    it("should award 0 points when a wrong option is selected", () => {
      const result = gradeMultipleChoice(options, ["opt_a"], 10.0);
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0);
    });

    it("should reject multiple selections on a single-choice question", () => {
      const result = gradeMultipleChoice(options, ["opt_b", "opt_c"], 10.0);
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0);
    });

    it("should award 0 points when empty selection is provided", () => {
      const result = gradeMultipleChoice(options, [], 10.0);
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. Complex Multiple Choice (Pilihan Ganda Kompleks)
  // -------------------------------------------------------------
  describe("2. Complex Multiple Choice Evaluation", () => {
    const options: OptionItem[] = [
      { id: "opt_1", content: "Pernyataan 1 (Benar)", isCorrect: true },
      { id: "opt_2", content: "Pernyataan 2 (Salah)", isCorrect: false },
      { id: "opt_3", content: "Pernyataan 3 (Benar)", isCorrect: true },
      { id: "opt_4", content: "Pernyataan 4 (Benar)", isCorrect: true },
    ];
    // Total correct options: 3 (opt_1, opt_3, opt_4)

    it("should award 100% points when all correct options are selected exactly", () => {
      const result = gradeComplexMultipleChoice(options, ["opt_1", "opt_3", "opt_4"], 15.0);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(15.0);
    });

    it("should award partial points when 2 out of 3 correct options are selected without wrong options", () => {
      // 2 / 3 * 15.0 = 10.0
      const result = gradeComplexMultipleChoice(options, ["opt_1", "opt_3"], 15.0);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(10.0);
    });

    it("should deduct penalty when student selects wrong options alongside correct ones", () => {
      // 2 correct (opt_1, opt_3) - 1 wrong (opt_2) = 1 net / 3 * 15.0 = 5.0
      const result = gradeComplexMultipleChoice(options, ["opt_1", "opt_3", "opt_2"], 15.0);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(5.0);
    });

    it("should not give negative scores when wrong options exceed correct options", () => {
      // 1 correct (opt_1) - 1 wrong (opt_2) = 0
      const result = gradeComplexMultipleChoice(options, ["opt_1", "opt_2"], 15.0);
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 3. Matching Pairs (Menjodohkan) with HMAC Token Obfuscation
  // -------------------------------------------------------------
  describe("3. Matching Pairs Evaluation (Anti-Cheat Tokenized)", () => {
    const sessionId = "session_test_abc123";
    const pairs: MatchingPairItem[] = [
      { id: "pair_1", premise: "A Record", response: "IPv4" },
      { id: "pair_2", premise: "AAAA Record", response: "IPv6" },
      { id: "pair_3", premise: "CNAME Record", response: "Alias" },
      { id: "pair_4", premise: "PTR Record", response: "Reverse DNS" },
    ];

    it("should award full points when matching answers match obfuscated HMAC tokens", () => {
      const answers: Record<string, string> = {
        pair_1: getMatchingResponseToken("pair_1", sessionId),
        pair_2: getMatchingResponseToken("pair_2", sessionId),
        pair_3: getMatchingResponseToken("pair_3", sessionId),
        pair_4: getMatchingResponseToken("pair_4", sessionId),
      };

      const result = gradeMatching(answers, pairs, sessionId, 20.0);
      expect(result.matchesCorrect).toBe(4);
      expect(result.attempted).toBe(4);
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(20.0);
    });

    it("should maintain backward compatibility with legacy raw pair IDs", () => {
      const legacyAnswers: Record<string, string> = {
        pair_1: "pair_1",
        pair_2: "pair_2",
        pair_3: "pair_3",
        pair_4: "pair_4",
      };

      const result = gradeMatching(legacyAnswers, pairs, sessionId, 20.0);
      expect(result.matchesCorrect).toBe(4);
      expect(result.scoreAwarded).toBe(20.0);
    });

    it("should award proportional score for partially correct matches", () => {
      // 2 correct, 2 wrong
      const partialAnswers: Record<string, string> = {
        pair_1: getMatchingResponseToken("pair_1", sessionId),
        pair_2: getMatchingResponseToken("pair_2", sessionId),
        pair_3: getMatchingResponseToken("pair_1", sessionId), // Wrong match
        pair_4: "wrong_token",
      };

      const result = gradeMatching(partialAnswers, pairs, sessionId, 20.0);
      expect(result.matchesCorrect).toBe(2);
      expect(result.scoreAwarded).toBe(10.0); // 2/4 * 20 = 10
      expect(result.isCorrect).toBe(true);
    });

    it("should award 0 points if all pairs are wrongly matched", () => {
      const wrongAnswers: Record<string, string> = {
        pair_1: "token_x",
        pair_2: "token_y",
      };

      const result = gradeMatching(wrongAnswers, pairs, sessionId, 20.0);
      expect(result.matchesCorrect).toBe(0);
      expect(result.scoreAwarded).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 4. Safe Parsing & Boundary Tests
  // -------------------------------------------------------------
  describe("4. Safe Parsing & Edge Case Resilience", () => {
    it("should parse valid JSON object safely", () => {
      const res = safeParseObject('{"key": "value"}');
      expect(res).toEqual({ key: "value" });
    });

    it("should return empty object on malformed JSON without crashing", () => {
      expect(safeParseObject("invalid_json{")).toEqual({});
      expect(safeParseObject(null)).toEqual({});
      expect(safeParseObject(undefined)).toEqual({});
      expect(safeParseObject("")).toEqual({});
      expect(safeParseObject("[]")).toEqual({}); // arrays fall back to {}
    });

    it("countMatchingCorrect should ignore empty or null selections", () => {
      const res = countMatchingCorrect(
        { pair_1: "", pair_2: null, pair_3: undefined },
        [{ id: "pair_1" }, { id: "pair_2" }],
        "test_session"
      );
      expect(res.attempted).toBe(0);
      expect(res.matchesCorrect).toBe(0);
    });
  });
});
