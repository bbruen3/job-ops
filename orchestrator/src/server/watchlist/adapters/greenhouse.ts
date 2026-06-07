import {
  extractBoardToken,
  buildGreenhouseApiUrl,
  parseGreenhouseUrl,
  fetchGreenhouseJobs,
} from "@career-boards/greenhouse";
import type { ManualJobDraft, WatchlistSelectedSource } from "@shared/types";
import { z } from "zod";
import type { WatchlistCatalogSourceAdapter } from "./types";

const GREENHOUSE_LOGO_MAX_BYTES = 1_000_000;

const greenhouseSourceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  greenhouseUrl: z.string().trim().url().max(2000),
});

export const greenhouseWatchlistAdapter: WatchlistCatalogSourceAdapter = {
  sourceType: "greenhouse",
  descriptor: {
    sourceType: "greenhouse",
    label: "Greenhouse",
    catalogLabel: "Greenhouse company",
    customSourceOptionLabel: "Choose your own Greenhouse URL",
    customSourceSearchText: "custom greenhouse url",
    customSourceInputLabel: "Custom Greenhouse URL",
    customSourcePlaceholder: "https://boards.greenhouse.io/company",
    customSourceHelpText:
      "Use the public Greenhouse careers URL, not an individual job posting URL.",
    emptyCatalogText: "No Greenhouse companies found.",
    fetchingLabel: "Fetching from Greenhouse...",
    invalidUrlMessage: "Invalid Greenhouse URL",
    supportsCustomSource: true,
    supportsBranding: true,
  },
  catalogSchema: greenhouseSourceSchema,
  parseCatalogSources(entries) {
    return z
      .array(greenhouseSourceSchema)
      .parse(entries)
      .map((entry) => {
        const parsed = parseGreenhouseUrl(entry.greenhouseUrl);
        return {
          id: buildSourceId(parsed.boardToken),
          label: entry.label,
          sourceType: "greenhouse",
          careersUrl: parsed.careersUrl,
          cxsJobsUrl: null,
        };
      });
  },
  hydrateSelectedSource(source) {
    return {
      ...source,
      label: getHydratedGreenhouseLabel(source),
    };
  },
  normalizeCustomSelection(input) {
    let boardToken: string;
    let canonicalCareersUrl: string;

    try {
      const parsed = parseGreenhouseUrl(input.careersUrl);
      boardToken = parsed.boardToken;
      canonicalCareersUrl = parsed.careersUrl;
    } catch {
      // If URL parsing fails, try to extract token from raw input
      boardToken = input.careersUrl.trim();
      canonicalCareersUrl = `https://boards.greenhouse.io/${boardToken}`;
    }

    const trimmedLabel = input.label?.trim();
    const label =
      trimmedLabel &&
      trimmedLabel !== input.careersUrl.trim() &&
      trimmedLabel !== canonicalCareersUrl
        ? trimmedLabel
        : boardToken;

    return {
      label,
      careersUrl: canonicalCareersUrl,
    };
  },
  async fetchJobs(input) {
    const boardToken = extractBoardToken(input.source.careersUrl);
    const result = await fetchGreenhouseJobs({
      boardTokenOrUrl: boardToken,
      signal: input.signal,
    });
    const source = buildSourceId(boardToken);

    return {
      total: result.total,
      fetched: result.jobs.length,
      jobs: result.jobs
        .filter((job) => job.absolute_url)
        .map((job) => normalizeGreenhouseJob(input.source, source, job)),
    };
  },
  async fetchJobDetails(input) {
    // Greenhouse API doesn't have a separate job details endpoint
    // The job page URL is the same as the listing URL
    return {
      jobRef: input.jobRef,
      jobUrl: input.jobRef,
      descriptionHtml: "", // Will be fetched from the job page if needed
    };
  },
  async prepareImportDraft(input) {
    const boardToken = extractBoardToken(input.source.careersUrl);
    const source = buildSourceId(boardToken);
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
    const boardToken = extractBoardToken(input.source.careersUrl);
    const logoUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/logo`;

    const response = await fetch(logoUrl, {
      method: "GET",
      redirect: "follow",
      signal: input.signal,
    });

    if (!response.ok) {
      // Greenhouse doesn't always have logos, so we return a placeholder
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
      contentLength > GREENHOUSE_LOGO_MAX_BYTES
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
    if (bytes.byteLength > GREENHOUSE_LOGO_MAX_BYTES) {
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

function buildSourceId(boardToken: string): string {
  return `greenhouse:${boardToken}`;
}

function getHydratedGreenhouseLabel(source: {
  sourceType: string;
  label: string;
  careersUrl: string;
}): string {
  if (
    source.sourceType === "greenhouse" &&
    (!source.label.trim() || source.label.trim() === source.careersUrl.trim())
  ) {
    try {
      const parsed = parseGreenhouseUrl(source.careersUrl);
      return parsed.boardToken;
    } catch {
      return source.label;
    }
  }

  return source.label;
}

function normalizeGreenhouseJob(
  selectedSource: WatchlistSelectedSource,
  source: string,
  job: {
    id: number;
    title: string;
    absolute_url: string;
    location: { name: string } | null;
    updated_at: string;
  },
) {
  return {
    jobRef: job.absolute_url,
    source,
    sourceJobId: String(job.id),
    sourceType: selectedSource.sourceType,
    title: job.title,
    employer: selectedSource.label,
    jobUrl: job.absolute_url,
    applicationLink: job.absolute_url,
    location: normalizeLocation(job.location?.name),
    postedAt: job.updated_at ?? null,
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
