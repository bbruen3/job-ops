import {
  extractCompanySlug,
  buildLeverApiUrl,
  parseLeverUrl,
  fetchLeverJobs,
} from "@career-boards/lever";
import type { ManualJobDraft, WatchlistSelectedSource } from "@shared/types";
import { z } from "zod";
import type { WatchlistCatalogSourceAdapter } from "./types";

const LEVER_LOGO_MAX_BYTES = 1_000_000;

const leverSourceSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  leverUrl: z.string().trim().url().max(2000),
});

export const leverWatchlistAdapter: WatchlistCatalogSourceAdapter = {
  sourceType: "lever",
  descriptor: {
    sourceType: "lever",
    label: "Lever",
    catalogLabel: "Lever company",
    customSourceOptionLabel: "Choose your own Lever URL",
    customSourceSearchText: "custom lever url",
    customSourceInputLabel: "Custom Lever URL",
    customSourcePlaceholder: "https://jobs.lever.co/company",
    customSourceHelpText:
      "Use the public Lever careers URL, not an individual job posting URL.",
    emptyCatalogText: "No Lever companies found.",
    fetchingLabel: "Fetching from Lever...",
    invalidUrlMessage: "Invalid Lever URL",
    supportsCustomSource: true,
    supportsBranding: true,
  },
  catalogSchema: leverSourceSchema,
  parseCatalogSources(entries) {
    return z
      .array(leverSourceSchema)
      .parse(entries)
      .map((entry) => {
        const parsed = parseLeverUrl(entry.leverUrl);
        return {
          id: buildSourceId(parsed.companySlug),
          label: entry.label,
          sourceType: "lever",
          careersUrl: parsed.careersUrl,
          cxsJobsUrl: null,
        };
      });
  },
  hydrateSelectedSource(source) {
    return {
      ...source,
      label: getHydratedLeverLabel(source),
    };
  },
  normalizeCustomSelection(input) {
    let companySlug: string;
    let canonicalCareersUrl: string;

    try {
      const parsed = parseLeverUrl(input.careersUrl);
      companySlug = parsed.companySlug;
      canonicalCareersUrl = parsed.careersUrl;
    } catch {
      // If URL parsing fails, try to extract slug from raw input
      companySlug = input.careersUrl.trim();
      canonicalCareersUrl = `https://jobs.lever.co/${companySlug}`;
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
    const result = await fetchLeverJobs({
      companySlugOrUrl: companySlug,
      signal: input.signal,
    });
    const source = buildSourceId(companySlug);

    return {
      total: result.total,
      fetched: result.jobs.length,
      jobs: result.jobs
        .filter((job) => job.hostedUrl)
        .map((job) => normalizeLeverJob(input.source, source, job)),
    };
  },
  async fetchJobDetails(input) {
    // Lever API doesn't have a separate job details endpoint
    // The job page URL is the same as the hostedUrl
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
    // Lever doesn't have a public logo API, so we return null
    return {
      careersUrl: input.source.careersUrl,
      logoUrl: null,
      mimeType: null,
      imageDataUrl: null,
    };
  },
};

function buildSourceId(companySlug: string): string {
  return `lever:${companySlug}`;
}

function getHydratedLeverLabel(source: {
  sourceType: string;
  label: string;
  careersUrl: string;
}): string {
  if (
    source.sourceType === "lever" &&
    (!source.label.trim() || source.label.trim() === source.careersUrl.trim())
  ) {
    try {
      const parsed = parseLeverUrl(source.careersUrl);
      return parsed.companySlug;
    } catch {
      return source.label;
    }
  }

  return source.label;
}

function normalizeLeverJob(
  selectedSource: WatchlistSelectedSource,
  source: string,
  job: {
    id: string;
    text: string;
    hostedUrl: string;
    categories: {
      department: string | null;
      team: string | null;
      location: string | null;
      commitment: string | null;
      level: string | null;
    } | null;
    createdAt: number;
    updatedAt: number;
  },
) {
  return {
    jobRef: job.hostedUrl,
    source,
    sourceJobId: job.id,
    sourceType: selectedSource.sourceType,
    title: job.text,
    employer: selectedSource.label,
    jobUrl: job.hostedUrl,
    applicationLink: job.hostedUrl,
    location: normalizeLocation(job.categories?.location),
    postedAt: job.createdAt
      ? new Date(job.createdAt).toISOString()
      : null,
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
