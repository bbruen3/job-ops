## ADDED Requirements

### Requirement: Per-purpose LLM configuration
The system SHALL allow each LLM purpose (scoring, tailoring, project selection, ghostwriter, resume enhancement) to be independently configured with its own provider, base URL, API key, and model.

#### Scenario: Configure per-purpose provider
- **WHEN** a user sets a different provider for scoring (e.g., OpenRouter) than the global provider (e.g., Ollama)
- **THEN** scoring requests use OpenRouter while other tasks use Ollama

#### Scenario: Inherit global defaults
- **WHEN** a user leaves a purpose's provider, base URL, API key, or model empty
- **THEN** the system falls back to the corresponding global default for that field

#### Scenario: Per-purpose API key
- **WHEN** a user sets an API key for a specific purpose
- **THEN** that purpose uses the purpose-specific key instead of the global `llmApiKey`

### Requirement: Ghostwriter purpose added
The system SHALL include `ghostwriter` as a supported LLM purpose for per-purpose configuration.

#### Scenario: Ghostwriter can use different provider
- **WHEN** the global provider is OpenRouter but ghostwriter purpose is configured for Ollama
- **THEN** Ghostwriter chat requests use the local Ollama instance

### Requirement: Resume enhancement purpose added
The system SHALL include `resumeEnhance` as a supported LLM purpose for per-purpose configuration.

#### Scenario: Resume enhancement can use different model
- **WHEN** the global model is `gpt-4` but resumeEnhance purpose is configured for `llama3.1`
- **THEN** the ATS-optimized tailoring pipeline uses `llama3.1` for its 7 LLM calls

### Requirement: Settings UI for per-purpose configuration
The system SHALL provide a unified Settings UI for configuring per-purpose LLM settings.

#### Scenario: View per-purpose config
- **WHEN** a user opens Settings → LLM Configuration
- **THEN** they see a card for each purpose showing its current provider, base URL, model, and API key status

#### Scenario: Configure purpose
- **WHEN** a user edits a purpose's configuration
- **THEN** they can set provider (dropdown), base URL, API key, and model independently

#### Scenario: Inherited defaults shown
- **WHEN** a purpose field inherits its value from the global default
- **THEN** the UI shows the inherited value in muted text alongside an empty field

#### Scenario: Per-purpose API key in UI
- **WHEN** a user expands a purpose's API key section
- **THEN** they can enter a purpose-specific API key

### Requirement: Deprecation of model-only overrides
The system SHALL treat the old model-only override fields (`modelScorer`, `modelTailoring`, `modelProjectSelection`) as deprecated in favor of the unified per-purpose configuration.

#### Scenario: Old fields still work
- **WHEN** a user has `modelScorer` set via env var
- **THEN** the new per-purpose UI shows it as the `scoring` purpose's model value
