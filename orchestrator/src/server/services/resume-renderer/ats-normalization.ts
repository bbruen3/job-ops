/**
 * ATS-compatible text normalization for resume content.
 *
 * Converts problematic Unicode characters to ASCII equivalents for maximum
 * ATS (Applicant Tracking System) compatibility.
 *
 * Ported from career-ops generate-pdf.mjs normalizeTextForATS().
 */

export interface AtsNormalizationResult {
  /** The normalized text */
  text: string;
  /** Count of replacements by category */
  replacements: Record<string, number>;
}

/**
 * Normalize Unicode characters to ATS-compatible ASCII equivalents.
 *
 * Handles:
 * - Em-dash (U+2014) → hyphen
 * - En-dash (U+2013) → hyphen
 * - Smart double quotes (U+201C, U+201D, U+201E, U+201F) → ASCII "
 * - Smart single quotes (U+2018, U+2019, U+201A, U+201B) → ASCII '
 * - Ellipsis (U+2026) → ...
 * - Zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF) → removed
 * - Non-breaking space (U+00A0) → regular space
 *
 * @example
 * const result = normalizeTextForATS("The cost—about $1.5M—it's a steal");
 * // result.text = "The cost-about $1.5M-it's a steal"
 * // result.replacements = { "em-dash": 2 }
 */
export function normalizeTextForATS(text: string): AtsNormalizationResult {
  const replacements: Record<string, number> = {};
  const bump = (key: string, n: number) => {
    replacements[key] = (replacements[key] || 0) + n;
  };

  let result = text;

  // Em-dash → hyphen
  result = result.replace(/\u2014/g, () => {
    bump("em-dash", 1);
    return "-";
  });

  // En-dash → hyphen
  result = result.replace(/\u2013/g, () => {
    bump("en-dash", 1);
    return "-";
  });

  // Smart double quotes → ASCII "
  result = result.replace(/[\u201C\u201D\u201E\u201F]/g, () => {
    bump("smart-double-quote", 1);
    return '"';
  });

  // Smart single quotes → ASCII '
  result = result.replace(/[\u2018\u2019\u201A\u201B]/g, () => {
    bump("smart-single-quote", 1);
    return "'";
  });

  // Ellipsis → ...
  result = result.replace(/\u2026/g, () => {
    bump("ellipsis", 1);
    return "...";
  });

  // Zero-width characters → removed
  result = result.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, () => {
    bump("zero-width", 1);
    return "";
  });

  // Non-breaking space → regular space
  result = result.replace(/\u00A0/g, () => {
    bump("nbsp", 1);
    return " ";
  });

  return { text: result, replacements };
}

/**
 * Normalize HTML content for ATS compatibility.
 *
 * This version masks <style> and <script> blocks during normalization
 * to avoid corrupting CSS/JS content, then restores them afterward.
 *
 * @example
 * const result = normalizeHtmlForATS("<p>The cost—about $1.5M</p>");
 * // result.html = "<p>The cost-about $1.5M</p>"
 */
export function normalizeHtmlForATS(html: string): AtsNormalizationResult {
  const replacements: Record<string, number> = {};
  const bump = (key: string, n: number) => {
    replacements[key] = (replacements[key] || 0) + n;
  };

  // Mask <style> and <script> blocks
  const masks: string[] = [];
  const masked = html.replace(
    /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const token = `\u0000MASK${masks.length}\u0000`;
      masks.push(match);
      return token;
    },
  );

  // Process text nodes between HTML tags
  let out = "";
  let i = 0;
  while (i < masked.length) {
    const lt = masked.indexOf("<", i);
    if (lt === -1) {
      out += sanitizeText(masked.slice(i), bump);
      break;
    }
    out += sanitizeText(masked.slice(i, lt), bump);
    const gt = masked.indexOf(">", lt);
    if (gt === -1) {
      out += masked.slice(lt);
      break;
    }
    out += masked.slice(lt, gt + 1);
    i = gt + 1;
  }

  // Restore masked blocks
  const restored = out.replace(
    /\u0000MASK(\d+)\u0000/g,
    (_, n) => masks[Number(n)],
  );

  return { text: restored, replacements };
}

function sanitizeText(
  text: string,
  bump: (key: string, n: number) => void,
): string {
  if (!text) return text;

  let t = text;

  t = t.replace(/\u2014/g, () => {
    bump("em-dash", 1);
    return "-";
  });

  t = t.replace(/\u2013/g, () => {
    bump("en-dash", 1);
    return "-";
  });

  t = t.replace(/[\u201C\u201D\u201E\u201F]/g, () => {
    bump("smart-double-quote", 1);
    return '"';
  });

  t = t.replace(/[\u2018\u2019\u201A\u201B]/g, () => {
    bump("smart-single-quote", 1);
    return "'";
  });

  t = t.replace(/\u2026/g, () => {
    bump("ellipsis", 1);
    return "...";
  });

  t = t.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, () => {
    bump("zero-width", 1);
    return "";
  });

  t = t.replace(/\u00A0/g, () => {
    bump("nbsp", 1);
    return " ";
  });

  return t;
}

/**
 * Detect company location from job description text.
 * Returns "US" or "CA" for US/Canada, null otherwise.
 *
 * Used for paper format selection: US/Canada → letter, rest → A4.
 */
export function detectCompanyLocation(
  jdText: string,
): "US" | "CA" | null {
  const text = jdText.toLowerCase();

  // US indicators
  if (
    /\b(united states|usa|us)\b/.test(text) ||
    /\b(san francisco|new york|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|dallas|houston|phoenix|portland|san diego|san jose|raleigh|detroit|minneapolis|washington dc|nyc|sf|la)\b/.test(text) ||
    /\b(ca|wa|ny|ma|tx|co|il|fl|ga|nc|oh|pa|va|md|nj|mn|or|az|ut|nv|mi|wi|tn|mo|in|ky|la|al|sc|ct|ok|ia|ar|ms|ks|ne|nm|id|hi|me|nh|mt|ri|de|sd|nd|wv|wy|vt|ak)\b/.test(text)
  ) {
    return "US";
  }

  // Canada indicators
  if (
    /\b(canada|canadian)\b/.test(text) ||
    /\b(toronto|vancouver|montreal|calgary|ottawa|edmonton|winnipeg|halifax|victoria|quebec city)\b/.test(text) ||
    /\b(on|bc|ab|qc|mb|ns|nb|nl|pe|sk|yt|nt|nu)\b/.test(text)
  ) {
    return "CA";
  }

  return null;
}
