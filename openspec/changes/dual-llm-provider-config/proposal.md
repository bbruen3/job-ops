## Why

The current LLM configuration supports only a single global provider. Per-task model overrides (`modelScorer`, `modelTailoring`) change the model name but still use the global provider and base URL. Users who want to run lightweight tasks on a local model (Ollama/LM Studio) and heavy scoring on a cloud model (OpenRouter/Gemini) cannot — they must choose one or the other. This limits flexibility and wastes money (cloud costs for trivial operations) or performance (local models struggling with complex scoring).

## What Changes

- Add `ghostwriter` and `resumeEnhance` to the `LLM_PURPOSE_VALUES` enum so they get per-purpose override support
- Add a `model` field to `LlmPurposeOverride` (already has `provider` and `baseUrl`, but the model-only overrides are a separate system) — unify these into a single configuration path
- Build a proper Settings UI section for per-purpose LLM configuration where each purpose can independently set: provider, base URL, API key, and model
- Ensure the resolved config display shows both the effective (after override) and global default for each purpose
- Support fallback from per-purpose → global defaults when a field is left empty

## Capabilities

### New Capabilities

- `per-purpose-llm-config`: Unified per-purpose LLM configuration with independent provider, base URL, API key, and model per task — covering scoring, tailoring, project selection, ghostwriter, and resume enhancement

### Modified Capabilities

- `llm-configurability`: Expand the existing per-purpose override system (`llmPurposeOverrides`) to support `ghostwriter` and `resumeEnhance` purposes, add `model` to the override shape, and provide a proper Settings UI

## Impact

- **Settings schema**: `LLM_PURPOSE_VALUES` gains `ghostwriter` and `resumeEnhance`; `LlmPurposeOverride` already has `provider`+`baseUrl`, and we confirm `model` works through the existing field
- **Settings UI**: New per-purpose configuration cards in Settings → LLM Configuration, replacing the bare `modelScorer`/`modelTailoring`/etc. inputs
- **LLM service**: `resolveLlmModel()` and `resolveLlmProvider()` already consult `llmPurposeOverrides` — no major backend refactor needed
- **API keys**: `LlmPurposeApiKeys` type already supports per-purpose keys — UI needs to expose them
- **Env vars**: Per-purpose env vars already work (`MODEL_SCORER`, `MODEL_TAILORING`, etc.) — no change
