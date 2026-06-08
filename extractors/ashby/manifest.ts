import { fetchAshbyJobs } from "@career-boards/ashby";
import type { ExtractorManifest } from "@shared/types/extractors";

/**
 * Curated list of well-known companies using Ashby for their career page.
 */
const ASHBY_COMPANIES: string[] = [
  "anthropic",
  "ramp",
  "loom",
  "notion",
  "linear",
  "vercel",
  "railway",
  "clerk",
  "resend",
  "supabase",
  "neon",
  "framer",
  "cloudflare",
];

export const manifest: ExtractorManifest = {
  id: "ashby",
  displayName: "Ashby",
  providesSources: ["ashby"],
  async run(context) {
    if (context.shouldCancel?.()) {
      return { success: true, jobs: [] };
    }

    const existingJobUrls = await context.getExistingJobUrls?.() ?? [];
    const existingSet = new Set(existingJobUrls);

    const jobs: Array<{
      source: "ashby";
      title: string;
      employer: string;
      jobUrl: string;
      location?: string;
      salary?: string;
      isRemote?: boolean;
      datePosted?: string;
    }> = [];

    const total = ASHBY_COMPANIES.length;

    context.onProgress?.({
      phase: "list",
      detail: `Ashby: checking ${total} companies...`,
      termsTotal: total,
    });

    for (let i = 0; i < ASHBY_COMPANIES.length; i++) {
      const company = ASHBY_COMPANIES[i];

      if (context.shouldCancel?.()) break;

      context.onProgress?.({
        phase: "list",
        currentUrl: company,
        termsProcessed: i,
        termsTotal: total,
        detail: `Ashby: fetching ${company}...`,
      });

      try {
        const result = await fetchAshbyJobs({ companySlugOrUrl: company });
        if (context.shouldCancel?.()) break;

        for (const job of result.jobs) {
          if (!job.title?.trim()) continue;
          if (existingSet.has(job.jobUrl)) continue;

          jobs.push({
            source: "ashby",
            title: job.title.trim(),
            employer: company.charAt(0).toUpperCase() + company.slice(1),
            jobUrl: job.jobUrl,
            location: job.location ?? undefined,
            salary: job.compensationTierDescription ?? undefined,
            isRemote: job.isRemote || undefined,
            datePosted: job.createdAt ?? undefined,
          });
        }
      } catch {
        // Company may not exist on Ashby or may error — skip silently
      }

      context.onProgress?.({
        phase: "list",
        termsProcessed: i + 1,
        termsTotal: total,
        jobCardsFound: jobs.length,
        detail: `Ashby: ${i + 1}/${total} companies checked, ${jobs.length} jobs found`,
      });
    }

    return { success: true, jobs };
  },
};
