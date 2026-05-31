/**
 * Parse Ashby careers URLs and extract the company slug.
 *
 * Supports:
 *   - https://jobs.ashbyhq.com/{slug}
 *   - https://jobs.ashbyhq.com/{slug}/jobs
 *   - https://jobs.ashbyhq.com/{slug}/non-user-graphql
 */

export interface AshbyUrlParseResult {
  inputUrl: string;
  companySlug: string;
  apiUrl: string;
  careersUrl: string;
}

export class AshbyUrlParseError extends Error {
  readonly code: string;
  readonly input: string;

  constructor(code: string, message: string, input: string) {
    super(message);
    this.name = "AshbyUrlParseError";
    this.code = code;
    this.input = input;
  }
}

/**
 * Extract the company slug from an Ashby careers URL.
 *
 * @example
 * extractCompanySlug("https://jobs.ashbyhq.com/railway")
 * // => "railway"
 *
 * extractCompanySlug("https://jobs.ashbyhq.com/mistral/jobs")
 * // => "mistral"
 */
export function extractCompanySlug(url: string): string {
  return parseAshbyUrl(url).companySlug;
}

/**
 * Build the Ashby API URL for a given company slug.
 */
export function buildAshbyApiUrl(companySlug: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}?includeCompensation=true`;
}

/**
 * Parse an Ashby careers URL into its components.
 */
export function parseAshbyUrl(input: string): AshbyUrlParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new AshbyUrlParseError(
      "EMPTY_URL",
      "Ashby URL is empty.",
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
    throw new AshbyUrlParseError(
      "INVALID_URL",
      `Invalid URL: ${input}`,
      input,
    );
  }

  const host = url.hostname.toLowerCase();

  if (host !== "jobs.ashbyhq.com") {
    throw new AshbyUrlParseError(
      "UNSUPPORTED_HOST",
      `Unsupported Ashby host: ${host}`,
      input,
    );
  }

  const segments = getPathSegments(url.pathname);
  const companySlug = segments[0];

  if (!companySlug) {
    throw new AshbyUrlParseError(
      "MISSING_SLUG",
      "Ashby URL is missing the company slug (e.g., /railway).",
      input,
    );
  }

  return {
    inputUrl: input,
    companySlug,
    apiUrl: buildAshbyApiUrl(companySlug),
    careersUrl: `https://jobs.ashbyhq.com/${companySlug}`,
  };
}

function getPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}
