import { describe, expect, it } from "vitest";
import {
  extractBoardToken,
  buildGreenhouseApiUrl,
  parseGreenhouseUrl,
  GreenhouseUrlParseError,
} from "./greenhouse-url.js";

describe("greenhouse-url", () => {
  describe("extractBoardToken", () => {
    it("extracts token from boards.greenhouse.io", () => {
      expect(extractBoardToken("https://boards.greenhouse.io/temporal")).toBe(
        "temporal",
      );
    });

    it("extracts token from job-boards.greenhouse.io", () => {
      expect(
        extractBoardToken("https://job-boards.greenhouse.io/anthropic"),
      ).toBe("anthropic");
    });

    it("extracts token from EU domain", () => {
      expect(
        extractBoardToken("https://job-boards.eu.greenhouse.io/company"),
      ).toBe("company");
    });

    it("extracts token from subdomain format", () => {
      expect(extractBoardToken("https://temporal.greenhouse.io")).toBe(
        "temporal",
      );
    });

    it("extracts token from subdomain with path", () => {
      expect(
        extractBoardToken("https://temporal.greenhouse.io/careers"),
      ).toBe("temporal");
    });

    it("handles URL without scheme", () => {
      expect(extractBoardToken("boards.greenhouse.io/temporal")).toBe(
        "temporal",
      );
    });

    it("handles trailing slash", () => {
      expect(extractBoardToken("https://boards.greenhouse.io/temporal/")).toBe(
        "temporal",
      );
    });

    it("throws on empty URL", () => {
      expect(() => extractBoardToken("")).toThrow(GreenhouseUrlParseError);
      expect(() => extractBoardToken("")).toThrow("empty");
    });

    it("throws on unsupported host", () => {
      expect(() =>
        extractBoardToken("https://example.com/jobs"),
      ).toThrow(GreenhouseUrlParseError);
      expect(() =>
        extractBoardToken("https://example.com/jobs"),
      ).toThrow("Unsupported host");
    });

    it("throws on missing board token", () => {
      expect(() => extractBoardToken("https://boards.greenhouse.io")).toThrow(
        GreenhouseUrlParseError,
      );
      expect(() => extractBoardToken("https://boards.greenhouse.io")).toThrow(
        "missing the board token",
      );
    });
  });

  describe("buildGreenhouseApiUrl", () => {
    it("builds correct API URL", () => {
      expect(buildGreenhouseApiUrl("temporal")).toBe(
        "https://boards-api.greenhouse.io/v1/boards/temporal/jobs",
      );
    });

    it("encodes special characters", () => {
      expect(buildGreenhouseApiUrl("my-company")).toBe(
        "https://boards-api.greenhouse.io/v1/boards/my-company/jobs",
      );
    });
  });

  describe("parseGreenhouseUrl", () => {
    it("returns full result for standard URL", () => {
      const result = parseGreenhouseUrl(
        "https://boards.greenhouse.io/temporal",
      );
      expect(result).toEqual({
        inputUrl: "https://boards.greenhouse.io/temporal",
        boardToken: "temporal",
        apiUrl: "https://boards-api.greenhouse.io/v1/boards/temporal/jobs",
        careersUrl: "https://boards.greenhouse.io/temporal",
      });
    });

    it("normalizes careersUrl to boards.greenhouse.io", () => {
      const result = parseGreenhouseUrl(
        "https://job-boards.greenhouse.io/anthropic",
      );
      expect(result.careersUrl).toBe("https://boards.greenhouse.io/anthropic");
    });
  });
});
