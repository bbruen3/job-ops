## 1. Greenhouse Adapter Package (thin, raw responses)

- [x] 1.1 Create `career-boards/greenhouse/package.json` with exports for URL parsing and job fetching
- [x] 1.2 Implement `greenhouse-url.ts`: parse Greenhouse careers URLs, extract board token (port from career-ops `providers/greenhouse.mjs` `resolveApiUrl`)
- [x] 1.3 Implement `get-jobs-from-board.ts`: GET `boards-api.greenhouse.io/v1/boards/{token}/jobs`, return raw `{ jobs: [...] }` response (no normalization)
- [x] 1.4 Implement SSRF protection: hostname allowlist (`boards-api.greenhouse.io`, `boards.greenhouse.io`, `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io`), `redirect: 'error'`
- [x] 1.5 Add unit tests for URL parsing (standard URLs, custom domains, EU domains, edge cases)
- [x] 1.6 Add unit tests for job fetching (mock HTTP responses, SSRF blocking, empty boards)

## 2. Greenhouse Watchlist Adapter (normalization layer)

- [x] 2.1 Create `orchestrator/src/server/watchlist/adapters/greenhouse.ts` implementing `WatchlistCatalogSourceAdapter`
- [x] 2.2 Implement normalization: `absolute_url` → `jobUrl`, `location.name` → `location`, `title` → `title` (adapter layer, not package)
- [x] 2.3 Implement null/missing location handling: `null`, `undefined`, empty string → `location: null`
- [x] 2.4 Implement `parseCatalogSources` with Zod schema validation
- [x] 2.5 Implement `fetchJobs` wiring to `career-boards/greenhouse` package + normalization
- [x] 2.6 Implement `fetchJobDetails` and `prepareImportDraft`
- [x] 2.7 Implement `fetchBranding` to fetch company logo from Greenhouse
- [x] 2.8 Register adapter in `orchestrator/src/server/watchlist/adapters/index.ts`
- [x] 2.9 Add unit tests for adapter (mock package calls, verify normalization)
- [x] 2.10 Add unit tests for null/missing location (present, undefined, null, empty string)

## 3. Lever Adapter Package (thin, raw responses)

- [x] 3.1 Create `career-boards/lever/package.json` with exports for URL parsing and job fetching
- [x] 3.2 Implement `lever-url.ts`: parse Lever careers URLs, extract company slug (port from career-ops `providers/lever.mjs` `resolveApiUrl`)
- [x] 3.3 Implement `get-jobs-from-postings.ts`: GET `api.lever.co/v0/postings/{slug}`, return raw `[{...}]` root array (no normalization)
- [x] 3.4 Add unit tests for URL parsing (standard URLs, URLs with paths, edge cases)
- [x] 3.5 Add unit tests for job fetching (mock HTTP responses, non-array responses, empty companies)

## 4. Lever Watchlist Adapter (normalization layer)

- [x] 4.1 Create `orchestrator/src/server/watchlist/adapters/lever.ts` implementing `WatchlistCatalogSourceAdapter`
- [x] 4.2 Implement normalization: `text` → `title`, `hostedUrl` → `jobUrl`, `categories.location` → `location` (adapter layer, not package)
- [x] 4.3 Implement null/missing location handling: `null`, `undefined`, empty string → `location: null`
- [x] 4.4 Implement `parseCatalogSources` with Zod schema validation
- [x] 4.5 Implement `fetchJobs` wiring to `career-boards/lever` package + normalization
- [x] 4.6 Implement `fetchJobDetails` and `prepareImportDraft`
- [x] 4.7 Implement `fetchBranding` to fetch company logo from Lever
- [x] 4.8 Register adapter in `orchestrator/src/server/watchlist/adapters/index.ts`
- [x] 4.9 Add unit tests for adapter (mock package calls, verify normalization)
- [x] 4.10 Add unit tests for null/missing location (present, undefined, null, empty string)

## 5. Ashby Adapter Package (thin, raw responses)

- [x] 5.1 Create `career-boards/ashby/package.json` with exports for URL parsing and job fetching
- [x] 5.2 Implement `ashby-url.ts`: parse Ashby careers URLs, extract company slug (port from career-ops `providers/ashby.mjs` `resolveApiUrl`)
- [x] 5.3 Implement `get-jobs-from-board.ts`: GET `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`, return raw `{ jobs: [...] }` response (no normalization)
- [x] 5.4 Add unit tests for URL parsing (standard URLs, URLs with paths, edge cases)
- [x] 5.5 Add unit tests for job fetching (mock HTTP responses, empty boards)

## 6. Ashby Watchlist Adapter (normalization layer)

