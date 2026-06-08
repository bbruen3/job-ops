import { fetchGreenhouseJobs } from "@career-boards/greenhouse";
import type { ExtractorManifest } from "@shared/types/extractors";

/**
 * Curated list of well-known companies using Greenhouse for their career page.
 */
const GREENHOUSE_COMPANIES: string[] = [
  "airbnb",
  "dropbox",
  "instacart",
  "stripe",
  "doordash",
  "reddit",
  "coinbase",
  "chime",
  "brex",
  "datadog",
  "asana",
  "temporal",
  "webflow",
  "hashicorp",
  "mercury",
];

export const manifest: ExtractorManifest = {
  id: "greenhouse",
  displayName: "Greenhouse",
  providesSources: ["greenhouse"],
  async run(context) {
    if (context.shouldCancel?.()) {
      return { success: true, jobs: [] };
    }

    const existingJobUrls = await context.getExistingJobUrls?.() ?? [];
    const existingSet = new Set(existingJobUrls);

    const jobs: Array<{
      source: "greenhouse";
      title: string;
      employer: string;
      jobUrl: string;
      location?: string;
      datePosted?: string;
    }> = [];

    const total = GREENHOUSE_COMPANIES.length;

    context.onProgress?.({
      phase: "list",
      detail: `Greenhouse: checking ${total} companies...`,
      termsTotal: total,
    });

    for (let i = 0; i < GREENHOUSE_COMPANIES.length; i++) {
      const company = GREENHOUSE_COMPANIES[i];

      if (context.shouldCancel?.()) break;

      context.onProgress?.({
        phase: "list",
        currentUrl: company,
        termsProcessed: i,
        termsTotal: total,
        detail: `Greenhouse: fetching ${company}...`,
      });

      try {
        const result = await fetchGreenhouseJobs({ boardTokenOrUrl: company });
        if (context.shouldCancel?.()) break;

        for (const job of result.jobs) {
          if (!job.title?.trim()) continue;
          if (existingSet.has(job.absolute_url)) continue;

          jobs.push({
            source: "greenhouse",
            title: job.title.trim(),
            employer: company.charAt(0).toUpperCase() + company.slice(1),
            jobUrl: job.absolute_url,
            location: job.location?.name ?? undefined,
            datePosted: job.created_at ?? undefined,
          });
        }
      } catch {
        // Company may not exist on Greenhouse or may error — skip silently
      }

      context.onProgress?.({
        phase: "list",
        termsProcessed: i + 1,
        termsTotal: total,
        jobCardsFound: jobs.length,
        detail: `Greenhouse: ${i + 1}/${total} companies checked, ${jobs.length} jobs found`,
      });
    }

    return { success: true, jobs };
  },
};
