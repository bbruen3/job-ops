import { describe, expect, it } from "vitest";
import {
  verifyKeywordInjection,
  selectProjects,
  levenshteinDistance,
} from "./ats-tailoring.js";

describe("ats-tailoring", () => {
  describe("verifyKeywordInjection", () => {
    it("passes when keywords exist in original text", () => {
      const original = "Built machine learning pipelines and deployed models";
      const injected = "Built ML pipelines and deployed models";
      const keywords = ["ML", "pipelines", "deployed"];

      const flagged = verifyKeywordInjection(original, injected, keywords);
      expect(flagged).toEqual([]);
    });

    it("flags keywords not in original (long tokens)", () => {
      const original = "Managed a team of 5 engineers";
      const injected = "Led a team of 5 engineers";
      const keywords = ["Led", "management", "team"];

      const flagged = verifyKeywordInjection(original, injected, keywords);
      // "Led" is 3 chars -> exact match only, not in original
      // "management" is 10 chars -> fuzzy match, not similar to anything
      // "team" is 4 chars -> substring match, found
      expect(flagged).toContain("Led");
      expect(flagged).toContain("management");
      expect(flagged).not.toContain("team");
    });

    it("uses exact match for tokens < 4 chars", () => {
      const original = "AI and ML engineer";
      const injected = "AI and ML engineer";
      const keywords = ["AI", "ML"];

      const flagged = verifyKeywordInjection(original, injected, keywords);
      expect(flagged).toEqual([]);
    });

    it("uses fuzzy match for tokens >= 4 chars", () => {
      const original = "Built data pipelines";
      const injected = "Built data pipelines";
      const keywords = ["pipelines"];

      const flagged = verifyKeywordInjection(original, injected, keywords);
      expect(flagged).toEqual([]);
    });

    it("flags fuzzy mismatches", () => {
      const original = "Managed frontend";
      const injected = "Managed frontend";
      const keywords = ["backend"];

      const flagged = verifyKeywordInjection(original, injected, keywords);
      expect(flagged).toContain("backend");
    });
  });

  describe("selectProjects", () => {
    it("selects projects matching emphasisAreas", () => {
      const projects = [
        { name: "RAG Pipeline", description: "Built a RAG pipeline with vector search" },
        { name: "Web App", description: "React web application" },
        { name: "ML Platform", description: "ML platform with latency optimization" },
      ];
      const emphasisAreas = ["RAG", "latency optimization"];

      const selected = selectProjects(projects, emphasisAreas);
      expect(selected.length).toBeLessThanOrEqual(4);
      // RAG Pipeline should be selected (matches "RAG")
      expect(selected.some((p) => p.name === "RAG Pipeline")).toBe(true);
    });

    it("returns top 4 projects max", () => {
      const projects = Array.from({ length: 10 }, (_, i) => ({
        name: `Project ${i}`,
        description: `Description ${i}`,
      }));
      const emphasisAreas = ["Project"];

      const selected = selectProjects(projects, emphasisAreas);
      expect(selected.length).toBeLessThanOrEqual(4);
    });
  });

  describe("levenshteinDistance", () => {
    it("returns 0 for identical strings", () => {
      expect(levenshteinDistance("abc", "abc")).toBe(0);
    });

    it("returns correct distance", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    });

    it("returns length for empty vs non-empty", () => {
      expect(levenshteinDistance("", "abc")).toBe(3);
    });
  });
});
