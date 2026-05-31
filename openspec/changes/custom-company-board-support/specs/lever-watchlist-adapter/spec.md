## ADDED Requirements

### Requirement: Lever Watchlist adapter
The system SHALL implement a `WatchlistCatalogSourceAdapter` for Lever that fetches jobs from `api.lever.co/v0/postings/{company_slug}`.

#### Scenario: Fetch jobs from Lever company
- **WHEN** a user adds a Lever company to their Watchlist (e.g., `https://jobs.lever.co/flyio`)
- **THEN** the adapter fetches all open postings from that company and returns them as `WatchlistJobResult` objects

#### Scenario: Custom Lever URL
- **WHEN** a user pastes a custom Lever careers URL not in the catalog
- **THEN** the adapter extracts the company slug from the URL and fetches postings from that company

#### Scenario: Lever company with no postings
- **WHEN** a Lever company has zero open positions
- **THEN** the adapter returns an empty array (no error)

### Requirement: Lever URL parsing
The system SHALL parse Lever careers URLs to extract the company slug.

#### Scenario: Standard Lever URL
- **WHEN** a user provides `https://jobs.lever.co/flyio`
- **THEN** the adapter extracts `flyio` as the company slug

#### Scenario: Lever URL with path
- **WHEN** a user provides `https://jobs.lever.co/planetscale/jobs`
- **THEN** the adapter extracts `planetscale` as the company slug

### Requirement: Lever job normalization
The system SHALL normalize Lever API responses to the `WatchlistJobResult` shape.

#### Scenario: Normalized Lever jobs
- **WHEN** Lever returns posting data in its native format
- **THEN** each posting is mapped to include: title, employer, location, external ID, job URL, and source type "lever"

### Requirement: Lever job details
The system SHALL fetch full job details from Lever for individual postings.

#### Scenario: Fetch posting details
- **WHEN** a user clicks on a Lever posting in the Watchlist
- **THEN** the adapter fetches the full job description from the Lever API

### Requirement: Lever import draft
The system SHALL prepare a `ManualJobDraft` from Lever posting details for import into the workspace.

#### Scenario: Import Lever posting
- **WHEN** a user clicks "Move to workspace" on a Lever posting
- **THEN** the adapter produces a `ManualJobDraft` with title, employer, job URL, location, and job description

### Requirement: Lever catalog sources
The system SHALL include pre-configured Lever companies in the Watchlist catalog.

#### Scenario: Catalog includes target companies
- **WHEN** a user opens the Watchlist "Add source" dialog
- **THEN** they see Lever companies like Fly.io, PlanetScale, and Cohere in the searchable catalog

### Requirement: Lever branding
The system SHALL fetch company branding (logo) from Lever for Watchlist display.

#### Scenario: Fetch Lever logo
- **WHEN** a Lever company is added to the Watchlist
- **THEN** the adapter fetches the company logo from Lever and displays it in the Watchlist UI
