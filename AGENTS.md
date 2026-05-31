# JobOps — Agent Instructions

## Repo Overview

Monorepo (npm workspaces) — a self-hosted job-hunting platform. Express backend + React/Vite frontend, SQLite (Drizzle ORM), configurable LLM scoring & PDF resume generation.

## Workspaces

| Package | Path | Entry | Purpose |
|---------|------|-------|---------|
| `orchestrator` | `orchestrator/` | `src/server/index.ts` / `src/client/main.tsx` | Main app — API + UI |
| `shared` | `shared/` | `src/index.ts` | Shared types, extractor catalog, utilities |
| `docs-site` | `docs-site/` | Docusaurus | User-facing documentation |
| `*-extractor` | `extractors/*/` | `manifest.ts` or `src/manifest.ts` | Job board scrapers (auto-discovered) |

Root `package.json` has `workspaces: ["orchestrator", "docs-site", "extractors/*", "shared"]`.

## Critical Commands

```bash
# Dev (starts both server + client concurrently)
npm --workspace orchestrator run dev
#   API:          http://localhost:3001
#   UI (Vite):    http://localhost:5173  (proxies /api, /pdfs, /stats → :3001)

# Dev separately
npm --workspace orchestrator run dev:server   # tsx watch src/server/index.ts
npm --workspace orchestrator run dev:client   # vite --host

# DB
npm --workspace orchestrator run db:migrate   # sqlite + drizzle
npm --workspace orchestrator run db:clear
npm --workspace orchestrator run db:drop      # --drop flag

# Pipeline (manual run)
npm --workspace orchestrator run pipeline:run

# Type checks (one-shot — run these BEFORE Biome)
npm run check:types:shared                                    # shared/
npm --workspace orchestrator run check:types                  # orchestrator/
npm --workspace gradcracker-extractor run check:types         # extractors
npm --workspace ukvisajobs-extractor run check:types

# Lint + format (Biome 2.3.12)
./orchestrator/node_modules/.bin/biome ci .                   # CI check (lint + format)
./orchestrator/node_modules/.bin/biome check --write .        # lint auto-fix
./orchestrator/node_modules/.bin/biome format --write .       # format auto-fix

# Tests
npm --workspace orchestrator run test:run                     # vitest run
npm --workspace orchestrator run test                         # vitest (watch)

# Build (client for production)
npm --workspace orchestrator run build:client                 # vite build → dist/client/
```

## Path Aliases (tsconfig — enforced by Biome)

Use these instead of relative imports. Biome will error on violations.

| Alias | Resolves to | Use for |
|-------|-------------|---------|
| `@/*` | `orchestrator/src/*` | Anything in orchestrator src |
| `@server/*` | `src/server/*` | Server modules |
| `@infra/*` | `src/server/infra/*` | Logger, SSE, HTTP utils, sanitize |
| `@client/*` | `src/client/*` | React UI modules |
| `@shared/*` | `../shared/src/*` | Shared types & utilities |

## Architecture Patterns

### Extractor System

Each `extractors/*/` directory has a `manifest.ts` (or `src/manifest.ts`) exporting an `ExtractorManifest` that implements `run(context)`. The orchestrator auto-discovers them at startup via `discovery.ts`. No manual registration needed.

Contract: `ExtractorManifest { id, displayName, providesSources[], run(context) → { success, jobs[] } }`

Add a new source:
1. Add source ID to `shared/src/extractors/index.ts` (`EXTRACTOR_SOURCE_IDS` + `EXTRACTOR_SOURCE_METADATA`)
2. Create `extractors/<name>/manifest.ts`
3. The registry picks it up automatically (warning if catalog has no manifest, error in production if strict mode)

### Pipeline Flow

`src/server/pipeline/orchestrator.ts`: discoverJobs → importJobs → scoreJobs → selectJobs → processJobs

### API Response Contract

All `/api/*` routes:
- Success: `{ ok: true, data, meta?: { requestId } }`
- Error: `{ ok: false, error: { code, message, details? }, meta: { requestId } }`

