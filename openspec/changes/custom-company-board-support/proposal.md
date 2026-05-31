## Why

This change enhances job-ops by incorporating the strongest capabilities from career-ops into a single, unified platform. The end product is an **enhanced job-ops repo** that combines:

1. **job-ops' infrastructure**: React/Vite UI, SQLite database, pipeline orchestrator, extractor system, Watchlist, Ghostwriter, post-application tracking
2. **career-ops' intelligence**: ATS-specific scanning implementations, the 15-step resume tailoring pipeline, ATS optimization rules, and keyword injection strategy

The Watchlist feature (v0.8.0) already supports Workday and BambooHR adapters. This change adds Greenhouse, Lever, and Ashby adapters using career-ops' provider implementations as the template. It also incorporates career-ops' resume builder pieces — the most differentiated capability in career-ops — into job-ops' Resume Studio.

## What Changes

### ATS Adapters (Greenhouse, Lever, Ashby)

- Add `career-boards/greenhouse` package using career-ops' `providers/greenhouse.mjs` as template: API endpoint `boards-api.greenhouse.io/v1/boards/{slug}/jobs`, SSRF-safe hostname allowlist, `absolute_url` normalization
- Add `career-boards/lever` package using career-ops' `providers/lever.mjs` as template: API endpoint `api.lever.co/v0/postings/{slug}`, root-array response handling, `hostedUrl` normalization
- Add `career-boards/ashby` package using career-ops' `providers/ashby.mjs` as template: API endpoint `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`, `jobUrl` normalization
- Register adapters in Watchlist, add catalog entries for 14 target companies

### Resume Builder Enhancement

Incorporate career-ops' resume production strengths into job-ops' Resume Studio:

- **ATS-optimized section ordering**: Header → Professional Summary → Core Competencies → Work Experience → Projects → Education → Certifications → Skills (optimized for 6-second recruiter scan)
- **Keyword extraction and injection**: Extract 15-20 keywords from JD, distribute across Summary (top 5), first bullet of each role, Skills section. Rule: NEVER invent — only reword real experience using JD vocabulary
- **Competency grid**: 6-8 keyword phrases as styled tags between Summary and Experience
- **Experience bullet reordering**: Reorder bullets within each role by JD relevance (most relevant first)
- **Role archetype detection**: Classify into 6 archetypes (AI Platform, Agentic, Technical PM, Solutions Architect, Forward Deployed, Transformation) and adapt framing
- **ATS text normalization**: Unicode→ASCII conversion for em-dashes, smart quotes, zero-width characters (from career-ops' `generate-pdf.mjs`)
- **Paper format detection**: US/Canada → letter, rest of world → A4

### LLM Configurability

All LLM workloads in job-ops SHALL be configurable to use either cloud-based or local models:

- **Per-task model overrides**: Scoring, tailoring, project selection, Ghostwriter, and new resume enhancement each get independent model configuration
- **Provider flexibility**: Support OpenAI, OpenRouter, Ollama (local), LM Studio (local), Gemini, and any OpenAI-compatible endpoint
- **Environment variables**: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` for global defaults; per-task overrides via `MODEL_SCORER`, `MODEL_TAILORING`, `MODEL_PROJECT_SELECTION`, `MODEL_GHOSTWRITER`, `MODEL_RESUME_ENHANCE`
- **Local model support**: Ollama and LM Studio endpoints work via `LLM_BASE_URL=http://localhost:11434/v1` (OpenAI-compatible)

## Capabilities

### New Capabilities

- `greenhouse-watchlist-adapter`: Greenhouse ATS adapter for Watchlist — fetches jobs from `boards-api.greenhouse.io`, SSRF-safe, supports custom board URLs
- `lever-watchlist-adapter`: Lever ATS adapter for Watchlist — fetches jobs from `api.lever.co`, supports custom company URLs
- `ashby-watchlist-adapter`: Ashby ATS adapter for Watchlist — fetches jobs from `api.ashbyhq.com/posting-api`, includes compensation data
- `ats-optimized-resume-builder`: ATS-optimized resume tailoring with keyword extraction, competency grid, experience reordering, and archetype detection — incorporating career-ops' 15-step pipeline into Resume Studio
- `llm-configurability`: Unified LLM configuration layer supporting cloud and local models with per-task overrides

### Modified Capabilities

- `resume-studio`: Enhanced with ATS optimization rules, keyword injection, and role archetype detection from career-ops

## Impact

- **Code**: New `career-boards/{greenhouse,lever,ashby}` packages, new Watchlist adapters, enhanced Resume Studio, LLM configuration layer
- **API**: No new endpoints — adapters plug into existing Watchlist; resume enhancement uses existing Resume Studio API
- **Dependencies**: No new external deps for ATS adapters (public REST APIs); career-ops' `generate-pdf.mjs` ATS normalization logic ported to TypeScript
- **Data**: Catalog entries added to Watchlist; resume enhancements stored in existing Resume Studio document
- **Existing behavior**: Unchanged — all existing extractors, Watchlist adapters, and LLM providers continue working
- **LLM workloads**: All configurable for cloud or local models via environment variables
