import {
  extractCompanySlug,
  buildAshbyApiUrl,
  parseAshbyUrl,
  fetchAshbyJobs,
} from "@career-boards/ashby";
import type { ManualJobDraft, WatchlistSelectedSource } from "@shared/types";
import { z } from "zod";
import type { WatchlistCatalogSourceAdapter } from "./types";

const ASHBY_LOGO_MAX_BYTES = 1_000_000;

const ashbySourceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  ashbyUrl: z.string().trim().url().max(2000),
});

export const ashbyWatchlistAdapter: WatchlistCatalogSourceAdapter = {
  sourceType: "ashby",
  descriptor: {
    sourceType: "ashby",
    label: "Ashby",
    catalogLabel: "Ashby company",
    customSourceOptionLabel: "Choose your own Ashby URL",
    customSourceSearchText: "custom ashby url",
    customSourceInputLabel: "Custom Ashby URL",
    customSourcePlaceholder: "https://jobs.ashbyhq.com/company",
    customSourceHelpText:
      "Use the public Ashby careers URL, not an individual job posting URL.",
    emptyCatalogText: "No Ashby companies found.",
    fetchingLabel: "Fetching from Ashby...",
    invalidUrlMessage: "Invalid Ashby URL",
    supportsCustomSource: true,
    supportsBranding: true,
  },
  catalogSchema: ashbySourceSchema,
  parseCatalogSources(entries) {
    return z
      .array(ashbySourceSchema)
      .parse(entries)
      .map((entry) => {
        const parsed = parseAshbyUrl(entry.ashbyUrl);
        return {
          id: buildSourceId(parsed.companySlug),
          label: entry.label,
          sourceType: "ashby",
          careersUrl: parsed.careersUrl,
          cxsJobsUrl: null,
        };
      });
  },
  hydrateSelectedSource(source) {
    return {
      ...source,
      label: getHydratedAshbyLabel(source),
    };
  },
  normalizeCustomSelection(input) {
    let companySlug: string;
    let canonicalCareersUrl: string;

    try {
      const parsed = parseAshbyUrl(input.careersUrl);
      companySlug = parsed.companySlug;
      canonicalCareersUrl = parsed.careersUrl;
    } catch {
      // If URL parsing fails, try to extract slug from raw input
      companySlug = input.careersUrl.trim();
      canonicalCareersUrl = `https://jobs.ashbyhq.com/${companySlug}`;
    }

    const trimmedLabel = input.label?.trim();
    const label =
      trimmedLabel &&
      trimmedLabel !== input.careersUrl.trim() &&
      trimmedLabel !== canonicalCareersUrl
        ? trimmedLabel
        : companySlug;

    return {
      label,
      careersUrl: canonicalCareersUrl,
    };
  },
  async fetchJobs(input) {
    const companySlug = extractCompanySlug(input.source.careersUrl);
    const result = await fetchAshbyJobs({
      companySlugOrUrl: companySlug,
      signal: input.signal,
    });
    const source = buildSourceId(companySlug);

    return {
      total: result.total,
      fetched: result.jobs.length,
      jobs: result.jobs
        .filter((job) => job.jobUrl)
        .map((job) => normalizeAshbyJob(input.source, source, job)),
    };
  },
  async fetchJobDetails(input) {
    // Ashby API doesn't have a separate job details endpoint
    // The job page URL is the same as the jobUrl
    return {
      jobRef: input.jobRef,
      jobUrl: input.jobRef,
      descriptionHtml: "", // Will be fetched from the job page if needed
    };
  },
  async prepareImportDraft(input) {
    const companySlug = extractCompanySlug(input.source.careersUrl);
    const source = buildSourceId(companySlug);
    const draft: ManualJobDraft = {
      source,
      sourceJobId: input.jobRef,
      title: "", // Will be populated from job listing
      employer: input.source.label,
      jobUrl: input.jobRef,
      applicationLink: input.jobRef,
      location: null,
      jobDescription: "", // Will be populated from job listing
      jobType: null,
    };

    return {
      draft,
      source: draft.source ?? null,
      sourceHost:
        getSourceHost(input.source.careersUrl) ?? getSourceHost(input.jobRef),
    };
  },
  async fetchBranding(input) {
    const companySlug = extractCompanySlug(input.source.careersUrl);
    const logoUrl = `https://api.ashbyhq.com/posting-api/job-board/${companySlug}/logo`;

    const response = await fetch(logoUrl, {
      method: "GET",
      redirect: "follow",
      signal: input.signal,
    });

    if (!response.ok) {
      // Ashby doesn't always have logos, so we return null
      return {
        careersUrl: input.source.careersUrl,
        logoUrl: null,
        mimeType: null,
        imageDataUrl: null,
      };
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > ASHBY_LOGO_MAX_BYTES
    ) {
      return {
        careersUrl: input.source.careersUrl,
        logoUrl: null,
        mimeType: null,
        imageDataUrl: null,
      };
    }

    const contentType = response.headers.get("content-type");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > ASHBY_LOGO_MAX_BYTES) {
      return {
        careersUrl: input.source.careersUrl,
        logoUrl: null,
        mimeType: null,
        imageDataUrl: null,
      };
    }
    const mimeType = detectLogoMimeType(bytes, contentType);
    if (!mimeType) {
      return {
        careersUrl: input.source.careersUrl,
        logoUrl: null,
        mimeType: null,
        imageDataUrl: null,
      };
    }

    return {
      careersUrl: input.source.careersUrl,
      logoUrl,
      mimeType,
      imageDataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    };
  },
};

function buildSourceId(companySlug: string): string {
  return `ashby:${companySlug}`;
}

function getHydratedAshbyLabel(source: {
  sourceType: string;
  label: string;
  careersUrl: string;
}): string {
  if (
    source.sourceType === "ashby" &&
    (!source.label.trim() || source.label.trim() === source.careersUrl.trim())
  ) {
    try {
      const parsed = parseAshbyUrl(source.careersUrl);
      return parsed.companySlug;
    } catch {
      return source.label;
    }
  }

  return source.label;
}

function normalizeAshbyJob(
  selectedSource: WatchlistSelectedSource,
  source: string,
  job: {
    id: string;
    title: string;
    jobUrl: string;
    location: string | null;
    createdAt: string;
  },
) {
  return {
    jobRef: job.jobUrl,
    source,
    sourceJobId: job.id,
    sourceType: selectedSource.sourceType,
    title: job.title,
    employer: selectedSource.label,
    jobUrl: job.jobUrl,
    applicationLink: job.jobUrl,
    location: normalizeLocation(job.location),
    postedAt: job.createdAt ?? null,
  };
}

function normalizeLocation(location: string | null | undefined): string | null {
  if (location === null || location === undefined) {
    return null;
  }
  const trimmed = location.trim();
  if (trimmed === "") {
    return null;
  }
  return trimmed;
}

function getSourceHost(value: string): string | null {
  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

function detectLogoMimeType(
  bytes: Buffer,
  contentTypeHeader: string | null,
): string | null {
  const normalizedContentType = contentTypeHeader?.trim().toLowerCase() ?? "";
  if (normalizedContentType.startsWith("image/")) {
    return contentTypeHeader?.trim() ?? normalizedContentType;
  }

  if (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.byteLength >= 6 &&
    (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "image/gif";
  }

  if (
    bytes.byteLength >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
