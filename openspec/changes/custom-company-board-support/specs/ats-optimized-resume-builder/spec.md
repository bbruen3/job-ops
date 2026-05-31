## ADDED Requirements

### Requirement: Per-job tailoring with separate artifact
The system SHALL run ATS-optimized tailoring as part of the per-job tailoring flow, producing a separate tailored artifact per job that does NOT overwrite the Resume Studio base document.

#### Scenario: Tailoring triggered by user action
- **WHEN** a user clicks "Tailor for this job" on a specific job
- **THEN** the full ATS-optimized pipeline runs (7 steps) and produces a separate artifact

#### Scenario: Base resume preserved
- **WHEN** tailoring completes
- **THEN** the Resume Studio base document is unchanged

#### Scenario: Multiple jobs can be tailored simultaneously
- **WHEN** a user tailors for Job A and then tailors for Job B
- **THEN** both artifacts exist independently and the base resume is the same for both

#### Scenario: Artifact stores metadata
- **WHEN** a tailored artifact is created
- **THEN** it stores: input resume snapshot, extracted keywords, role classification, keyword injection diff, PDF path

### Requirement: ATS-optimized section ordering
The system SHALL order resume sections in ATS-optimized sequence: Header → Professional Summary → Core Competencies → Work Experience → Projects → Education → Certifications → Skills.

#### Scenario: Section order for PDF generation
- **WHEN** a job-specific PDF is generated
- **THEN** sections appear in ATS-optimized order regardless of their order in the Resume Studio editor

### Requirement: JD keyword extraction
The system SHALL extract 15-20 keywords from the job description using LLM analysis with structured output.

#### Scenario: Extract keywords from JD
- **WHEN** tailoring starts
- **THEN** the system extracts 15-20 keyword phrases from the JD that represent core requirements

#### Scenario: Keywords drive downstream personalization
- **WHEN** keywords are extracted
- **THEN** they are used for: Professional Summary rewrite, competency grid, experience bullet reordering, and keyword injection

### Requirement: Professional Summary rewrite
The system SHALL rewrite the Professional Summary to incorporate JD keywords while preserving the candidate's authentic experience.

#### Scenario: Summary with JD keywords
- **WHEN** the Professional Summary is generated
- **THEN** it includes the top 5 most relevant JD keywords woven naturally into the existing summary text

#### Scenario: Never invent experience
- **WHEN** the LLM rewrites the summary
- **THEN** it NEVER adds skills or experience the candidate does not have — only rewords existing experience using JD vocabulary

### Requirement: Core Competencies grid
The system SHALL generate a competency grid of 6-8 keyword phrases extracted from JD requirements.

#### Scenario: Competency grid generation
- **WHEN** tailoring runs
- **THEN** a grid of 6-8 keyword phrases appears between Professional Summary and Work Experience

#### Scenario: Competency phrases from JD
- **WHEN** competency phrases are generated
- **THEN** they are derived from JD requirements, not generic skill lists

### Requirement: Experience bullet reordering
The system SHALL reorder bullets within each job role by JD relevance, with the most relevant bullet appearing first.

#### Scenario: Bullets reordered by relevance
- **WHEN** work experience is rendered
- **THEN** bullets within each role are reordered so the most JD-relevant bullet appears first

#### Scenario: Roles remain chronological
- **WHEN** bullets are reordered
- **THEN** job roles themselves remain in reverse chronological order

### Requirement: Open-ended role classification with concrete emphasisAreas
The system SHALL classify each job into an open-ended role structure with no predefined categories, producing: role summary, skill domains, seniority level, work style, depth/breadth, and emphasis areas. emphasisAreas MUST be concrete, matchable terms.

#### Scenario: Classification from JD
- **WHEN** tailoring runs
- **THEN** the system produces a structured classification with roleSummary, skillDomains, seniorityLevel, workStyle, depthBreadth, and emphasisAreas

#### Scenario: emphasisAreas are concrete terms
- **WHEN** emphasisAreas is produced
- **THEN** each term is a specific phrase (e.g., "timing closure", "DRC/LVS signoff") that can be matched against project descriptions via substring/keyword overlap

