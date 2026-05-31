import { describe, expect, it } from "vitest";
import {
  extractCompanySlug,
  buildLeverApiUrl,
  parseLeverUrl,
  LeverUrlParseError,
} from "./lever-url.js";

describe("lever-url", () => {
  describe("extractCompanySlug", () => {
    it("extracts slug from standard URL", () => {
      expect(extractCompanySlug("https://jobs.lever.co/flyio")).toBe("flyio");
    });

    it("extracts slug from URL with path", () => {
      expect(
        extractCompanySlug("https://jobs.lever.co/planetscale/jobs"),
      ).toBe("planetscale");
    });

    it("extracts slug from URL with apply path", () => {
      expect(
        extractCompanySlug("https://jobs.lever.co/cohere/apply"),
      ).toBe("cohere");
    });

    it("handles URL without scheme", () => {
      expect(extractCompanySlug("jobs.lever.co/flyio")).toBe("flyio");
    });

    it("handles trailing slash", () => {
      expect(extractCompanySlug("https://jobs.lever.co/flyio/")).toBe("flyio");
    });

    it("throws on empty URL", () => {
      expect(() => extractCompanySlug("")).toThrow(LeverUrlParseError);
      expect(() => extractCompanySlug("")).toThrow("empty");
    });

    it("throws on unsupported host", () => {
      expect(() =>
        extractCompanySlug("https://example.com/jobs"),
      ).toThrow(LeverUrlParseError);
      expect(() =>
        extractCompanySlug("https://example.com/jobs"),
      ).toThrow("Unsupported host");
    });

    it("throws on missing slug", () => {
      expect(() => extractCompanySlug("https://jobs.lever.co")).toThrow(
        LeverUrlParseError,
      );
      expect(() => extractCompanySlug("https://jobs.lever.co")).toThrow(
        "missing the company slug",
      );
    });
  });

  describe("buildLeverApiUrl", () => {
    it("builds correct API URL", () => {
      expect(buildLeverApiUrl("flyio")).toBe(
        "https://api.lever.co/v0/postings/flyio",
      );
    });

    it("encodes special characters", () => {
      expect(buildLeverApiUrl("my-company")).toBe(
        "https://api.lever.co/v0/postings/my-company",
      );
    });
  });

  describe("parseLeverUrl", () => {
    it("returns full result for standard URL", () => {
      const result = parseLeverUrl("https://jobs.lever.co/flyio");
      expect(result).toEqual({
        inputUrl: "https://jobs.lever.co/flyio",
        companySlug: "flyio",
        apiUrl: "https://api.lever.co/v0/postings/flyio",
        careersUrl: "https://jobs.lever.co/flyio",
      });
    });

    it("normalizes careersUrl to root path", () => {
      const result = parseLeverUrl(
        "https://jobs.lever.co/planetscale/jobs",
      );
      expect(result.careersUrl).toBe("https://jobs.lever.co/planetscale");
    });
  });
});
