import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ashbyWatchlistAdapter } from "./ashby.js";

describe("ashbyWatchlistAdapter", () => {
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
        ashbyWatchlistAdapter.parseCatalogSources([
          {
            id: "railway",
            label: "Railway",
            ashbyUrl: "https://jobs.ashbyhq.com/railway",
          },
        ]),
      ).toEqual([
        {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("handles URLs with paths", () => {
      expect(
        ashbyWatchlistAdapter.parseCatalogSources([
          {
            id: "mistral",
            label: "Mistral",
            ashbyUrl: "https://jobs.ashbyhq.com/mistral/jobs",
          },
        ]),
      ).toEqual([
        {
          id: "ashby:mistral",
          label: "Mistral",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/mistral",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("rejects invalid entries", () => {
      expect(() =>
        ashbyWatchlistAdapter.parseCatalogSources([
          { id: "", label: "Test", ashbyUrl: "https://example.com" },
        ]),
      ).toThrow();
    });
  });

  describe("normalizeCustomSelection", () => {
    it("normalizes custom selections to canonical URL", () => {
      expect(
        ashbyWatchlistAdapter.normalizeCustomSelection({
          label: "https://jobs.ashbyhq.com/railway",
          careersUrl: "https://jobs.ashbyhq.com/railway",
        }),
      ).toEqual({
        label: "railway",
        careersUrl: "https://jobs.ashbyhq.com/railway",
      });
    });

    it("uses custom label when provided", () => {
      expect(
        ashbyWatchlistAdapter.normalizeCustomSelection({
          label: "Railway",
          careersUrl: "https://jobs.ashbyhq.com/railway",
        }),
      ).toEqual({
        label: "Railway",
        careersUrl: "https://jobs.ashbyhq.com/railway",
      });
    });
  });

  describe("fetchJobs", () => {
    it("fetches and normalizes jobs from Ashby", async () => {
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

      const result = await ashbyWatchlistAdapter.fetchJobs({
        source: {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      });

      expect(result.total).toBe(1);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        title: "Software Engineer",
        jobUrl: "https://jobs.ashbyhq.com/railway/job123",
        location: "Remote",
        employer: "Railway",
        sourceType: "ashby",
      });
    });

    it("handles null location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: "job123",
            title: "Software Engineer",
            jobUrl: "https://jobs.ashbyhq.com/railway/job123",
            location: null,
            department: null,
            team: null,
            employmentType: null,
            compensationTierDescription: null,
            isRemote: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        jobBoardUrl: "https://jobs.ashbyhq.com/railway",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await ashbyWatchlistAdapter.fetchJobs({
        source: {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles empty string location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: "job123",
            title: "Software Engineer",
            jobUrl: "https://jobs.ashbyhq.com/railway/job123",
            location: "",
            department: null,
            team: null,
            employmentType: null,
            compensationTierDescription: null,
            isRemote: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        jobBoardUrl: "https://jobs.ashbyhq.com/railway",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await ashbyWatchlistAdapter.fetchJobs({
        source: {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles undefined location", async () => {
      const mockResponse = {
        jobs: [
          {
            id: "job123",
            title: "Software Engineer",
            jobUrl: "https://jobs.ashbyhq.com/railway/job123",
            // location field missing
            department: null,
            team: null,
            employmentType: null,
            compensationTierDescription: null,
            isRemote: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        jobBoardUrl: "https://jobs.ashbyhq.com/railway",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await ashbyWatchlistAdapter.fetchJobs({
        source: {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("filters out jobs without jobUrl", async () => {
      const mockResponse = {
        jobs: [
          {
            id: "job123",
            title: "Software Engineer",
            jobUrl: "https://jobs.ashbyhq.com/railway/job123",
            location: "Remote",
            department: null,
            team: null,
            employmentType: null,
            compensationTierDescription: null,
            isRemote: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "job456",
            title: "No URL Job",
            jobUrl: "",
            location: "Remote",
            department: null,
            team: null,
            employmentType: null,
            compensationTierDescription: null,
            isRemote: false,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        jobBoardUrl: "https://jobs.ashbyhq.com/railway",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await ashbyWatchlistAdapter.fetchJobs({
        source: {
          id: "ashby:railway",
          label: "Railway",
          sourceType: "ashby",
          careersUrl: "https://jobs.ashbyhq.com/railway",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe("Software Engineer");
    });
  });
});
