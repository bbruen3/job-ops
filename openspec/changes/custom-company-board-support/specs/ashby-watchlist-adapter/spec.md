## ADDED Requirements

### Requirement: Ashby Watchlist adapter
The system SHALL implement a `WatchlistCatalogSourceAdapter` for Ashby that fetches jobs from the Ashby public job board API.

#### Scenario: Fetch jobs from Ashby board
- **WHEN** a user adds an Ashby company to their Watchlist (e.g., `https://jobs.ashbyhq.com/railway`)
- **THEN** the adapter fetches all open positions from that board and returns them as `WatchlistJobResult` objects

#### Scenario: Custom Ashby URL
- **WHEN** a user pastes a custom Ashby careers URL not in the catalog
- **THEN** the adapter extracts the company slug from the URL and fetches jobs from that board

#### Scenario: Ashby board with no jobs
- **WHEN** an Ashby board has zero open positions
- **THEN** the adapter returns an empty array (no error)

### Requirement: Ashby URL parsing
The system SHALL parse Ashby careers URLs to extract the company slug.

#### Scenario: Standard Ashby URL
- **WHEN** a user provides `https://jobs.ashbyhq.com/railway`
- **THEN** the adapter extracts `railway` as the company slug

#### Scenario: Ashby URL with path
- **WHEN** a user provides `https://jobs.ashbyhq.com/mistral/jobs`
- **THEN** the adapter extracts `mistral` as the company slug

### Requirement: Ashby job normalization
The system SHALL normalize Ashby API responses to the `WatchlistJobResult` shape.

#### Scenario: Normalized Ashby jobs
- **WHEN** Ashby returns job data in its native format
- **THEN** each job is mapped to include: title, employer, location, external ID, job URL, and source type "ashby"

### Requirement: Ashby job details
The system SHALL fetch full job details from Ashby for individual job postings.

#### Scenario: Fetch job details
- **WHEN** a user clicks on an Ashby job in the Watchlist
- **THEN** the adapter fetches the full job description from the Ashby API

### Requirement: Ashby import draft
The system SHALL prepare a `ManualJobDraft` from Ashby job details for import into the workspace.

#### Scenario: Import Ashby job
- **WHEN** a user clicks "Move to workspace" on an Ashby job
- **THEN** the adapter produces a `ManualJobDraft` with title, employer, job URL, location, and job description

### Requirement: Ashby catalog sources
The system SHALL include pre-configured Ashby companies in the Watchlist catalog.

#### Scenario: Catalog includes target companies
- **WHEN** a user opens the Watchlist "Add source" dialog
- **THEN** they see Ashby companies like Railway, Mistral, and Perplexity in the searchable catalog

### Requirement: Ashby branding
The system SHALL fetch company branding (logo) from Ashby for Watchlist display.

#### Scenario: Fetch Ashby logo
- **WHEN** an Ashby company is added to the Watchlist
- **THEN** the adapter fetches the company logo from Ashby and displays it in the Watchlist UI
