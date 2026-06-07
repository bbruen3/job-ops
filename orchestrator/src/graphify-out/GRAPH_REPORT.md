# Graph Report - .  (2026-04-22)

## Corpus Check
- Large corpus: 443 files · ~225,507 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1705 nodes · 2505 edges · 41 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 579 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_getConfiguredRxResum|getConfiguredRxResum]]
- [[_COMMUNITY_AppError|AppError]]
- [[_COMMUNITY_clearDatabase()|clearDatabase()]]
- [[_COMMUNITY_OnboardingGate.tsx|OnboardingGate.tsx]]
- [[_COMMUNITY_bucketClicks()|bucketClicks()]]
- [[_COMMUNITY_classifyStageAnalyti|classifyStageAnalyti]]
- [[_COMMUNITY_buildApplicationsPer|buildApplicationsPer]]
- [[_COMMUNITY_buildUmamiProxyBody(|buildUmamiProxyBody(]]
- [[_COMMUNITY_isCapabilityError()|isCapabilityError()]]
- [[_COMMUNITY_DiscoveredPanel.test|DiscoveredPanel.test]]
- [[_COMMUNITY_tracer-links.ts|tracer-links.ts]]
- [[_COMMUNITY_applyEnvValue()|applyEnvValue()]]
- [[_COMMUNITY_asyncPool()|asyncPool()]]
- [[_COMMUNITY_asString()|asString()]]
- [[_COMMUNITY_updateJob()|updateJob()]]
- [[_COMMUNITY_JobDetailPanel.test.|JobDetailPanel.test.]]
- [[_COMMUNITY_buildJobChatPromptCo|buildJobChatPromptCo]]
- [[_COMMUNITY_ConversionAnalytics.|ConversionAnalytics.]]
- [[_COMMUNITY_KbdHint.tsx|KbdHint.tsx]]
- [[_COMMUNITY_jobDescription.ts|jobDescription.ts]]
- [[_COMMUNITY_ReadyPanel.tsx|ReadyPanel.tsx]]
- [[_COMMUNITY_buildLatexDocument()|buildLatexDocument()]]
- [[_COMMUNITY_PostApplicationProvi|PostApplicationProvi]]
- [[_COMMUNITY_calculateAutomaticEs|calculateAutomaticEs]]
- [[_COMMUNITY_TailoringWorkspace.t|TailoringWorkspace.t]]
- [[_COMMUNITY_JobCommandBar.tsx|JobCommandBar.tsx]]
- [[_COMMUNITY_JobActionProgressToa|JobActionProgressToa]]
- [[_COMMUNITY_SettingsPage.test.ts|SettingsPage.test.ts]]
- [[_COMMUNITY_user-location.ts|user-location.ts]]
- [[_COMMUNITY_settings.ts|settings.ts]]
- [[_COMMUNITY_ready-panel-google-d|ready-panel-google-d]]
- [[_COMMUNITY_buildDemoDeadline()|buildDemoDeadline()]]
- [[_COMMUNITY_PipelineProgress.tes|PipelineProgress.tes]]
- [[_COMMUNITY_useSettings.ts|useSettings.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_version.ts|version.ts]]
- [[_COMMUNITY_normalizeBlank()|normalizeBlank()]]
- [[_COMMUNITY_isHttpUrl()|isHttpUrl()]]
- [[_COMMUNITY_constructor()|constructor()]]
- [[_COMMUNITY_createRegistry()|createRegistry()]]

## God Nodes (most connected - your core abstractions)
1. `fetchApi()` - 74 edges
2. `runAssistantReply()` - 23 edges
3. `trackProductEvent()` - 17 edges
4. `getSetting()` - 16 edges
5. `RxResumeClientImpl` - 15 edges
6. `onSave()` - 15 edges
7. `createRegistry()` - 14 edges
8. `getEffectiveSettings()` - 14 edges
9. `resolveTracerRedirect()` - 14 edges
10. `renderWithQueryClient()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `runPipeline()`  [INFERRED]
  server/pipeline/run.ts → client/api/client.ts
- `loadProfileStep()` --calls--> `getProfile()`  [INFERRED]
  server/pipeline/steps/load-profile.ts → client/api/client.ts
- `executeJobActionForJob()` --calls--> `processJob()`  [INFERRED]
  server/api/routes/jobs.ts → client/api/client.ts
- `getEffectiveSettings()` --calls--> `getProfile()`  [INFERRED]
  server/services/settings.ts → client/api/client.ts
- `buildJobChatPromptContext()` --calls--> `getProfile()`  [INFERRED]
  server/services/ghostwriter-context.ts → client/api/client.ts

## Communities

### Community 0 - "client.ts"
Cohesion: 0.03
Nodes (101): ApiClientError, approvePostApplicationInboxItem(), cancelJobChatRun(), cancelJobGhostwriterRun(), cancelPipeline(), checkSponsor(), clearBasicAuthCredentials(), clearDatabase() (+93 more)

### Community 1 - "getConfiguredRxResum"
Cohesion: 0.04
Nodes (84): getConfiguredRxResumeBaseResumeId(), normalizeRxResumeMode(), resolveRxResumeBaseResumeIdForMode(), buildCredentialFingerprint(), buildResumeCacheKey(), cloneResume(), deleteResume(), exportResumePdf() (+76 more)

### Community 2 - "AppError"
Cohesion: 0.05
Nodes (77): AppError, badRequest(), isZodErrorLike(), notFound(), requestTimeout(), serviceUnavailable(), statusToCode(), toAppError() (+69 more)

### Community 3 - "clearDatabase()"
Cohesion: 0.05
Nodes (55): clearDatabase(), dropDatabase(), discoverJobsStep(), filterJobsByRequestedCities(), parseBlockedCompanyKeywords(), directoryExists(), discoverManifestPaths(), discoverProviderManifestPaths() (+47 more)

### Community 4 - "OnboardingGate.tsx"
Cohesion: 0.04
Nodes (52): deleteBackup(), updateSettings(), getDataDir(), buildUtcDate(), cleanupOldBackups(), createBackup(), deleteBackup(), generateBackupFilename() (+44 more)

### Community 5 - "bucketClicks()"
Cohesion: 0.05
Nodes (41): bucketClicks(), bucketCount(), bucketQueryLength(), generateAnalyticsUserId(), getAnalyticsAppVersion(), getAnalyticsUserId(), sanitizeEventPayload(), shouldDedupe() (+33 more)

### Community 6 - "classifyStageAnalyti"
Cohesion: 0.05
Nodes (46): classifyStageAnalyticsSource(), inferOutcome(), isClosingStage(), maybeTrackStageAnalytics(), resolveOutcomeAndClosedAt(), transitionStage(), buildCompactActiveJobsList(), buildIndexedActiveJobs() (+38 more)

### Community 7 - "buildApplicationsPer"
Cohesion: 0.06
Nodes (22): buildApplicationsPerDay(), toDateKey(), buildAuthHeaders(), extractTokenFromCookies(), RxResumeClientImpl, sanitizeResponseSnippet(), buildConversionTimeSeries(), toDateKey() (+14 more)

### Community 8 - "buildUmamiProxyBody("
Cohesion: 0.06
Nodes (28): createApp(), createBasicAuthGuard(), getAllowedUmamiMethods(), isAllowedUmamiMethod(), getDemoInfo(), isDemoMode(), computeNextReset(), initializeDemoModeServices() (+20 more)

### Community 9 - "isCapabilityError()"
Cohesion: 0.07
Nodes (26): isCapabilityError(), extractChatCompletionsText(), addQueryParam(), buildHeaders(), getResponseDetail(), joinUrl(), buildModeCacheKey(), getOrderedModes() (+18 more)

### Community 10 - "DiscoveredPanel.test"
Cohesion: 0.05
Nodes (15): render(), render(), render(), render(), render(), render(), createTestQueryClient(), renderHookWithQueryClient() (+7 more)

### Community 11 - "tracer-links.ts"
Cohesion: 0.09
Nodes (39): buildEventFilters(), buildReadableSlugPrefix(), classifyDeviceType(), classifyOsFamily(), classifyUaFamily(), collectUrlTargets(), dayBucketFromUnixSeconds(), deriveSourceLabel() (+31 more)

### Community 12 - "applyEnvValue()"
Cohesion: 0.08
Nodes (30): getEnvSettingsData(), normalizeEnvInput(), buildInferencePrompt(), inferManualJobDetails(), normalizeDraft(), readStringSettingValue(), resolveDefaultModelFromSettings(), resolveLlmModel() (+22 more)

### Community 13 - "asyncPool()"
Cohesion: 0.08
Nodes (19): asyncPool(), importJobsStep(), createJob(), createJobs(), deleteJobsBelowScore(), deleteJobsByStatus(), getJobById(), getJobByUrl() (+11 more)

### Community 14 - "asString()"
Cohesion: 0.09
Nodes (21): asString(), buildGmailQuery(), cleanEmailHtmlForLlm(), decodeBase64Url(), decodeTextPart(), fetchWithTimeout(), gmailApi(), listMessageIds() (+13 more)

### Community 15 - "updateJob()"
Cohesion: 0.1
Nodes (20): updateJob(), ensureJob(), ensureProjectIds(), makeDemoReason(), makeDemoSummary(), samplePdfPath(), scoreFromJob(), simulateApplyJob() (+12 more)

### Community 16 - "JobDetailPanel.test."
Cohesion: 0.15
Nodes (25): renderResumePdf(), render(), renderJobDetailPanel(), renderLatexPdf(), asArray(), asRecord(), cleanText(), decodeHtmlEntities() (+17 more)

### Community 17 - "buildJobChatPromptCo"
Cohesion: 0.13
Nodes (21): buildJobChatPromptContext(), buildJobSnapshot(), buildProfileSnapshot(), buildSystemPrompt(), compactJoin(), truncate(), collectProfileLanguageSample(), detectProfileLanguage() (+13 more)

### Community 18 - "ConversionAnalytics."
Cohesion: 0.09
Nodes (14): createJob(), simulatePipelineRun(), generateFinalPdf(), PipelineCancelledError, processJob(), runPipeline(), summarizeJob(), createPipelineRun() (+6 more)

### Community 19 - "KbdHint.tsx"
Cohesion: 0.1
Nodes (16): KbdHint(), KeyboardShortcutBar(), getMetaKeyLabel(), getMetaShortcutLabel(), isApplePlatform(), dedupeShortcuts(), getDisplayKey(), getShortcutsForTab() (+8 more)

### Community 20 - "jobDescription.ts"
Cohesion: 0.08
Nodes (10): formatEpochMs(), getRenderableJobDescription(), toggleMustInclude(), formatRange(), formatEpochMs(), clampInt(), formatDateTime(), formatTimestamp() (+2 more)

### Community 21 - "ReadyPanel.tsx"
Cohesion: 0.11
Nodes (9): ReadyPanel(), useHotkeys(), useMarkAsAppliedMutation(), useRescoreJobMutation(), useSkipJobMutation(), useKeyboardShortcuts(), useProfile(), useRescoreJob() (+1 more)

### Community 22 - "buildLatexDocument()"
Cohesion: 0.18
Nodes (15): buildLatexDocument(), escapeForCommand(), escapeLatexText(), escapeLatexUrl(), loadTemplate(), normalizeText(), readLatexTemplate(), renderBullets() (+7 more)

### Community 23 - "PostApplicationProvi"
Cohesion: 0.14
Nodes (13): PostApplicationProviderError, providerInvalidRequest(), providerNotImplemented(), providerUpstreamError(), asNumber(), asString(), buildStatus(), parseGmailCredentials() (+5 more)

### Community 24 - "calculateAutomaticEs"
Cohesion: 0.12
Nodes (8): calculateAutomaticEstimate(), deriveExtractorLimits(), normalizeWorkplaceTypes(), parseCityLocationsInput(), parseSearchTermsInput(), saveAutomaticRunMemory(), handleSaveAndRun(), toggleWorkplaceType()

### Community 25 - "TailoringWorkspace.t"
Cohesion: 0.16
Nodes (8): fromEditableSkillGroups(), parseTailoredSkills(), serializeTailoredSkills(), toEditableSkillGroups(), normalizeSkillsJson(), toBaselineFromJob(), parseIncomingDraft(), parseSelectedIds()

### Community 26 - "JobCommandBar.tsx"
Cohesion: 0.15
Nodes (9): applyLock(), handleInputKeyDown(), computeFieldMatchScore(), computeJobMatchScore(), extractLeadingAtToken(), getCommandGroup(), getLockMatchesFromAliasPrefix(), groupJobsForCommandBar() (+1 more)

### Community 27 - "JobActionProgressToa"
Cohesion: 0.17
Nodes (9): JobActionProgressToast(), getProgressTitle(), upsertProgressToast(), clampNumber(), compareJobs(), compareNumber(), compareString(), dateValue() (+1 more)

### Community 28 - "SettingsPage.test.ts"
Cohesion: 0.33
Nodes (12): clickLastButtonByName(), openDangerZoneSection(), openDisplaySection(), openEnvironmentSection(), openModelSection(), openNavGroup(), openPromptTemplatesSection(), openReactiveResumeSection() (+4 more)

### Community 29 - "user-location.ts"
Cohesion: 0.44
Nodes (9): canUseStorage(), countryFromRegionCode(), countryFromTimezone(), detectUserCountryKey(), extractRegionCodeFromLocaleTag(), getDetectedCountryKey(), normalizeSupportedCountry(), readCachedUserCountry() (+1 more)

### Community 30 - "settings.ts"
Cohesion: 0.36
Nodes (5): buildRxResumeValidationOptions(), getDefaultValidationBaseUrl(), hasInputKey(), normalizeLlmProviderValue(), resolveLlmConfig()

### Community 31 - "ready-panel-google-d"
Cohesion: 0.54
Nodes (7): buildDork(), buildReadyPanelGoogleDorks(), formatTermList(), getKeywordTerms(), parseTailoredSkills(), quoteTerms(), splitRawSkills()

### Community 34 - "buildDemoDeadline()"
Cohesion: 0.7
Nodes (4): buildDemoDeadline(), buildGeneratedJob(), makeDemoCompany(), sourceBaseUrl()

### Community 35 - "PipelineProgress.tes"
Cohesion: 0.4
Nodes (1): MockEventSource

### Community 39 - "useSettings.ts"
Cohesion: 0.4
Nodes (2): usePipelineControls(), useSettings()

### Community 43 - "layout.tsx"
Cohesion: 0.5
Nodes (2): handleNavClick(), isNavActive()

### Community 47 - "version.ts"
Cohesion: 0.83
Nodes (3): canUseStorage(), checkForUpdate(), parseVersion()

### Community 49 - "normalizeBlank()"
Cohesion: 0.67
Nodes (2): parseStoredTerms(), parseTokenizedTerms()

### Community 52 - "isHttpUrl()"
Cohesion: 1.0
Nodes (2): isHttpUrl(), normalizeBaseUrl()

### Community 53 - "constructor()"
Cohesion: 0.67
Nodes (1): constructor()

### Community 54 - "createRegistry()"
Cohesion: 0.67
Nodes (1): createRegistry()

## Knowledge Gaps
- **Thin community `PipelineProgress.tes`** (5 nodes): `PipelineProgress.test.tsx`, `MockEventSource`, `.constructor()`, `.emitMessage()`, `.emitOpen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `useSettings.ts`** (5 nodes): `useSettings.ts`, `usePipelineControls.ts`, `usePipelineControls()`, `_resetSettingsCache()`, `useSettings()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `layout.tsx`** (4 nodes): `layout.tsx`, `navigation.ts`, `handleNavClick()`, `isNavActive()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `normalizeBlank()`** (4 nodes): `normalizeBlank()`, `parseStoredTerms()`, `parseTokenizedTerms()`, `ChatSettingsSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `isHttpUrl()`** (3 nodes): `isHttpUrl()`, `normalizeBaseUrl()`, `public-url.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `constructor()`** (3 nodes): `constructor()`, `profile.test.ts`, `profile.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createRegistry()`** (3 nodes): `createRegistry()`, `extractor-health.test.ts`, `extractor-health.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generatePdf()` connect `getConfiguredRxResum` to `JobDetailPanel.test.`, `clearDatabase()`, `OnboardingGate.tsx`, `bucketClicks()`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `renderResumePdf()` connect `JobDetailPanel.test.` to `getConfiguredRxResum`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `renderLatexPdf()` connect `JobDetailPanel.test.` to `buildLatexDocument()`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `runAssistantReply()` (e.g. with `getThreadForJob()` and `notFound()`) actually correct?**
  _`runAssistantReply()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `trackProductEvent()` (e.g. with `handleSkip()` and `handleFinalize()`) actually correct?**
  _`trackProductEvent()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `getSetting()` (e.g. with `notifyPipelineWebhookStep()` and `scoreJobsStep()`) actually correct?**
  _`getSetting()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._