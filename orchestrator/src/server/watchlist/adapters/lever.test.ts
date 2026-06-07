import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { leverWatchlistAdapter } from "./lever.js";

describe("leverWatchlistAdapter", () => {
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
        leverWatchlistAdapter.parseCatalogSources([
          {
            id: "flyio",
            label: "Fly.io",
            leverUrl: "https://jobs.lever.co/flyio",
          },
        ]),
      ).toEqual([
        {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("handles URLs with paths", () => {
      expect(
        leverWatchlistAdapter.parseCatalogSources([
          {
            id: "planetscale",
            label: "PlanetScale",
            leverUrl: "https://jobs.lever.co/planetscale/jobs",
          },
        ]),
      ).toEqual([
        {
          id: "lever:planetscale",
          label: "PlanetScale",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/planetscale",
          cxsJobsUrl: null,
        },
      ]);
    });

    it("rejects invalid entries", () => {
      expect(() =>
        leverWatchlistAdapter.parseCatalogSources([
          { id: "", label: "Test", leverUrl: "https://example.com" },
        ]),
      ).toThrow();
    });
  });

  describe("normalizeCustomSelection", () => {
    it("normalizes custom selections to canonical URL", () => {
      expect(
        leverWatchlistAdapter.normalizeCustomSelection({
          label: "https://jobs.lever.co/flyio",
          careersUrl: "https://jobs.lever.co/flyio",
        }),
      ).toEqual({
        label: "flyio",
        careersUrl: "https://jobs.lever.co/flyio",
      });
    });

    it("uses custom label when provided", () => {
      expect(
        leverWatchlistAdapter.normalizeCustomSelection({
          label: "Fly.io",
          careersUrl: "https://jobs.lever.co/flyio",
        }),
      ).toEqual({
        label: "Fly.io",
        careersUrl: "https://jobs.lever.co/flyio",
      });
    });
  });

  describe("fetchJobs", () => {
    it("fetches and normalizes jobs from Lever", async () => {
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

      const result = await leverWatchlistAdapter.fetchJobs({
        source: {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      });

      expect(result.total).toBe(1);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        title: "Software Engineer",
        jobUrl: "https://jobs.lever.co/flyio/abc123",
        location: "Remote",
        employer: "Fly.io",
        sourceType: "lever",
      });
    });

    it("handles null categories", async () => {
      const mockJobs = [
        {
          id: "abc123",
          text: "Software Engineer",
          hostedUrl: "https://jobs.lever.co/flyio/abc123",
          applyUrl: null,
          categories: null,
          descriptionPlain: "We are looking for a software engineer...",
          descriptionHtml: "<p>We are looking for a software engineer...</p>",
          createdAt: 1704067200000,
          updatedAt: 1704067200000,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJobs), { status: 200 }),
      );

      const result = await leverWatchlistAdapter.fetchJobs({
        source: {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles empty string location", async () => {
      const mockJobs = [
        {
          id: "abc123",
          text: "Software Engineer",
          hostedUrl: "https://jobs.lever.co/flyio/abc123",
          applyUrl: null,
          categories: {
            department: null,
            team: null,
            location: "",
            commitment: null,
            level: null,
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

      const result = await leverWatchlistAdapter.fetchJobs({
        source: {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("handles undefined location in categories", async () => {
      const mockJobs = [
        {
          id: "abc123",
          text: "Software Engineer",
          hostedUrl: "https://jobs.lever.co/flyio/abc123",
          applyUrl: null,
          categories: {
            department: "Engineering",
            team: null,
            // location field missing
            commitment: null,
            level: null,
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

      const result = await leverWatchlistAdapter.fetchJobs({
        source: {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs[0].location).toBeNull();
    });

    it("filters out jobs without hostedUrl", async () => {
      const mockJobs = [
        {
          id: "abc123",
          text: "Software Engineer",
          hostedUrl: "https://jobs.lever.co/flyio/abc123",
          applyUrl: null,
          categories: { location: "Remote" },
          descriptionPlain: "...",
          descriptionHtml: "...",
          createdAt: 1704067200000,
          updatedAt: 1704067200000,
        },
        {
          id: "def456",
          text: "No URL Job",
          hostedUrl: "",
          applyUrl: null,
          categories: { location: "Remote" },
          descriptionPlain: "...",
          descriptionHtml: "...",
          createdAt: 1704067200000,
          updatedAt: 1704067200000,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJobs), { status: 200 }),
      );

      const result = await leverWatchlistAdapter.fetchJobs({
        source: {
          id: "lever:flyio",
          label: "Fly.io",
          sourceType: "lever",
          careersUrl: "https://jobs.lever.co/flyio",
          cxsJobsUrl: null,
        },
      });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe("Software Engineer");
    });
  });
});
