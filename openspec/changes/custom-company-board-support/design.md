## Context

This change merges the strongest capabilities from career-ops into job-ops. The two repos have complementary strengths:

- **job-ops**: Web UI, SQLite database, pipeline orchestrator, extractor system, Watchlist (Workday + BambooHR), Ghostwriter, post-application tracking, Resume Studio with Typst/LaTeX renderers
- **career-ops**: ATS-specific scanning (Greenhouse, Lever, Ashby), 15-step resume tailoring pipeline, ATS optimization rules, keyword extraction/injection, role archetype detection, multi-language support

The Watchlist adapter pattern (`WatchlistCatalogSourceAdapter`) is well-established with Workday and BambooHR. Greenhouse, Lever, and Ashby adapters follow the same pattern, using career-ops' provider implementations as the template.

Resume Studio already has a local-first resume editor with AI-assisted editing and multiple renderers. The enhancement adds career-ops' intelligent tailoring — keyword extraction, competency grid, experience reordering — as a per-job tailoring step that produces a separate tailored artifact per job.

## Goals / Non-Goals

**Goals:**
- Add Greenhouse, Lever, Ashby adapters to Watchlist using career-ops provider logic as template
- Incorporate career-ops' ATS optimization rules into Resume Studio's PDF generation
- Add keyword extraction, competency grid, and experience reordering to the tailoring pipeline
- Add open-ended role classification to adapt framing per job type (not limited to AI roles)
- Ensure all LLM workloads are configurable for cloud or local models
- Port career-ops' ATS text normalization (Unicode→ASCII) to TypeScript
- Provide user-facing feedback during chained LLM operations
- Verify keyword injection with post-generation diff

**Non-Goals:**
- Rewriting career-ops' entire evaluation system (A-F scoring) — job-ops has its own LLM scoring
- Adding Canva integration — job-ops has Typst/LaTeX renderers
- Multi-language support (EN/DE/FR/UK/TR) — can be added later
- Batch processing with parallel workers — job-ops has its own pipeline
- Modifying existing extractors or Watchlist behavior

## Decisions

### 1. ATS adapter architecture: thin packages, normalization at adapter layer

**Decision:** Port career-ops' provider logic into TypeScript `career-boards/*` packages that return raw API responses. The Watchlist adapter layer normalizes responses to `WatchlistJobResult` before they reach the catalog interface.

**Rationale:** The packages should be thin and testable — they handle URL parsing, API calls, and return the raw response shape. The adapter layer owns normalization because:
- Different ATS APIs return different shapes (Greenhouse: `{ jobs: [...] }`, Lever: `[{...}]` root array, Ashby: `{ jobs: [...] }`)
- Normalization logic is Watchlist-specific (maps to `WatchlistJobResult`)
- Packages can be reused by other consumers (e.g., pipeline extractors) that may want raw responses

**Architecture:**
```
career-boards/greenhouse    → returns { jobs: [{ title, absolute_url, location: { name } }] }
career-boards/lever         → returns [{ text, hostedUrl, categories: { location } }]
career-boards/ashby         → returns { jobs: [{ title, jobUrl, location }] }
        ↓
watchlist/adapters/*.ts     → normalizes to WatchlistJobResult { title, employer, location, externalId, jobUrl, sourceType }
        ↓
Watchlist catalog interface → standard WatchlistCatalogSourceAdapter methods
```

**Location field handling across ATS types:**
- Greenhouse: `location` is a nested object `{ name: string }` — adapter extracts `location.name`
- Lever: `location` is nested under `categories.location` — adapter extracts `categories.location`
- Ashby: `location` is a flat string — adapter passes through directly

All three adapters MUST handle null/missing location gracefully:
- `null` or `undefined` location → `location: null` in `WatchlistJobResult`
- Empty string `""` location → `location: null` in `WatchlistJobResult`
- Tests MUST cover: present location, missing location (`undefined`), null location, empty string location for all three adapters

**Key details from career-ops:**

