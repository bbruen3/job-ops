## 1. Extend Purpose Values

- [x] 1.1 Add `ghostwriter` and `resumeEnhance` to `LLM_PURPOSE_VALUES` in `shared/src/types/settings.ts`
- [x] 1.2 Add `ghostwriter` and `resumeEnhance` to model resolution in `orchestrator/src/server/services/modelSelection.ts`
- [x] 1.3 Add `llmPurposeOverrides` and `llmPurposeApiKeyHints` to the settings registry
- [x] 1.4 Verify `resolveLlmRuntimeSettings()` correctly resolves the new purpose names (switch/case handles all purposes)
- [x] 2.1 Add `LlmPurposeOverrides` and `LlmPurposeApiKeys` types to settings.ts with Zod validation in registry
- [x] 2.2 Add per-purpose override fields to the settings registry as JSON-serialized typed settings
- [x] 2.3 Ensure `llmPurposeApiKeyHints` registry entry covers all 5 purposes

## 3. Build Per-Purpose LLM Config UI Component

- [x] 3.1 Create `PerPurposeLlmConfigSection.tsx` component with a card per purpose (scoring, tailoring, project selection, ghostwriter, resume enhancement)
- [x] 3.2 Each card shows: provider dropdown, base URL input, API key input, model input
- [x] 3.3 Show inherited defaults in muted text when a field is empty
- [x] 3.4 Wire form fields to `llmPurposeOverrides.{purpose}.provider`, `.baseUrl`, `.model` and `llmPurposeApiKeys.{purpose}`
- [x] 3.5 Add provider change logic: changing provider resets base URL and model fields (same pattern as global config)

## 4. Integrate into Settings Page

- [x] 4.1 Add the new section to the Settings page layout alongside the existing Model section
- [x] 4.2 Add `llmPurposeOverrides` and `llmPurposeApiKeys` to the `SECTION_FIELD_MAP` in `SettingsPage.tsx`
- [x] 4.3 Add dirty/error tracking for the per-purpose fields
- [ ] 4.4 Test that saving per-purpose overrides persists correctly and reloads on page refresh

## 5. Backward Compatibility & Cleanup

- [ ] 5.1 Verify `modelScorer`/`modelTailoring`/`modelProjectSelection` values are reflected in the new purpose cards' model fields
- [ ] 5.2 Add migration note: old model-only fields are deprecated but still functional
- [ ] 5.3 Verify env var overrides (`MODEL_SCORER`, etc.) still work and are shown in the UI

## 6. Testing

- [ ] 6.1 Unit test: per-purpose provider override affects `resolveLlmRuntimeSettings()` output
- [ ] 6.2 Unit test: per-purpose base URL override works independently
- [ ] 6.3 Unit test: per-purpose API key takes precedence over global key
- [ ] 6.4 Unit test: ghostwriter purpose resolves correctly
- [ ] 6.5 Unit test: resumeEnhance purpose resolves correctly
- [ ] 6.6 Unit test: inherited defaults when all purpose fields are empty
