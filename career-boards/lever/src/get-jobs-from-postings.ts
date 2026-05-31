/**
 * Fetch jobs from a Lever company via the public API.
 *
 * API endpoint: GET https://api.lever.co/v0/postings/{companySlug}
 * Returns: [{ id, text, hostedUrl, categories: { location }, ... }] (root array)
 *
 * This package returns the raw API response. Normalization to WatchlistJobResult
 * happens in the Watchlist adapter layer.
 */

import { buildLeverApiUrl, parseLeverUrl } from "./lever-url.js";

export interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string | null;
  categories: {
    department: string | null;
    team: string | null;
    location: string | null;
    commitment: string | null;
    level: string | null;
  } | null;
  descriptionPlain: string;
  descriptionHtml: string;
  createdAt: number;
  updatedAt: number;
}

export interface FetchLeverJobsInput {
  /** Company slug (e.g., "flyio") or full careers URL */
  companySlugOrUrl: string;
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface FetchLeverJobsResult {
  total: number;
  jobs: LeverPosting[];
}

/** Hostnames allowed for Lever API requests (SSRF protection) */
const ALLOWED_API_HOSTS = new Set([
  "api.lever.co",
]);

/**
 * Fetch all jobs from a Lever company.
 *
 * @example
 * const result = await fetchLeverJobs({ companySlugOrUrl: "flyio" });
 * console.log(result.total, result.jobs.length);
 */
export async function fetchLeverJobs(
  input: FetchLeverJobsInput,
): Promise<FetchLeverJobsResult> {
  const { companySlugOrUrl, signal } = input;

  // Parse to get company slug and API URL
  let apiUrl: string;
  let companySlug: string;

  if (companySlugOrUrl.includes("lever.co")) {
    const parsed = parseLeverUrl(companySlugOrUrl);
    apiUrl = parsed.apiUrl;
    companySlug = parsed.companySlug;
  } else {
    // Assume it's a raw company slug
    companySlug = companySlugOrUrl.trim();
    apiUrl = buildLeverApiUrl(companySlug);
  }

  // Validate API URL (SSRF protection)
  const url = new URL(apiUrl);
  if (!ALLOWED_API_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `SSRF blocked: ${url.hostname} is not in the allowed Lever API hosts`,
    );
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "User-Agent": "career-boards/lever/0.0.1",
      Accept: "application/json",
    },
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Lever API returned HTTP ${response.status} for company "${companySlug}"`,
    );
  }

  const data = await response.json();

  // Lever returns a root array, not { jobs: [...] }
  const jobs: LeverPosting[] = Array.isArray(data) ? data : [];

  return {
    total: jobs.length,
    jobs,
  };
}