| ATS | API Endpoint | Raw Response Shape | Adapter Normalizes |
|---|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{slug}/jobs` | `{ jobs: [...] }` | `absolute_url` → `jobUrl`, `location.name` → `location` |
| Lever | `api.lever.co/v0/postings/{slug}` | `[{...}]` (root array) | `text` → `title`, `hostedUrl` → `jobUrl`, `categories.location` → `location` |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | `{ jobs: [...] }` | `jobUrl` → `jobUrl`, `location` → `location` |

**SSRF protection:** Port career-ops' hostname allowlist for Greenhouse (`boards-api.greenhouse.io`, `boards.greenhouse.io`, `job-boards.greenhouse.io`, `job-boards.eu.greenhouse.io`). Apply `redirect: 'error'` on all fetches. Packages enforce SSRF guards; adapters inherit them.

### 2. Resume builder: per-job tailoring with separate artifact

**Decision:** ATS-optimized tailoring runs when the user clicks "Tailor for this job" on a specific job. The output is a **separate tailored artifact per job** — it does NOT overwrite the Resume Studio base document.

**Rationale:** The Resume Studio document is the canonical base resume. Tailoring for Job A should not modify the base resume, because the user may simultaneously be tailoring for Job B, Job C, etc. Each tailored output is a standalone PDF artifact that references (but does not mutate) the base resume.

**Data model:**
```
Resume Studio document (base resume) — single source of truth, user edits here
        ↓
Per-job tailoring produces: → tailored-resume-{jobId}.pdf (separate artifact)
                           → tailored-resume-{jobId}.json (metadata: keywords, classification, diff flags)
```

The base resume remains unchanged. Each tailored artifact stores:
- The input resume snapshot (for diff comparison)
- Extracted keywords and their sources
- Role classification
- Keyword injection diff (what changed, what was flagged)
- The final PDF path

**Pipeline steps (7 LLM calls):**
1. Keyword extraction (needs JD)
2. Role classification (needs JD)
3. Summary rewrite (needs keywords + role classification)
4. Project selection (needs keywords + role classification + project catalog)
5. Bullet reordering (needs keywords + current resume)
6. Competency grid (needs keywords)
7. Keyword injection + diff verification (needs keywords + current resume)

These steps are not independent — they chain together and produce a coherent output. Running them partially or out of order produces inconsistent results. The per-job trigger ensures:
- The full pipeline runs from start to finish
- The input state is always the current Resume Studio document + the specific JD
- The output is a separate artifact, not a modification to the base resume

**What gets ported from career-ops:**

| Career-Ops Step | Integration Point | Implementation |
|---|---|---|
| Extract 15-20 keywords from JD | Tailoring service | LLM extraction with structured output |
| Rewrite Professional Summary | Tailoring service | LLM rewrite with keyword injection |
| Select top 3-4 projects | Already exists | `projectSelection.ts` (no change) |
| Reorder experience bullets | New tailoring step | LLM reordering with relevance scoring |
| Build competency grid | New UI component | 6-8 keyword phrase tags in PDF |
| Inject keywords naturally | Tailoring service | LLM rewriting with post-generation diff verification |
| ATS text normalization | PDF renderer | Port `normalizeTextForATS()` to TypeScript |
| Paper format detection | PDF renderer | US/Canada → letter, rest → A4 |
| Role classification | Tailoring service | LLM open-ended classification (not enum) |

**What does NOT get ported:**
- HTML template (job-ops uses Typst/LaTeX themes, not HTML)
- `generate-pdf.mjs` (job-ops has its own renderers)
- Canva integration (job-ops has Typst/LaTeX)
- Multi-language localization (can be added later)

### 3. LLM configurability: unified provider layer with progress feedback

**Decision:** All LLM workloads use the existing `LlmService` with per-task model overrides. The chained tailoring pipeline exposes progress via SSE events so the UI can show step-by-step feedback.

**Rationale:** job-ops already has `LlmService` (`orchestrator/src/server/services/llm/service.ts`) that supports OpenAI, OpenRouter, Ollama, LM Studio, Gemini, and any OpenAI-compatible endpoint. The per-task override pattern (`modelScorer`, `modelTailoring`, `modelProjectSelection`) already exists. We add `modelResumeEnhance` for the new resume tailoring step.

**Chained LLM calls and latency:**
The pipeline chains 7 LLM calls in a single "Tailor for this job" action:
1. Keyword extraction (~2-5s cloud, ~10-30s local)
2. Role classification (~1-3s cloud, ~5-15s local)
3. Summary rewrite (~2-5s cloud, ~10-30s local)
4. Project selection (~2-5s cloud, ~10-30s local)
5. Bullet reordering (~2-5s cloud, ~10-30s local)
6. Competency grid (~1-3s cloud, ~5-15s local)
7. Keyword injection + diff verification (~2-5s cloud, ~10-30s local)

**Total estimated latency:** 12-31s cloud, 60-180s local.

**Progress feedback:** The tailoring endpoint streams SSE events with an accurate step count:
```
tailoring.started           → { step: "keyword_extraction", total: 7 }
tailoring.step.completed    → { step: "keyword_extraction", result: { keywords: [...] } }
tailoring.step.started      → { step: "role_classification" }
tailoring.step.completed    → { step: "role_classification", result: { classification: {...} } }
...
tailoring.completed         → { artifactId: "...", keywordCoverage: 0.85, flaggedKeywords: [...] }
```

The `total` field MUST match the actual number of pipeline steps (7). A mismatched count will make the progress indicator misleading.

**Configuration hierarchy:**
```
Global: LLM_PROVIDER, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
  ↓