- [x] 6.1 Create `orchestrator/src/server/watchlist/adapters/ashby.ts` implementing `WatchlistCatalogSourceAdapter`
- [x] 6.2 Implement normalization: `jobUrl` → `jobUrl`, `location` → `location`, `title` → `title` (adapter layer, not package)
- [x] 6.3 Implement null/missing location handling: `null`, `undefined`, empty string → `location: null`
- [x] 6.4 Implement `parseCatalogSources` with Zod schema validation
- [x] 6.5 Implement `fetchJobs` wiring to `career-boards/ashby` package + normalization
- [x] 6.6 Implement `fetchJobDetails` and `prepareImportDraft`
- [x] 6.7 Implement `fetchBranding` to fetch company logo from Ashby
- [x] 6.8 Register adapter in `orchestrator/src/server/watchlist/adapters/index.ts`
- [x] 6.9 Add unit tests for adapter (mock package calls, verify normalization)
- [x] 6.10 Add unit tests for null/missing location (present, undefined, null, empty string)

## 7. ATS-Optimized Resume Builder (7-step pipeline, separate artifact)

- [x] 7.1 Port career-ops `normalizeTextForATS()` to TypeScript (Unicode→ASCII: em-dashes, smart quotes, zero-width chars, non-breaking spaces)
- [x] 7.2 Implement JD keyword extraction: LLM call to extract 15-20 keyword phrases from job description (step 1/7)
- [x] 7.3 Implement open-ended role classification: LLM call to produce RoleClassification with concrete, matchable emphasisAreas (step 2/7)
- [x] 7.4 Implement Professional Summary rewrite: LLM call to inject top 5 JD keywords into existing summary (step 3/7)
- [x] 7.5 Implement project selection using emphasisAreas substring matching against project descriptions (step 4/7)
- [x] 7.6 Implement experience bullet reordering: LLM call to reorder bullets within each role by JD relevance (step 5/7)
- [x] 7.7 Implement competency grid generation: LLM call to produce 6-8 keyword phrases from JD requirements (step 6/7)
- [x] 7.8 Implement keyword injection: LLM call to reword existing bullets using JD vocabulary (step 7/7)
- [x] 7.9 Implement post-generation diff verification with length floor: tokens ≥ 4 chars use fuzzy match (Levenshtein ≤ 2), tokens < 4 chars use exact match only
- [x] 7.10 Implement separate artifact storage: per-job tailored artifact with metadata (keywords, classification, diff, PDF path)
- [x] 7.11 Verify base Resume Studio document is NOT modified by tailoring
- [x] 7.12 Add `modelResumeEnhance` per-task model override to `LlmService`
- [ ] 7.13 Wire ATS optimization into per-job tailoring flow ("Tailor for this job" trigger)
- [ ] 7.14 Add paper format detection: parse company location from JD, select letter (US/Canada) or A4 (rest of world)
- [ ] 7.15 Add unit tests for ATS normalization, keyword extraction, role classification, and diff verification with length floor

## 8. LLM Configurability & Progress Feedback (7-step accurate count)

- [x] 8.1 Verify existing `LlmService` supports all required providers (OpenAI, OpenRouter, Ollama, LM Studio, Gemini, OpenAI-compatible)
- [x] 8.2 Add `modelResumeEnhance` setting to settings schema (`shared/src/types/settings.ts`)
- [ ] 8.3 Add per-task model override UI in Settings → LLM Configuration
- [ ] 8.4 Add "Test Connection" button in Settings that sends a test request to configured endpoint
- [ ] 8.5 Add LLM usage tracking: input tokens, output tokens, model, task type per call
- [ ] 8.6 Add Settings → LLM Usage view showing total tokens, estimated cost, breakdown by task
- [ ] 8.7 Add graceful degradation: clear error messages when local model is unavailable
- [ ] 8.8 Add fallback for models lacking structured output (text parsing with warnings)
- [x] 8.9 Implement SSE progress events for tailoring pipeline: tailoring.started (total: 7), tailoring.step.started, tailoring.step.completed, tailoring.step.failed, tailoring.completed
- [x] 8.10 Verify total: 7 matches actual pipeline steps (keyword_extraction, role_classification, summary_rewrite, project_selection, bullet_reordering, competency_grid, keyword_injection)
- [ ] 8.11 Add tailoring progress UI: step name, completed steps, estimated time remaining, step results

## 9. Catalog Entries & Documentation

- [x] 9.1 Add Greenhouse companies to Watchlist catalog: Temporal, Scale AI, Notion, Retool, Figma, Loom
- [x] 9.2 Add Lever companies to Watchlist catalog: Fly.io, PlanetScale, Cohere
- [x] 9.3 Add Ashby companies to Watchlist catalog: Railway, Mistral, Perplexity
- [ ] 9.4 Update Watchlist feature docs with new source types
- [ ] 9.5 Update Resume Studio docs with ATS optimization mode, per-job trigger, separate artifact model
- [ ] 9.6 Update LLM Configuration docs with local model setup guide
- [ ] 9.7 Update README with new ATS adapter support and resume builder features
