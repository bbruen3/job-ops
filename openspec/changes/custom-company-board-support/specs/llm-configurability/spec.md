## ADDED Requirements

### Requirement: Global LLM configuration
The system SHALL support global LLM configuration via environment variables that apply to all LLM workloads.

#### Scenario: Configure global provider
- **WHEN** `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` are set
- **THEN** all LLM workloads (scoring, tailoring, project selection, Ghostwriter, resume enhancement) use these values as defaults

#### Scenario: OpenAI-compatible endpoint
- **WHEN** `LLM_BASE_URL` is set to an OpenAI-compatible endpoint (e.g., `http://localhost:11434/v1`)
- **THEN** the system sends requests to that endpoint using the OpenAI API format

### Requirement: Per-task model overrides
The system SHALL support independent model configuration for each LLM task.

#### Scenario: Override scoring model
- **WHEN** `MODEL_SCORER` is set
- **THEN** job scoring uses that model instead of the global default

#### Scenario: Override tailoring model
- **WHEN** `MODEL_TAILORING` is set
- **THEN** resume tailoring uses that model instead of the global default

#### Scenario: Override project selection model
- **WHEN** `MODEL_PROJECT_SELECTION` is set
- **THEN** AI project selection uses that model instead of the global default

#### Scenario: Override Ghostwriter model
- **WHEN** `MODEL_GHOSTWRITER` is set
- **THEN** Ghostwriter chat uses that model instead of the global default

#### Scenario: Override resume enhancement model
- **WHEN** `MODEL_RESUME_ENHANCE` is set
- **THEN** ATS-optimized resume tailoring uses that model instead of the global default

### Requirement: Local model support
The system SHALL support local LLM models via Ollama, LM Studio, or any OpenAI-compatible endpoint.

#### Scenario: Ollama local model
- **WHEN** `LLM_BASE_URL=http://localhost:11434/v1` and `LLM_MODEL=llama3.1`
- **THEN** the system sends requests to the local Ollama instance

#### Scenario: LM Studio local model
- **WHEN** `LLM_BASE_URL=http://localhost:1234/v1` and `LLM_MODEL=local-model`
- **THEN** the system sends requests to the local LM Studio instance

#### Scenario: Mixed cloud and local
- **WHEN** global config points to a cloud provider but `MODEL_RESUME_ENHANCE` points to a local model
- **THEN** scoring and tailoring use the cloud model, while resume enhancement uses the local model

### Requirement: Settings UI model configuration
The system SHALL expose LLM model configuration in the Settings UI.

#### Scenario: View current model settings
- **WHEN** a user opens Settings → LLM Configuration
- **THEN** they see the current global provider, model, and per-task overrides

#### Scenario: Change model via UI
- **WHEN** a user updates a model setting in the UI
- **THEN** the change is persisted and takes effect on the next LLM call

#### Scenario: Test connection
- **WHEN** a user clicks "Test Connection" in LLM settings
- **THEN** the system sends a test request to the configured endpoint and reports success or failure

### Requirement: Graceful degradation for local models
The system SHALL handle cases where a local model is unavailable or unsupported.

#### Scenario: Local model unavailable
- **WHEN** a local model endpoint is configured but unreachable
- **THEN** the system reports a clear error with the endpoint URL and suggests checking if the local model server is running

#### Scenario: Model lacks structured output
- **WHEN** a local model does not support JSON schema output
- **THEN** the system falls back to text parsing with clear warnings

### Requirement: LLM cost tracking
The system SHALL track token usage and estimated cost for all LLM workloads.

#### Scenario: Track tokens per task
- **WHEN** an LLM call completes
- **THEN** the system logs input tokens, output tokens, model used, and task type

#### Scenario: View cost summary
- **WHEN** a user opens Settings → LLM Usage
- **THEN** they see total tokens used, estimated cost, and breakdown by task type

### Requirement: Chained LLM call progress feedback
The system SHALL stream SSE events during chained LLM operations (like the resume tailoring pipeline) so the UI can show step-by-step progress.

#### Scenario: Progress events for tailoring pipeline
- **WHEN** the tailoring pipeline starts
- **THEN** the system streams events: `tailoring.started` (with total step count), `tailoring.step.started`, `tailoring.step.completed` (with step result), `tailoring.completed`

#### Scenario: UI shows progress indicator
- **WHEN** progress events are received
- **THEN** the UI shows a progress indicator with current step name, completed steps, and estimated time remaining

#### Scenario: Step results included in events
- **WHEN** a step completes
- **THEN** the event includes the step result (e.g., extracted keywords, rewritten summary, role classification)

#### Scenario: Error mid-pipeline
- **WHEN** a step fails
- **THEN** the system streams a `tailoring.step.failed` event with error details and stops the pipeline