Per-task overrides: MODEL_SCORER, MODEL_TAILORING, MODEL_PROJECT_SELECTION, MODEL_GHOSTWRITER, MODEL_RESUME_ENHANCE
  ↓
Settings UI: per-task model selection with provider fallback
```

**Local model examples:**
- Ollama: `LLM_BASE_URL=http://localhost:11434/v1`, `LLM_MODEL=llama3.1`
- LM Studio: `LLM_BASE_URL=http://localhost:1234/v1`, `LLM_MODEL=local-model`
- Any OpenAI-compatible: `LLM_BASE_URL=http://your-server:8001/v1`

### 4. Keyword injection: prompt + post-generation diff with length floor

**Decision:** Keyword injection uses a two-layer enforcement: (1) the LLM prompt includes the "NEVER invent" rule with examples, and (2) a post-generation diff step flags any keyword in the output that doesn't appear (even approximately) in the original CV text. Fuzzy matching uses a minimum token length floor to avoid false positives on short words.

**Rationale:** LLMs hallucinate compliance — they may agree to the "NEVER invent" rule in the prompt but still inject keywords that aren't backed by the original CV. The post-generation diff provides a concrete, verifiable check. The length floor prevents false positives where short keywords (e.g., "RAG", "AI", "ML") fuzzy-match against unrelated tokens.

**Diff verification flow:**
1. Before tailoring: snapshot the original CV text (all bullets, summary, projects)
2. After keyword injection: compare each injected keyword against the original snapshot
3. For each keyword in the output that doesn't match the original:
   - **Tokens ≥ 4 characters:** Fuzzy match (Levenshtein distance ≤ 2 or substring match) → allow
   - **Tokens < 4 characters:** Exact match only — no fuzzy matching
   - No match → flag as "unverified keyword" with a warning
4. Surface flagged keywords to the user in the tailoring results panel:
   - "⚠️ These keywords appear in your tailored resume but weren't found in your original CV: [list]"
   - User can: accept (keep), reject (remove), or edit manually
5. PDF is not generated until the user resolves all flagged keywords

**Why the length floor matters:**
- "RAG" (3 chars) fuzzy-matches "bag", "rag", "tag" — all false positives
- "AI" (2 chars) fuzzy-matches "aid", "air", "aim" — all false positives
- "ML" (2 chars) fuzzy-matches "am", "me", "my" — all false positives
- "timing" (6 chars) fuzzy-matches "trimming", "timing" — correct match

**Alternative considered:** Prompt-only enforcement. Rejected because LLMs can't be trusted to self-enforce negative constraints reliably.

### 5. Role classification: concrete, matchable emphasisAreas

**Decision:** Replace the 6 AI-specific archetypes with an open-ended role classification system that works for any domain. The LLM analyzes the JD and produces a structured classification with no predefined categories. `emphasisAreas` MUST be concrete, matchable terms that downstream steps can use for project ranking without additional LLM calls.

