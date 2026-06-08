import { fetchLeverJobs } from "@career-boards/lever";
import type { ExtractorManifest } from "@shared/types/extractors";

/**
 * Curated list of well-known companies using Lever for their career page.
 */
const LEVER_COMPANIES: string[] = [
  "flyio",
  "buffer",
  "gitbook",
  "wistia",
  "statuspage",
  "canny",
  "litmus",
  "userlist",
  "closeio",
];

export const manifest: ExtractorManifest = {
  id: "lever",
  displayName: "Lever",
  providesSources: ["lever"],
  async run(context) {
    if (context.shouldCancel?.()) {
      return { success: true, jobs: [] };
    }

    const existingJobUrls = await context.getExistingJobUrls?.() ?? [];
    const existingSet = new Set(existingJobUrls);

    const jobs: Array<{
      source: "lever";
      title: string;
      employer: string;
      jobUrl: string;
      location?: string;
      jobDescription?: string;
      datePosted?: string;
    }> = [];

    const total = LEVER_COMPANIES.length;

    context.onProgress?.({
      phase: "list",
      detail: `Lever: checking ${total} companies...`,
      termsTotal: total,
    });

    for (let i = 0; i < LEVER_COMPANIES.length; i++) {
      const company = LEVER_COMPANIES[i];

      if (context.shouldCancel?.()) break;

      context.onProgress?.({
        phase: "list",
        currentUrl: company,
        termsProcessed: i,
        termsTotal: total,
        detail: `Lever: fetching ${company}...`,
      });

      try {
        const result = await fetchLeverJobs({ companySlugOrUrl: company });
        if (context.shouldCancel?.()) break;

        for (const job of result.jobs) {
          if (!job.text?.trim()) continue;
          if (existingSet.has(job.hostedUrl)) continue;

          jobs.push({
            source: "lever",
            title: job.text.trim(),
            employer: company.charAt(0).toUpperCase() + company.slice(1),
            jobUrl: job.hostedUrl,
            location: job.categories?.location ?? undefined,
            jobDescription: job.descriptionPlain ?? undefined,
            datePosted: job.createdAt ? new Date(job.createdAt * 1000).toISOString() : undefined,
          });
        }
      } catch {
        // Company may not exist on Lever or may error — skip silently
      }

      context.onProgress?.({
        phase: "list",
        termsProcessed: i + 1,
        termsTotal: total,
        jobCardsFound: jobs.length,
        detail: `Lever: ${i + 1}/${total} companies checked, ${jobs.length} jobs found`,
      });
    }

    return { success: true, jobs };
  },
};
