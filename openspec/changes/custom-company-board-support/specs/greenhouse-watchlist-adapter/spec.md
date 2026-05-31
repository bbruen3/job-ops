## ADDED Requirements

### Requirement: Greenhouse Watchlist adapter
The system SHALL implement a `WatchlistCatalogSourceAdapter` for Greenhouse that fetches jobs from `boards-api.greenhouse.io/v1/boards/{board_token}/jobs`.

#### Scenario: Fetch jobs from Greenhouse board
- **WHEN** a user adds a Greenhouse company to their Watchlist (e.g., `https://boards.greenhouse.io/temporal`)
- **THEN** the adapter fetches all open jobs from that board and returns them as `WatchlistJobResult` objects

#### Scenario: Custom Greenhouse URL
- **WHEN** a user pastes a custom Greenhouse careers URL not in the catalog
- **THEN** the adapter extracts the board token from the URL and fetches jobs from that board

#### Scenario: Greenhouse board with no jobs
- **WHEN** a Greenhouse board has zero open positions
- **THEN** the adapter returns an empty array (no error)

### Requirement: Greenhouse URL parsing
The system SHALL parse Greenhouse careers URLs to extract the board token.

#### Scenario: Standard Greenhouse URL
- **WHEN** a user provides `https://boards.greenhouse.io/temporal`
- **THEN** the adapter extracts `temporal` as the board token

#### Scenario: Custom domain Greenhouse URL
- **WHEN** a user provides `https://temporal.greenhouse.io/careers`
- **THEN** the adapter extracts `temporal` as the board token

### Requirement: Greenhouse job normalization
The system SHALL normalize Greenhouse API responses to the `WatchlistJobResult` shape.

#### Scenario: Normalized Greenhouse jobs
- **WHEN** Greenhouse returns job data in its native format
- **THEN** each job is mapped to include: title, employer, location, external ID, job URL, and source type "greenhouse"

### Requirement: Greenhouse job details
The system SHALL fetch full job details from Greenhouse for individual job postings.

#### Scenario: Fetch job details
- **WHEN** a user clicks on a Greenhouse job in the Watchlist
- **THEN** the adapter fetches the full job description from the Greenhouse API

### Requirement: Greenhouse import draft
The system SHALL prepare a `ManualJobDraft` from Greenhouse job details for import into the workspace.

#### Scenario: Import Greenhouse job
- **WHEN** a user clicks "Move to workspace" on a Greenhouse job
- **THEN** the adapter produces a `ManualJobDraft` with title, employer, job URL, location, and job description

### Requirement: Greenhouse catalog sources
The system SHALL include pre-configured Greenhouse companies in the Watchlist catalog.

#### Scenario: Catalog includes target companies
- **WHEN** a user opens the Watchlist "Add source" dialog
- **THEN** they see Greenhouse companies like Temporal, Scale AI, Notion, Retool, Figma, and Loom in the searchable catalog

### Requirement: Greenhouse branding
The system SHALL fetch company branding (logo) from Greenhouse for Watchlist display.

#### Scenario: Fetch Greenhouse logo
- **WHEN** a Greenhouse company is added to the Watchlist
- **THEN** the adapter fetches the company logo from Greenhouse and displays it in the Watchlist UI
