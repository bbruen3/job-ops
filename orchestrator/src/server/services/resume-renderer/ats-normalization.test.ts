import { describe, expect, it } from "vitest";
import {
  normalizeTextForATS,
  normalizeHtmlForATS,
  detectCompanyLocation,
} from "./ats-normalization.js";

describe("ats-normalization", () => {
  describe("normalizeTextForATS", () => {
    it("converts em-dash to hyphen", () => {
      const result = normalizeTextForATS("The cost\u2014about $1.5M\u2014is high");
      expect(result.text).toBe("The cost-about $1.5M-is high");
      expect(result.replacements["em-dash"]).toBe(2);
    });

    it("converts en-dash to hyphen", () => {
      const result = normalizeTextForATS("pages 10\u201320");
      expect(result.text).toBe("pages 10-20");
      expect(result.replacements["en-dash"]).toBe(1);
    });

    it("converts smart double quotes to ASCII", () => {
      const result = normalizeTextForATS("\u201Chello\u201D");
      expect(result.text).toBe('"hello"');
      expect(result.replacements["smart-double-quote"]).toBe(2);
    });

    it("converts smart single quotes to ASCII", () => {
      const result = normalizeTextForATS("it\u2019s");
      expect(result.text).toBe("it's");
      expect(result.replacements["smart-single-quote"]).toBe(1);
    });

    it("converts ellipsis to three dots", () => {
      const result = normalizeTextForATS("wait\u2026");
      expect(result.text).toBe("wait...");
      expect(result.replacements["ellipsis"]).toBe(1);
    });

    it("removes zero-width characters", () => {
      const result = normalizeTextForATS("test\u200B\u200C\u200D\u2060\uFEFF");
      expect(result.text).toBe("test");
      expect(result.replacements["zero-width"]).toBe(5);
    });

    it("converts non-breaking space to regular space", () => {
      const result = normalizeTextForATS("hello\u00A0world");
      expect(result.text).toBe("hello world");
      expect(result.replacements["nbsp"]).toBe(1);
    });

    it("handles multiple replacements in same text", () => {
      const result = normalizeTextForATS("\u201CIt\u2019s\u2014done\u2026\u201D");
      expect(result.text).toBe('"It\'s-done..."');
      expect(result.replacements["smart-double-quote"]).toBe(2);
      expect(result.replacements["smart-single-quote"]).toBe(1);
      expect(result.replacements["em-dash"]).toBe(1);
      expect(result.replacements["ellipsis"]).toBe(1);
    });

    it("returns empty replacements for clean text", () => {
      const result = normalizeTextForATS("Hello world 123");
      expect(result.text).toBe("Hello world 123");
      expect(Object.keys(result.replacements)).toHaveLength(0);
    });
  });

  describe("normalizeHtmlForATS", () => {
    it("normalizes text nodes but not style/script blocks", () => {
      const html = '<p>The cost\u2014about $1.5M</p><style>.a{color:red}</style>';
      const result = normalizeHtmlForATS(html);
      expect(result.text).toBe('<p>The cost-about $1.5M</p><style>.a{color:red}</style>');
      expect(result.replacements["em-dash"]).toBe(1);
    });

    it("handles nested HTML tags", () => {
      const html = "<p><strong>Bold</strong> text\u2014here</p>";
      const result = normalizeHtmlForATS(html);
      expect(result.text).toBe("<p><strong>Bold</strong> text-here</p>");
    });

    it("handles script blocks", () => {
      const html = "<p>Text</p><script>var x = '\u201Ctest\u201D';</script>";
      const result = normalizeHtmlForATS(html);
      expect(result.text).toBe("<p>Text</p><script>var x = '\u201Ctest\u201D';</script>");
    });
  });

  describe("detectCompanyLocation", () => {
    it("detects US by country name", () => {
      expect(detectCompanyLocation("We are based in the United States")).toBe("US");
    });

    it("detects US by city name", () => {
      expect(detectCompanyLocation("San Francisco, CA")).toBe("US");
    });

    it("detects Canada by country name", () => {
      expect(detectCompanyLocation("Based in Canada")).toBe("CA");
    });

    it("detects Canada by city name", () => {
      expect(detectCompanyLocation("Toronto, Ontario")).toBe("CA");
    });

    it("returns null for non-US/CA locations", () => {
      expect(detectCompanyLocation("London, UK")).toBeNull();
      expect(detectCompanyLocation("Berlin, Germany")).toBeNull();
      expect(detectCompanyLocation("Tokyo, Japan")).toBeNull();
    });

    it("returns null for empty text", () => {
      expect(detectCompanyLocation("")).toBeNull();
    });

    it("handles case insensitivity", () => {
      expect(detectCompanyLocation("UNITED STATES")).toBe("US");
      expect(detectCompanyLocation("CANADA")).toBe("CA");
    });
  });
});
