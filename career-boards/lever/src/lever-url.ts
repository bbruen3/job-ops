/**
 * Parse Lever careers URLs and extract the company slug.
 *
 * Supports:
 *   - https://jobs.lever.co/{slug}
 *   - https://jobs.lever.co/{slug}/jobs
 *   - https://jobs.lever.co/{slug}/apply
 */

export interface LeverUrlParseResult {
  inputUrl: string;
  companySlug: string;
  apiUrl: string;
  careersUrl: string;
}

export class LeverUrlParseError extends Error {
  readonly code: string;
  readonly input: string;

  constructor(code: string, message: string, input: string) {
    super(message);
    this.name = "LeverUrlParseError";
    this.code = code;
    this.input = input;
  }
}

/**
 * Extract the company slug from a Lever careers URL.
 *
 * @example
 * extractCompanySlug("https://jobs.lever.co/flyio")
 * // => "flyio"
 *
 * extractCompanySlug("https://jobs.lever.co/planetscale/jobs")
 * // => "planetscale"
 */
export function extractCompanySlug(url: string): string {
  return parseLeverUrl(url).companySlug;
}

/**
 * Build the Lever API URL for a given company slug.
 */
export function buildLeverApiUrl(companySlug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}`;
}

/**
 * Parse a Lever careers URL into its components.
 */
export function parseLeverUrl(input: string): LeverUrlParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new LeverUrlParseError(
      "EMPTY_URL",
      "Lever URL is empty.",
      input,
    );
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new LeverUrlParseError(
      "INVALID_URL",
      `Invalid URL: ${input}`,
      input,
    );
  }

  const host = url.hostname.toLowerCase();

  if (host !== "jobs.lever.co") {
    throw new LeverUrlParseError(
      "UNSUPPORTED_HOST",
      `Unsupported Lever host: ${host}`,
      input,
    );
  }

  const segments = getPathSegments(url.pathname);
  const companySlug = segments[0];

  if (!companySlug) {
    throw new LeverUrlParseError(
      "MISSING_SLUG",
      "Lever URL is missing the company slug (e.g., /flyio).",
      input,
    );
  }

  return {
    inputUrl: input,
    companySlug,
    apiUrl: buildLeverApiUrl(companySlug),
    careersUrl: `https://jobs.lever.co/${companySlug}`,
  };
}

function getPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}
