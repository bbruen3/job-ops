import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fetchAshbyJobs } from "./get-jobs-from-board.js";

describe("get-jobs-from-board", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches jobs from a company slug", async () => {
    const mockResponse = {
      jobs: [
        {
          id: "job123",
          title: "Software Engineer",
          jobUrl: "https://jobs.ashbyhq.com/railway/job123",
          location: "Remote",
          department: "Engineering",
          team: "Platform",
          employmentType: "Full-time",
          compensationTierDescription: "$150k-$200k",
          isRemote: true,
          createdAt: "2024-01-01T00:00:00Z",
        },
      ],
      jobBoardUrl: "https://jobs.ashbyhq.com/railway",
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await fetchAshbyJobs({
      companySlugOrUrl: "railway",
    });

    expect(result.total).toBe(1);
    expect(result.jobs).toEqual(mockResponse.jobs);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.ashbyhq.com/posting-api/job-board/railway?includeCompensation=true",
      expect.objectContaining({
        method: "GET",
        redirect: "error",
      }),
    );
  });

  it("fetches jobs from a full URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] }), { status: 200 }),
    );

    await fetchAshbyJobs({
      companySlugOrUrl: "https://jobs.ashbyhq.com/mistral",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.ashbyhq.com/posting-api/job-board/mistral?includeCompensation=true",
      expect.anything(),
    );
  });

  it("returns empty array for companies with no jobs", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] }), { status: 200 }),
    );

    const result = await fetchAshbyJobs({
      companySlugOrUrl: "empty-company",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("handles response with missing jobs array", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const result = await fetchAshbyJobs({
      companySlugOrUrl: "test",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("blocks SSRF to non-allowed hosts", async () => {
    await expect(
      fetchAshbyJobs({
        companySlugOrUrl: "https://evil.com/malicious",
      }),
    ).rejects.toThrow("SSRF blocked");
  });

  it("throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(
      fetchAshbyJobs({
        companySlugOrUrl: "nonexistent",
      }),
    ).rejects.toThrow("HTTP 404");
  });

  it("passes abort signal to fetch", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] }), { status: 200 }),
    );

    await fetchAshbyJobs({
      companySlugOrUrl: "test",
      signal: controller.signal,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
