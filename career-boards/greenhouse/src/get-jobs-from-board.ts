/**
 * Fetch jobs from a Greenhouse board via the public API.
 *
 * API endpoint: GET https://boards-api.greenhouse.io/v1/boards/{boardToken}/jobs
 * Returns: { jobs: [{ id, title, absolute_url, location: { name }, ... }] }
 *
 * This package returns the raw API response. Normalization to WatchlistJobResult
 * happens in the Watchlist adapter layer.
 */

import { buildGreenhouseApiUrl, parseGreenhouseUrl } from "./greenhouse-url.js";

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string } | null;
  department: { name: string } | null;
  teams: Array<{ name: string }> | null;
  metadata: Array<{ name: string; value: string }> | null;
  updated_at: string;
  created_at: string;
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

export interface FetchGreenhouseJobsInput {
  /** Board token (e.g., "temporal") or full careers URL */
  boardTokenOrUrl: string;
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface FetchGreenhouseJobsResult {
  total: number;
  jobs: GreenhouseJob[];
}

/** Hostnames allowed for Greenhouse API requests (SSRF protection) */
const ALLOWED_API_HOSTS = new Set([
  "boards-api.greenhouse.io",
]);

/**
 * Fetch all jobs from a Greenhouse board.
 *
 * @example
 * const result = await fetchGreenhouseJobs({ boardTokenOrUrl: "temporal" });
 * console.log(result.total, result.jobs.length);
 */
export async function fetchGreenhouseJobs(
  input: FetchGreenhouseJobsInput,
): Promise<FetchGreenhouseJobsResult> {
  const { boardTokenOrUrl, signal } = input;

  // Parse to get board token and API URL
  let apiUrl: string;
  let boardToken: string;

  if (boardTokenOrUrl.includes("greenhouse.io")) {
    const parsed = parseGreenhouseUrl(boardTokenOrUrl);
    apiUrl = parsed.apiUrl;
    boardToken = parsed.boardToken;
  } else {
    // Assume it's a raw board token
    boardToken = boardTokenOrUrl.trim();
    apiUrl = buildGreenhouseApiUrl(boardToken);
  }

  // Validate API URL (SSRF protection)
  const url = new URL(apiUrl);
  if (!ALLOWED_API_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `SSRF blocked: ${url.hostname} is not in the allowed Greenhouse API hosts`,
    );
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "User-Agent": "career-boards/greenhouse/0.0.1",
      Accept: "application/json",
    },
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Greenhouse API returned HTTP ${response.status} for board "${boardToken}"`,
    );
  }

  const data: GreenhouseJobsResponse = await response.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return {
    total: jobs.length,
    jobs,
  };
}
