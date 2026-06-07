# JobOps — Architecture, Workflow & Enhancement Plan

## Repo Structure

```
job-ops/
├── extractors/          # One directory per job source; each exports a manifest
│   ├── adzuna/
│   ├── gradcracker/
│   ├── hiringcafe/
│   ├── jobspy/          # Aggregator: LinkedIn, Indeed, Glassdoor
│   ├── startupjobs/
│   ├── ukvisajobs/
│   └── workingnomads/
├── orchestrator/        # Main app — Express backend + React frontend
│   └── src/
│       ├── client/      # React UI (pages, components)
│       └── server/
│           ├── api/routes/      # REST endpoints (jobs, pipeline, settings, etc.)
│           ├── db/              # Drizzle ORM schema + migrations (SQLite)
│           ├── extractors/      # Registry + dynamic manifest discovery
│           ├── pipeline/        # Pipeline runner + step implementations
│           ├── repositories/    # DB access layer (jobs, settings, pipeline)
│           └── services/        # Scorer, ghostwriter, PDF, applicationTracking
├── shared/              # TypeScript types and utilities shared across packages
│   └── src/
│       ├── extractors/  # EXTRACTOR_SOURCE_IDS catalog + metadata
│       └── types/       # Job, Extractor, and Stage types
└── visa-sponsor-providers/  # UK visa sponsor data for job matching
```

---

## Pipeline Workflow

```
User settings (search terms, profile, selected sources)
        │
        ▼
1. discoverJobsStep
   - Loads selected extractor manifests from registry
   - Runs all manifests in parallel via manifest.run(context)
   - Deduplicates by jobUrl against existing DB entries
   - Filters by city and blocked company keywords
   - Returns: CreateJobInput[]

        │
        ▼
2. importJobsStep
   - Writes new jobs to SQLite with status = "discovered"

        │
        ▼
3. scoreJobsStep
   - LLM scores each unscored job 0–100 for profile fit
   - Writes suitabilityScore + suitabilityReason back to DB

        │
        ▼
4. selectJobsStep
   - Filters by minimum suitability score
   - Selects top N jobs for processing

        │
        ▼
5. processJobsStep (per selected job)
   - AI-generates tailored summary + headline
   - Selects relevant projects from profile
   - Generates tailored PDF resume via RxResume
   - Sets status = "ready"

        │
        ▼
6. User review (OrchestratorPage)
   - Reviews "ready" jobs, applies externally, marks "applied"

        │
        ▼
7. Post-application tracking
   - Gmail integration monitors recruiter replies
   - Auto-advances stage events (recruiter_screen → technical_interview → offer → closed)
   - Kanban board (InProgressBoardPage) reflects current stage
```

### Job Status Lifecycle

```
discovered → processing → ready → applied → in_progress → closed
                                         ↘ skipped
                                         ↘ expired
```

### Application Stage Progression

```
applied → recruiter_screen → assessment → hiring_manager_screen
       → technical_interview → onsite → offer → closed
```

---

## Key Files

| Role | File |
|------|------|
| Pipeline runner | `orchestrator/src/server/pipeline/orchestrator.ts` |
| Job discovery step | `orchestrator/src/server/pipeline/steps/discover-jobs.ts` |
| Extractor registry | `orchestrator/src/server/extractors/registry.ts` |
| Extractor discovery (auto-load) | `orchestrator/src/server/extractors/discovery.ts` |
| Source ID catalog | `shared/src/extractors/index.ts` |
| Extractor type contract | `shared/src/types/extractors.ts` |
| Job type definitions | `shared/src/types/jobs.ts` |
| DB schema | `orchestrator/src/server/db/schema.ts` |
| Application tracking | `orchestrator/src/server/services/applicationTracking.ts` |
| Jobs repository | `orchestrator/src/server/repositories/jobs.ts` |
| Job API routes | `orchestrator/src/server/api/routes/jobs.ts` |

---

## Enhancement: Custom Company Job Board Tracking

### Problem

The system only discovers jobs via aggregators (LinkedIn, Indeed, Glassdoor, etc.) or a small set of niche boards. Many companies post roles exclusively — or earlier — on their own career pages. There is no mechanism to monitor these directly.