#### Scenario: emphasisAreas are not vague strings
- **WHEN** emphasisAreas is produced
- **THEN** it does NOT contain vague terms like "technical depth", "system design", or "leadership"

#### Scenario: Classification drives tailoring decisions
- **WHEN** a classification is produced
- **THEN** emphasisAreas drives project selection (substring match), skillDomains drives keyword extraction, seniorityLevel drives experience framing

#### Scenario: Works for any domain
- **WHEN** the JD is for a semiconductor physical design role
- **THEN** the classification produces domain-appropriate skillDomains and emphasisAreas

### Requirement: ATS text normalization
The system SHALL normalize Unicode characters to ATS-compatible ASCII equivalents in generated PDFs.

#### Scenario: Unicode normalization
- **WHEN** a PDF is generated
- **THEN** em-dashes, en-dashes, smart quotes, ellipses, zero-width characters, and non-breaking spaces are converted to ASCII equivalents

#### Scenario: Style blocks preserved
- **WHEN** normalization runs
- **THEN** `<style>` and `<script>` blocks are masked during normalization and restored afterward

### Requirement: Paper format detection
The system SHALL detect company location from the JD and select the appropriate paper format.

#### Scenario: US/Canada company
- **WHEN** the company is located in the US or Canada
- **THEN** the PDF uses `letter` format (8.5in × 11in)

#### Scenario: Non-US/Canada company
- **WHEN** the company is located outside the US or Canada
- **THEN** the PDF uses `A4` format (210mm × 297mm)

### Requirement: Keyword injection with post-generation diff and length floor
The system SHALL inject JD keywords into existing experience bullets by rewording, then verify the output with a post-generation diff that flags unverified keywords. Fuzzy matching uses a minimum token length floor of 4 characters.

#### Scenario: Reword with JD vocabulary
- **WHEN** a bullet says "LLM workflows with retrieval" and the JD mentions "RAG pipelines"
- **THEN** the bullet is rewritten to "RAG pipeline design and LLM orchestration workflows" (only if the candidate actually did this work)

#### Scenario: Never fabricate experience
- **WHEN** the JD mentions a skill the candidate does not have
- **THEN** the system does NOT add that skill to any bullet or section

#### Scenario: Post-generation diff verification with length floor
- **WHEN** keyword injection completes
- **THEN** the system compares each injected keyword against the original CV text

#### Scenario: Tokens ≥ 4 characters use fuzzy matching
- **WHEN** an injected keyword token is 4+ characters
- **THEN** fuzzy match (Levenshtein distance ≤ 2 or substring match) is allowed

#### Scenario: Tokens < 4 characters use exact match only
- **WHEN** an injected keyword token is fewer than 4 characters (e.g., "RAG", "AI", "ML")
- **THEN** only exact matches are allowed — no fuzzy matching

#### Scenario: Flagged keywords surfaced to user
- **WHEN** a keyword in the output doesn't match the original CV
- **THEN** the system flags it as "unverified keyword" and shows a warning in the tailoring results panel

#### Scenario: User resolves flagged keywords before PDF
- **WHEN** there are flagged keywords
- **THEN** the user must accept, reject, or edit each flagged keyword before the PDF is generated

### Requirement: Tailoring progress feedback with accurate step count
The system SHALL stream SSE events during the tailoring pipeline with an accurate step count matching the actual pipeline steps (7).

#### Scenario: Progress events streamed with correct total
- **WHEN** tailoring starts
- **THEN** the system streams `tailoring.started` with `total: 7` (not 6)

#### Scenario: All 7 steps reported
- **WHEN** tailoring runs
- **THEN** events are streamed for all 7 steps: keyword_extraction, role_classification, summary_rewrite, project_selection, bullet_reordering, competency_grid, keyword_injection

#### Scenario: UI shows progress indicator
- **WHEN** progress events are received
- **THEN** the UI shows a progress indicator with step names and estimated time remaining

#### Scenario: Step results included in events
- **WHEN** a step completes
- **THEN** the event includes the step result (e.g., extracted keywords, rewritten summary, role classification)

#### Scenario: Error mid-pipeline
- **WHEN** a step fails
- **THEN** the system streams a `tailoring.step.failed` event with error details and stops the pipeline
