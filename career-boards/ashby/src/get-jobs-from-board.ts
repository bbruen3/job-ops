/**
 * Fetch jobs from an Ashby board via the public API.
 *
 * API endpoint: GET https://api.ashbyhq.com/posting-api/job-board/{companySlug}?includeCompensation=true
 * Returns: { jobs: [{ id, title, jobUrl, location, ... }] }
 *
 * This package returns the raw API response. Normalization to WatchlistJobResult
 * happens in the Watchlist adapter layer.
 */

import { buildAshbyApiUrl, parseAshbyUrl } from "./ashby-url.js";

export interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  location: string | null;
  department: string | null;
  team: string | null;
  employmentType: string | null;
  compensationTierDescription: string | null;
  isRemote: boolean;
  createdAt: string;
}

export interface AshbyJobsResponse {
  jobs: AshbyJob[];
  jobBoardUrl: string;
}

export interface FetchAshbyJobsInput {
  /** Company slug (e.g., "railway") or full careers URL */
  companySlugOrUrl: string;
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface FetchAshbyJobsResult {
  total: number;
  jobs: AshbyJob[];
}

/** Hostnames allowed for Ashby API requests (SSRF protection) */
const ALLOWED_API_HOSTS = new Set([
  "api.ashbyhq.com",
]);

/**
 * Fetch all jobs from an Ashby board.
 *
 * @example
 * const result = await fetchAshbyJobs({ companySlugOrUrl: "railway" });
 * console.log(result.total, result.jobs.length);
 */
export async function fetchAshbyJobs(
  input: FetchAshbyJobsInput,
): Promise<FetchAshbyJobsResult> {
  const { companySlugOrUrl, signal } = input;

  // Parse to get company slug and API URL
  let apiUrl: string;
  let companySlug: string;

  if (companySlugOrUrl.includes("ashbyhq.com")) {
    const parsed = parseAshbyUrl(companySlugOrUrl);
    apiUrl = parsed.apiUrl;
    companySlug = parsed.companySlug;
  } else {
    // Assume it's a raw company slug
    companySlug = companySlugOrUrl.trim();
    apiUrl = buildAshbyApiUrl(companySlug);
  }

  // Validate API URL (SSRF protection)
  const url = new URL(apiUrl);
  if (!ALLOWED_API_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `SSRF blocked: ${url.hostname} is not in the allowed Ashby API hosts`,
    );
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "User-Agent": "career-boards/ashby/0.0.1",
      Accept: "application/json",
    },
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Ashby API returned HTTP ${response.status} for company "${companySlug}"`,
    );
  }

  const data: AshbyJobsResponse = await response.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return {
    total: jobs.length,
    jobs,
  };
}