Status/code mapping:
- `400 INVALID_REQUEST` / `401 UNAUTHORIZED` / `403 FORBIDDEN` / `404 NOT_FOUND`
- `408 REQUEST_TIMEOUT` / `409 CONFLICT` / `422 UNPROCESSABLE_ENTITY`
- `500 INTERNAL_ERROR` / `502 UPSTREAM_ERROR` / `503 SERVICE_UNAVAILABLE`

Use `ok()`/`fail()` from `@infra/http` — they handle request ID plumbing and sanitization.

### Correlation IDs

- Honor inbound `x-request-id`; otherwise generate one (UUID)
- Always return `x-request-id` header
- Include in API responses (`meta.requestId`) and logs
- Propagate context into async flows (pipeline runs, per-job work) so logs include `pipelineRunId` / `jobId`

## Logging

- Use the shared logger (`@infra/logger` Logger class) in core server paths
- No direct `console.log`/`warn`/`error` in core paths (the Logger internally uses console.* with structured JSON)
- Log structured objects, not free-form text
- Include context fields: `requestId`, `pipelineRunId`, `jobId`, `route`, `status`

## SSE

- **Server**: use `@infra/sse` (`setupSse`, `writeSseData`, `writeSseComment`, `startSseHeartbeat`)
- **Client**: use `@client/lib/sse` (`subscribeToEventSource`)
- Do not duplicate raw SSE setup (`Content-Type`, `Connection`, heartbeat loops, ad-hoc JSON.parse)

## Redaction and Sanitization

- Always sanitize before logging or returning in error `details` (`sanitizeUnknown` from `@infra/sanitize`)
- Redacted keys: `authorization`, `cookie`, `password`, `secret`, `token`, `apiKey`, etc.
- Truncates strings at 800 chars, depth at 5 levels, arrays at 30 items
- Do not throw/log raw upstream response bodies, full webhook bodies, or large `JSON.stringify(...)` blobs
- Webhooks: send minimal whitelisted payloads by default
- LLM prompts: send only required profile/job fields; avoid unnecessary PII

## Testing Patterns

- Vitest (globals mode). Run with `npm --workspace orchestrator run test:run`
- Tests use `describe.sequential` (not `describe`) for API route tests (shared SQLite)
- API tests use `startServer()` / `stopServer()` from `./test-utils.ts` which:
  - Creates a temp directory for SQLite (`DATA_DIR`)
  - Isolates env vars (clears sensitive keys)
  - Mocks pipeline, scorer, profile, visa sponsors
  - Returns ephemeral `server`, `baseUrl`, `closeDb`, `tempDir`
- Test files co-located with source: `src/**/*.test.ts`
- Vite config includes test patterns: `src/**/*.test.ts`, `shared/src/**/*.test.ts`, `extractors/**/tests/**/*.test.ts`

## CI Parity (run before marking work complete)

```bash
./orchestrator/node_modules/.bin/biome ci .                      # lint + format check
npm run check:types:shared                                       # shared types
npm --workspace orchestrator run check:types                     # orchestrator types
npm --workspace gradcracker-extractor run check:types            # extractor types
npm --workspace ukvisajobs-extractor run check:types
npm --workspace orchestrator run build:client                    # vite build
npm --workspace orchestrator run test:run                        # vitest
```

If tests fail with a `better-sqlite3` Node ABI mismatch:
```bash
npm --workspace orchestrator rebuild better-sqlite3
```

CI runs on Node 22. Verify with Node 22 if local behavior differs.

## Environment

- `.env` loaded from `cwd` or parent directory (via `dotenv` in `config/env.ts`)
- Node version pinned via Volta: `22.22.1`
- Optional Basic Auth via `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` (write operations only; reads public by default)
- `EXTRACTOR_REGISTRY_STRICT=1` to fail on catalog/manifest mismatches outside production
- `LOG_LEVEL` for server logging verbosity (default `info`)
- `DEMO_MODE=true` to skip visa sponsors init and return demo PDFs

## Skills

Design/motion/UX skills live in `.agents/skills/` and `.claude/skills/`. Load them via the `skill` tool when tasks match (animate, critique, colorize, etc.).
