import * as settingsRepo from "@server/repositories/settings";
import { getEffectiveSettings } from "@server/services/settings";
import { getDefaultModelForProvider } from "@shared/settings-registry";

export type LlmModelPurpose =
  | "default"
  | "scoring"
  | "tailoring"
  | "projectSelection"
  | "ghostwriter"
  | "resumeEnhance";

function readStringSettingValue(
  setting: { value?: unknown } | null | undefined,
): string | null {
  if (typeof setting?.value !== "string") {
    return null;
  }
  const trimmed = setting.value.trim();
  return trimmed || null;
}

function resolveDefaultModelFromSettings(
  settings: Awaited<ReturnType<typeof getEffectiveSettings>>,
): string {
  return (
    readStringSettingValue(settings?.model) ??
    getDefaultModelForProvider(
      readStringSettingValue(settings?.llmProvider) ?? process.env.LLM_PROVIDER,
      process.env.MODEL,
    )
  );
}

function getPurposeOverride(
  settings: Awaited<ReturnType<typeof getEffectiveSettings>>,
  purpose: string,
): { provider?: string | null; baseUrl?: string | null; model?: string | null } | undefined {
  if (!settings?.llmPurposeOverrides?.value) return undefined;
  const overrides = settings.llmPurposeOverrides.value as Record<string, { provider?: string | null; baseUrl?: string | null; model?: string | null } | undefined>;
  return overrides[purpose];
}

function getPurposeModelFromSettings(
  settings: Awaited<ReturnType<typeof getEffectiveSettings>>,
  purpose: string,
): string | null {
  // Check per-purpose override first
  const override = getPurposeOverride(settings, purpose);
  if (override?.model?.trim()) return override.model.trim();

  // Fall back to model-specific override fields
  switch (purpose) {
    case "scoring":
      return readStringSettingValue(settings?.modelScorer);
    case "tailoring":
      return readStringSettingValue(settings?.modelTailoring);
    case "projectSelection":
      return readStringSettingValue(settings?.modelProjectSelection);
    case "resumeEnhance":
      return readStringSettingValue(settings?.modelResumeEnhance);
    case "ghostwriter":
      return null; // No legacy field for ghostwriter
  }

  return null;
}

function getPurposeProvider(
  settings: Awaited<ReturnType<typeof getEffectiveSettings>>,
  purpose: string,
): string | null {
  const override = getPurposeOverride(settings, purpose);
  return override?.provider?.trim() ?? null;
}

function getPurposeBaseUrl(
  settings: Awaited<ReturnType<typeof getEffectiveSettings>>,
  purpose: string,
): string | null {
  const override = getPurposeOverride(settings, purpose);
  return override?.baseUrl?.trim() ?? null;
}

export async function resolveLlmModel(
  purpose: LlmModelPurpose = "default",
): Promise<string> {
  const settings = await getEffectiveSettings();
  const defaultModel = resolveDefaultModelFromSettings(settings);

  if (purpose === "default") return defaultModel;

  return getPurposeModelFromSettings(settings, purpose) ?? defaultModel;
}

export async function resolveLlmRuntimeSettings(
  purpose: LlmModelPurpose = "default",
): Promise<{
  model: string;
  provider: string | null;
  baseUrl: string | null;
  apiKey: string | null;
}> {
  const getAllSettings =
    "getAllSettings" in settingsRepo ? settingsRepo.getAllSettings : null;
  const [settings, overrides] = await Promise.all([
    getEffectiveSettings(),
    typeof getAllSettings === "function"
      ? getAllSettings()
      : Promise.resolve({} as Partial<Record<settingsRepo.SettingKey, string>>),
  ]);
  const defaultModel = resolveDefaultModelFromSettings(settings);

  const model =
    purpose === "default"
      ? defaultModel
      : (getPurposeModelFromSettings(settings, purpose) ?? defaultModel);

  const purposeProvider = purpose === "default" ? null : getPurposeProvider(settings, purpose);
  const defaultProvider = readStringSettingValue(settings?.llmProvider);
  const provider = purposeProvider ?? defaultProvider;

  const purposeBaseUrl = purpose === "default" ? null : getPurposeBaseUrl(settings, purpose);
  const defaultBaseUrl = readStringSettingValue(settings?.llmBaseUrl);
  const baseUrl = purposeBaseUrl ?? defaultBaseUrl;

  return {
    model,
    provider,
    baseUrl,
    apiKey: overrides?.llmApiKey || process.env.LLM_API_KEY || null,
  };
}
