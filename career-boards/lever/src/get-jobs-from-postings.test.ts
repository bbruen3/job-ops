import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fetchLeverJobs } from "./get-jobs-from-postings.js";

describe("get-jobs-from-postings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches jobs from a company slug", async () => {
    const mockJobs = [
      {
        id: "abc123",
        text: "Software Engineer",
        hostedUrl: "https://jobs.lever.co/flyio/abc123",
        applyUrl: null,
        categories: {
          department: "Engineering",
          team: "Platform",
          location: "Remote",
          commitment: "Full-time",
          level: "Senior",
        },
        descriptionPlain: "We are looking for a software engineer...",
        descriptionHtml: "<p>We are looking for a software engineer...</p>",
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockJobs), { status: 200 }),
    );

    const result = await fetchLeverJobs({
      companySlugOrUrl: "flyio",
    });

    expect(result.total).toBe(1);
    expect(result.jobs).toEqual(mockJobs);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.lever.co/v0/postings/flyio",
      expect.objectContaining({
        method: "GET",
        redirect: "error",
      }),
    );
  });

  it("fetches jobs from a full URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await fetchLeverJobs({
      companySlugOrUrl: "https://jobs.lever.co/planetscale",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.lever.co/v0/postings/planetscale",
      expect.anything(),
    );
  });

  it("returns empty array for companies with no jobs", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const result = await fetchLeverJobs({
      companySlugOrUrl: "empty-company",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("handles non-array response gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not found" }), { status: 200 }),
    );

    const result = await fetchLeverJobs({
      companySlugOrUrl: "nonexistent",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("blocks SSRF to non-allowed hosts", async () => {
    await expect(
      fetchLeverJobs({
        companySlugOrUrl: "https://evil.com/malicious",
      }),
    ).rejects.toThrow("SSRF blocked");
  });

  it("throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(
      fetchLeverJobs({
        companySlugOrUrl: "nonexistent",
      }),
    ).rejects.toThrow("HTTP 404");
  });

  it("passes abort signal to fetch", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await fetchLeverJobs({
      companySlugOrUrl: "test",
      signal: controller.signal,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
