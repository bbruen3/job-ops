/**
 * Parse Greenhouse careers URLs and extract the board token.
 *
 * Supports:
 *   - https://boards.greenhouse.io/{slug}
 *   - https://job-boards.greenhouse.io/{slug}
 *   - https://job-boards.eu.greenhouse.io/{slug}
 *   - https://{slug}.greenhouse.io
 *   - https://{slug}.greenhouse.io/careers
 */

export interface GreenhouseUrlParseResult {
  inputUrl: string;
  boardToken: string;
  apiUrl: string;
  careersUrl: string;
}

export class GreenhouseUrlParseError extends Error {
  readonly code: string;
  readonly input: string;

  constructor(code: string, message: string, input: string) {
    super(message);
    this.name = "GreenhouseUrlParseError";
    this.code = code;
    this.input = input;
  }
}

const ALLOWED_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "job-boards.eu.greenhouse.io",
]);

/**
 * Extract the board token from a Greenhouse careers URL.
 *
 * @example
 * extractBoardToken("https://boards.greenhouse.io/temporal")
 * // => "temporal"
 *
 * extractBoardToken("https://job-boards.greenhouse.io/anthropic")
 * // => "anthropic"
 */
export function extractBoardToken(url: string): string {
  return parseGreenhouseUrl(url).boardToken;
}

/**
 * Build the Greenhouse API URL for a given board token.
 */
export function buildGreenhouseApiUrl(boardToken: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
}

/**
 * Parse a Greenhouse careers URL into its components.
 */
export function parseGreenhouseUrl(input: string): GreenhouseUrlParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new GreenhouseUrlParseError(
      "EMPTY_URL",
      "Greenhouse URL is empty.",
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
    throw new GreenhouseUrlParseError(
      "INVALID_URL",
      `Invalid URL: ${input}`,
      input,
    );
  }

  const host = url.hostname.toLowerCase();

  // Case 1: {slug}.greenhouse.io
  const subdomainMatch = host.match(/^(?<slug>[a-z0-9-]+)\.greenhouse\.io$/i);
  if (subdomainMatch?.groups) {
    const boardToken = subdomainMatch.groups.slug;
    return {
      inputUrl: input,
      boardToken,
      apiUrl: buildGreenhouseApiUrl(boardToken),
      careersUrl: `https://boards.greenhouse.io/${boardToken}`,
    };
  }

  // Case 2: boards.greenhouse.io/{slug}, job-boards.greenhouse.io/{slug}, job-boards.eu.greenhouse.io/{slug}
  if (ALLOWED_HOSTS.has(host)) {
    const segments = getPathSegments(url.pathname);
    const boardToken = segments[0];

    if (!boardToken) {
      throw new GreenhouseUrlParseError(
        "MISSING_BOARD_TOKEN",
        "Greenhouse URL is missing the board token (e.g., /temporal).",
        input,
      );
    }

    return {
      inputUrl: input,
      boardToken,
      apiUrl: buildGreenhouseApiUrl(boardToken),
      careersUrl: `https://boards.greenhouse.io/${boardToken}`,
    };
  }

  throw new GreenhouseUrlParseError(
    "UNSUPPORTED_HOST",
    `Unsupported Greenhouse host: ${host}`,
    input,
  );
}

function getPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}