### Solution: Per-Company Extractor Packages

The extractor architecture already supports this with zero changes to the orchestrator, registry, or pipeline. The discovery system (`discovery.ts:14`) auto-loads any `manifest.ts` or `src/manifest.ts` found under `/extractors/*/`.

---

### Files to Modify Per New Company Board

#### 1. `/shared/src/extractors/index.ts`

Add the source ID to the catalog (two places):

```typescript
export const EXTRACTOR_SOURCE_IDS = [
  // ... existing sources ...
  "acme-careers",   // NEW
] as const;

export const EXTRACTOR_SOURCE_METADATA: Record<ExtractorSourceId, ExtractorSourceMetadata> = {
  // ... existing entries ...
  "acme-careers": {
    label: "Acme Careers",
    order: 110,           // append after existing entries
    category: "pipeline",
    // requiresCredentials: true  // add if their API needs a key
  },
};
```

#### 2. `/extractors/<company>/manifest.ts` (new file)

Implement `ExtractorManifest` from `@shared/types/extractors`:

```typescript
import type { ExtractorManifest } from "@shared/types/extractors";

export const manifest: ExtractorManifest = {
  id: "acme-careers",
  displayName: "Acme Careers",
  providesSources: ["acme-careers"],

  async run(context) {
    if (context.shouldCancel?.()) return { success: true, jobs: [] };

    // Fetch from company's API or careers page
    // Return normalized CreateJobInput[]
    const jobs = await fetchAcmeJobs(context.searchTerms);

    return { success: true, jobs };
  },
};

export default manifest;
```

No other files need to change — the registry, pipeline steps, DB schema, and UI all pick up new sources automatically.

---

### Extractor Implementation Patterns

#### Public JSON API (simplest)

Fetch a JSON endpoint the careers page uses internally. Most modern ATSs (Greenhouse, Lever, Ashby, Workday) expose public endpoints.

```typescript
const response = await fetch("https://api.greenhouse.io/v1/boards/acme/jobs");
const data = await response.json();
return {
  success: true,
  jobs: data.jobs.map(job => ({
    source: "acme-careers",
    jobUrl: job.absolute_url,
    title: job.title,
    employer: "Acme Corp",
    location: job.location.name,
    jobDescription: job.content,
    datePosted: job.updated_at,
  })),
};
```

**Known public ATS endpoints:**
- Greenhouse: `https://api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
- Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
- Ashby: `https://api.ashbyhq.com/posting-public/job-board/{slug}`
- Workday: company-specific subdomain with a consistent REST pattern

#### HTML Scraping (fallback)

Use `fetch` + a lightweight HTML parser (e.g., `cheerio`) for sites without a JSON API. Mirror the approach in `extractors/gradcracker/`.

#### Browser Automation (for JS-heavy sites)

Use Playwright/Camoufox as in `extractors/ukvisajobs/`. Add it as a dev dependency in the extractor's `package.json`.

---

### Recommended Companies to Add First

Prioritize companies whose roles:
1. Appear late or not at all on aggregators
2. Use a public ATS with a documented API (Greenhouse, Lever, Ashby)
3. Are target employers already tracked manually

Suggested initial set (all use Greenhouse or Lever with public APIs — no credentials needed):
- Stripe (`boards.greenhouse.io/stripe`)
- Linear (`jobs.lever.co/linear`)
- Vercel (`jobs.ashbyhq.com/vercel`)
- Anthropic (`boards.greenhouse.io/anthropic`)

---

### Settings Integration (optional, for API-key-gated boards)

If a company's board requires authentication, set `requiresCredentials: true` in the metadata. The UI will then surface a settings field. Read the credential in the extractor via:

```typescript
const apiKey = context.settings["acme-careersApiKey"];
```

The settings key convention is `<sourceId>ApiKey` (camelCase, no hyphens).

---

### Testing a New Extractor

Run the extractor in isolation before wiring it into the pipeline:

```bash
cd extractors/<company>
npx tsx src/main.ts   # or manifest.ts if it has a __main__ block
```

The registry will log a warning (not error) in development if a catalog source has no manifest, so you can add the source ID to the catalog and build the extractor incrementally without breaking the pipeline.