**Rationale:** The 6 AI archetypes (AI Platform, Agentic, Technical PM, etc.) are specific to AI roles and don't apply to semiconductor, physical design, mechanical engineering, finance, or any other domain. A general-purpose tool needs a classification system that adapts to the job, not forces the job into predefined boxes.

**Open-ended classification structure:**
```typescript
interface RoleClassification {
  // What the role primarily does (1-2 sentences)
  roleSummary: string;
  
  // Key skill domains mentioned in the JD (e.g., "physical design", "timing analysis", "power optimization")
  skillDomains: string[];
  
  // Seniority signals detected (e.g., "senior", "staff", "lead", "individual contributor")
  seniorityLevel: string;
  
  // Work style signals (e.g., "collaborative", "independent", "client-facing", "research-oriented")
  workStyle: string[];
  
  // Technical depth vs breadth (e.g., "deep specialist", "generalist", "T-shaped")
  depthBreadth: string;
  
  // Concrete emphasis areas — MUST be specific terms that can be matched against project descriptions
  // BAD: ["technical depth", "system design", "leadership"]
  // GOOD: ["timing closure", "power reduction", "tapeout experience", "DRC/LVS signoff"]
  emphasisAreas: string[];
}
```

**Why emphasisAreas must be concrete:**
- Downstream step (project selection) uses `emphasisAreas` to rank projects by relevance
- If `emphasisAreas` contains vague strings like "technical depth" or "system design", the project ranking step cannot match them against project descriptions without another LLM call
- Concrete terms like "timing closure" or "RAG pipeline" can be matched via substring/keyword overlap against project descriptions

**Prompt constraint for emphasisAreas:**
The classification prompt MUST include: "emphasisAreas must be specific, concrete terms (e.g., 'timing closure', 'DRC/LVS signoff') that can be matched against project descriptions. Do NOT use vague terms like 'technical depth' or 'system design'."

**How this drives tailoring:**
- `emphasisAreas` → which projects to feature (substring match against project descriptions)
- `skillDomains` → which keywords to extract and inject
- `seniorityLevel` → how to frame experience (individual contributor vs leadership)
- `workStyle` → which achievements to highlight (team outcomes vs individual contributions)
- `depthBreadth` → whether to emphasize breadth of skills or depth of expertise

**Example outputs:**

For a semiconductor physical design role:
```json
{
  "roleSummary": "Senior physical design engineer responsible for block-level implementation from synthesis through tapeout",
  "skillDomains": ["physical design", "timing analysis", "power optimization", "DRC/LVS", "floorplanning"],
  "seniorityLevel": "senior",
  "workStyle": ["collaborative", "cross-functional"],
  "depthBreadth": "deep specialist",
  "emphasisAreas": ["timing closure", "power reduction", "tapeout experience", "DRC/LVS signoff"]
}
```

For an AI platform role:
```json
{
  "roleSummary": "Platform engineer building infrastructure for LLM serving and evaluation pipelines",
  "skillDomains": ["ML infrastructure", "observability", "distributed systems", "LLM serving"],
  "seniorityLevel": "senior",
  "workStyle": ["independent", "research-oriented"],
  "depthBreadth": "T-shaped",
  "emphasisAreas": ["system reliability", "cost optimization", "evaluation frameworks", "latency reduction"]
}
```

## Risks / Trade-offs

- **API stability** → Greenhouse/Lever/Ashby APIs are public but undocumented. Mitigation: clear error handling, source tagging for traceability.
- **Keyword injection quality** → LLM may not perfectly rewrite without inventing. Mitigation: prompt + post-generation diff verification with length floor, user resolves flagged keywords before PDF generation.
- **Local model latency** → Chained LLM calls with local models can take 60-180s. Mitigation: progress feedback via SSE (7 steps), per-task model overrides let users use cloud models for complex tasks.
- **Resume Studio coupling** → ATS optimization adds complexity to the tailoring pipeline. Mitigation: per-job trigger, separate artifact output, base resume never modified.
- **Open-ended classification quality** → LLM may produce vague emphasisAreas. Mitigation: prompt constraint for concrete terms, emphasisAreas validated for matchability before use.
