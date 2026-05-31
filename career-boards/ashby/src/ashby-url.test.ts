import { describe, expect, it } from "vitest";
import {
  extractCompanySlug,
  buildAshbyApiUrl,
  parseAshbyUrl,
  AshbyUrlParseError,
} from "./ashby-url.js";

describe("ashby-url", () => {
  describe("extractCompanySlug", () => {
    it("extracts slug from standard URL", () => {
      expect(extractCompanySlug("https://jobs.ashbyhq.com/railway")).toBe(
        "railway",
      );
    });

    it("extracts slug from URL with path", () => {
      expect(
        extractCompanySlug("https://jobs.ashbyhq.com/mistral/jobs"),
      ).toBe("mistral");
    });

    it("extracts slug from URL with non-user-graphql path", () => {
      expect(
        extractCompanySlug("https://jobs.ashbyhq.com/perplexity/non-user-graphql"),
      ).toBe("perplexity");
    });

    it("handles URL without scheme", () => {
      expect(extractCompanySlug("jobs.ashbyhq.com/railway")).toBe("railway");
    });

    it("handles trailing slash", () => {
      expect(extractCompanySlug("https://jobs.ashbyhq.com/railway/")).toBe(
        "railway",
      );
    });

    it("throws on empty URL", () => {
      expect(() => extractCompanySlug("")).toThrow(AshbyUrlParseError);
      expect(() => extractCompanySlug("")).toThrow("empty");
    });

    it("throws on unsupported host", () => {
      expect(() =>
        extractCompanySlug("https://example.com/jobs"),
      ).toThrow(AshbyUrlParseError);
      expect(() =>
        extractCompanySlug("https://example.com/jobs"),
      ).toThrow("Unsupported host");
    });

    it("throws on missing slug", () => {
      expect(() => extractCompanySlug("https://jobs.ashbyhq.com")).toThrow(
        AshbyUrlParseError,
      );
      expect(() => extractCompanySlug("https://jobs.ashbyhq.com")).toThrow(
        "missing the company slug",
      );
    });
  });

  describe("buildAshbyApiUrl", () => {
    it("builds correct API URL", () => {
      expect(buildAshbyApiUrl("railway")).toBe(
        "https://api.ashbyhq.com/posting-api/job-board/railway?includeCompensation=true",
      );
    });

    it("encodes special characters", () => {
      expect(buildAshbyApiUrl("my-company")).toBe(
        "https://api.ashbyhq.com/posting-api/job-board/my-company?includeCompensation=true",
      );
    });
  });

  describe("parseAshbyUrl", () => {
    it("returns full result for standard URL", () => {
      const result = parseAshbyUrl("https://jobs.ashbyhq.com/railway");
      expect(result).toEqual({
        inputUrl: "https://jobs.ashbyhq.com/railway",
        companySlug: "railway",
        apiUrl: "https://api.ashbyhq.com/posting-api/job-board/railway?includeCompensation=true",
        careersUrl: "https://jobs.ashbyhq.com/railway",
      });
    });

    it("normalizes careersUrl to root path", () => {
      const result = parseAshbyUrl(
        "https://jobs.ashbyhq.com/mistral/jobs",
      );
      expect(result.careersUrl).toBe("https://jobs.ashbyhq.com/mistral");
    });
  });
});
