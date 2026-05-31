import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fetchGreenhouseJobs } from "./get-jobs-from-board.js";

describe("get-jobs-from-board", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches jobs from a board token", async () => {
    const mockJobs = [
      {
        id: 1,
        title: "Software Engineer",
        absolute_url: "https://boards.greenhouse.io/temporal/jobs/1",
        location: { name: "Remote" },
        department: { name: "Engineering" },
        teams: null,
        metadata: null,
        updated_at: "2024-01-01",
        created_at: "2024-01-01",
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: mockJobs }), { status: 200 }),
    );

    const result = await fetchGreenhouseJobs({
      boardTokenOrUrl: "temporal",
    });

    expect(result.total).toBe(1);
    expect(result.jobs).toEqual(mockJobs);
    expect(fetch).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/temporal/jobs",
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

    await fetchGreenhouseJobs({
      boardTokenOrUrl: "https://boards.greenhouse.io/anthropic",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs",
      expect.anything(),
    );
  });

  it("returns empty array for empty boards", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] }), { status: 200 }),
    );

    const result = await fetchGreenhouseJobs({
      boardTokenOrUrl: "empty-board",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("blocks SSRF to non-allowed hosts", async () => {
    await expect(
      fetchGreenhouseJobs({
        boardTokenOrUrl: "https://evil.com/malicious",
      }),
    ).rejects.toThrow("SSRF blocked");
  });

  it("throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(
      fetchGreenhouseJobs({
        boardTokenOrUrl: "nonexistent",
      }),
    ).rejects.toThrow("HTTP 404");
  });

  it("handles response with missing jobs array", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const result = await fetchGreenhouseJobs({
      boardTokenOrUrl: "test",
    });

    expect(result.total).toBe(0);
    expect(result.jobs).toEqual([]);
  });

  it("passes abort signal to fetch", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jobs: [] }), { status: 200 }),
    );

    await fetchGreenhouseJobs({
      boardTokenOrUrl: "test",
      signal: controller.signal,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
