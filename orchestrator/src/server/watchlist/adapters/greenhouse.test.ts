import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { greenhouseWatchlistAdapter } from "./greenhouse.js";

describe("greenhouseWatchlistAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("parseCatalogSources", () => {
    it("parses catalog sources into canonical watchlist sources", () => {
      expect(
        greenhouseWatchlistAdapter.parseCatalogSources([
          {
            id: "temporal",
            label: "Temporal",
            greenhouseUrl: "https://boards.greenhouse.io/temporal",
          },
        ]),
      ).toEqual([
        {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("handles job-boards.greenhouse.io URLs", () => {
      expect(
        greenhouseWatchlistAdapter.parseCatalogSources([
          {
            id: "anthropic",
            label: "Anthropic",
            greenhouseUrl: "https://job-boards.greenhouse.io/anthropic",
          },
        ]),
      ).toEqual([
        {
          id: "greenhouse:anthropic",
          label: "Anthropic",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/anthropic",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("rejects invalid entries", () => {
      expect(() =>
        greenhouseWatchlistAdapter.parseCatalogSources([
          { id: "", label: "Test", greenhouseUrl: "https://example.com" },
        ]),
      ).toThrow();
    });
  });

  describe("normalizeCustomSelection", () => {
    it("normalizes custom selections to canonical URL", () => {
      expect(
        greenhouseWatchlistAdapter.normalizeCustomSelection({
          label: "https://boards.greenhouse.io/temporal",
          careersUrl: "https://boards.greenhouse.io/temporal",
        }),
      ).toEqual({
        label: "temporal",
        careersUrl: "https://boards.greenhouse.io/temporal",
      });
    });

    it("uses custom label when provided", () => {
      expect(
        greenhouseWatchlistAdapter.normalizeCustomSelection({
          label: "Temporal",
          careersUrl: "https://boards.greenhouse.io/temporal",
        }),
      ).toEqual({
        label: "Temporal",
        careersUrl: "https://boards.greenhouse.io/temporal",
      });
    });
  });

  describe("fetchJobs", () => {
    it("fetches and normalizes jobs from Greenhouse", async () => {
      const mockResponse = {
        jobs: [
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
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await greenhouseWatchlistAdapter.fetchJobs({
        source: {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      });

      expect(result.total).toBe(1);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        title: "Software Engineer",
        jobUrl: "https://boards.greenhouse.io/temporal/jobs/1",
        location: "Remote",
        employer: "Temporal",
        sourceType: "greenhouse",
      });
    });

    it("handles null location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: 1,
            title: "Software Engineer",
            absolute_url: "https://boards.greenhouse.io/temporal/jobs/1",
            location: null,
            department: null,
            teams: null,
            metadata: null,
            updated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await greenhouseWatchlistAdapter.fetchJobs({
        source: {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles empty string location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: 1,
            title: "Software Engineer",
            absolute_url: "https://boards.greenhouse.io/temporal/jobs/1",
            location: { name: "" },
            department: null,
            teams: null,
            metadata: null,
            updated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await greenhouseWatchlistAdapter.fetchJobs({
        source: {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles undefined location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: 1,
            title: "Software Engineer",
            absolute_url: "https://boards.greenhouse.io/temporal/jobs/1",
            // location field missing
            department: null,
            teams: null,
            metadata: null,
            updated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await greenhouseWatchlistAdapter.fetchJobs({
        source: {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("filters out jobs without absolute_url", async () => {
      const mockResponse = {
        jobs: [
          {
            id: 1,
            title: "Software Engineer",
            absolute_url: "https://boards.greenhouse.io/temporal/jobs/1",
            location: { name: "Remote" },
            department: null,
            teams: null,
            metadata: null,
            updated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
          {
            id: 2,
            title: "No URL Job",
            absolute_url: "",
            location: null,
            department: null,
            teams: null,
            metadata: null,
            updated_at: "2024-01-01",
            created_at: "2024-01-01",
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await greenhouseWatchlistAdapter.fetchJobs({
        source: {
          id: "greenhouse:temporal",
          label: "Temporal",
          sourceType: "greenhouse",
          careersUrl: "https://boards.greenhouse.io/temporal",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe("Software Engineer");
    });
  });
});
