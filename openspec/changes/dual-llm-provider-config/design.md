## Context

The existing LLM configuration has three layers, but they're not unified:

1. **Global config** (`llmProvider`, `llmBaseUrl`, `model`) — single provider for everything
2. **Per-purpose overrides** (`llmPurposeOverrides`) — allows overriding `provider`, `baseUrl`, `model` per purpose via the settings schema. Already supported by `resolveLlmRuntimeSettings()` in `modelSelection.ts`.
3. **Per-purpose model-only overrides** (`modelScorer`, `modelTailoring`, `modelProjectSelection`) — these only change the model name, not the provider or base URL. They duplicate the `model` field in `llmPurposeOverrides` but without provider/baseUrl support.

Currently only three purposes exist (`scoring`, `tailoring`, `projectSelection`). `ghostwriter` and `resumeEnhance` are missing, meaning they always use the global provider. The UI in ModelSettingsSection shows the model-only overrides but has no way to configure per-purpose provider, base URL, or API key.

The backend (`modelSelection.ts`) already resolves per-purpose configs correctly — the missing piece is extending the purpose list and building the UI.

## Goals / Non-Goals

**Goals:**
- Add `ghostwriter` and `resumeEnhance` to `LLM_PURPOSE_VALUES` so they get per-purpose override support
- Build a Settings UI section where each purpose gets its own provider, base URL, API key, and model
- Deprecate the old model-only overrides (`modelScorer`, `modelTailoring`, `modelProjectSelection`, `modelResumeEnhance`) in favor of the unified per-purpose system
- Show resolved config (effective provider + base URL + model + key status) per purpose
- Support fallback: any empty field inherits the global default

**Non-Goals:**
- Removing the old env var names yet — keep backward compatibility
- Adding new LLM providers or changing the provider list
- Changing how `resolveLlmRuntimeSettings()` works — it already handles this correctly

## Decisions

### 1. Extend purpose values, don't create a parallel system

**Decision:** Add `ghostwriter` and `resumeEnhance` to `LLM_PURPOSE_VALUES` in `shared/src/types/settings.ts`.

**Rationale:** The `llmPurposeOverrides` type and `resolveLlmRuntimeSettings()` already handle arbitrary purposes generically. Adding new purpose names is a one-line change that unlocks the entire override system for those tasks. No new types or resolution logic needed.

### 2. Replace model-only overrides with unified purpose UI

**Decision:** In the Settings UI, replace the three individual `modelScorer`/`modelTailoring`/`modelProjectSelection` inputs with a purpose-level configuration section where each purpose shows: provider dropdown, base URL input, API key input, and model input.

**Rationale:** The model-only inputs provide a fraction of the flexibility — they only set the model name, not the provider or base URL. A unified purpose card shows the full picture: which provider, what base URL, which API key (or inherit), and which model. Users can leave fields empty to inherit global defaults.

**Alternative considered:** Keeping both systems and merging them. Adds confusion about which takes precedence. The per-purpose override already has `model` — the model-only fields are redundant.

### 3. Backward compatibility for env vars

**Decision:** Keep `MODEL_SCORER`, `MODEL_TAILORING`, `MODEL_PROJECT_SELECTION` env vars working — they map to the `model` field of the corresponding purpose override.

**Rationale:** The backend already reads these env vars and writes them into the model-only settings fields. No need to break existing workflows. The new UI writes to `llmPurposeOverrides.{purpose}.model` instead.

### 4. API key per purpose

**Decision:** Use the existing `llmPurposeApiKeys` setting for per-purpose API keys, surfaced in the UI.

**Rationale:** The type (`LlmPurposeApiKeys`) already exists in the settings schema. The backend already reads it in `resolveLlmRuntimeSettings()`. Only the UI is missing.

## Risks / Trade-offs

- **Settings migration** → Users with existing `modelScorer`/`modelTailoring` overrides will see them as pre-filled model values in the new purpose cards. The backend reads both sources, so no data loss.
- **UI complexity** → 5 purpose cards × 4 fields each = 20 fields. Mitigation: use compact card layout with collapsible sections, inherited defaults shown in muted text.
- **Env var precedence** → If both `MODEL_SCORER` and `llmPurposeOverrides.scoring.model` are set, which wins? Mitigation: env vars write to the settings DB, so they're equivalent. The last write wins.
