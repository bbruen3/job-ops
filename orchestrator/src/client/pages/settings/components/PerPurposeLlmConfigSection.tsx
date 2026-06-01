import * as api from "@client/api";
import { SettingsInput } from "@client/pages/settings/components/SettingsInput";
import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type { ModelValues } from "@client/pages/settings/types";
import {
  formatSecretHint,
  getLlmProviderConfig,
  LLM_PROVIDER_LABELS,
  LLM_PROVIDERS,
} from "@client/pages/settings/utils";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import { LLM_PURPOSE_LABELS, type LlmPurpose } from "@shared/types";
import type React from "react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PerPurposeLlmConfigSectionProps = {
  values: ModelValues;
  isLoading: boolean;
  isSaving: boolean;
  layoutMode?: "accordion" | "panel";
};

const ALL_PURPOSES: LlmPurpose[] = [
  "scoring",
  "tailoring",
  "projectSelection",
  "ghostwriter",
  "resumeEnhance",
];

const PURPOSE_DESCRIPTIONS: Record<LlmPurpose, string> = {
  scoring: "AI scoring of job suitability against your profile",
  tailoring: "Generating tailored resume summaries and headlines",
  projectSelection: "Selecting the most relevant projects for a job",
  ghostwriter: "Chat-based cover letter and outreach draft generation",
  resumeEnhance: "ATS-optimized 7-step resume tailoring pipeline",
};

export const PerPurposeLlmConfigSection: React.FC<
  PerPurposeLlmConfigSectionProps
> = ({ values, isLoading, isSaving, layoutMode }) => {
  const { effective, default: defaultModel, llmProvider, llmBaseUrl, llmApiKeyHint } = values;
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<UpdateSettingsInput>();

  const watchAll = watch();

  return (
    <SettingsSectionFrame
      mode={layoutMode}
      title="Per-Purpose LLM"
      value="per-purpose-llm"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Override the global LLM provider, base URL, API key, or model for
          specific tasks. Empty fields inherit the global defaults shown in
          muted text.
        </p>

        <Separator />

        <div className="grid gap-6">
          {ALL_PURPOSES.map((purpose) => (
            <PurposeCard
              key={purpose}
              purpose={purpose}
              isLoading={isLoading}
              isSaving={isSaving}
              watchAll={watchAll}
              control={control}
              register={register}
              errors={errors}
              globalProvider={llmProvider || "openrouter"}
              globalBaseUrl={llmBaseUrl || ""}
              globalModel={effective || defaultModel || "-"}
              apiKeyHint={null}
            />
          ))}
        </div>
      </div>
    </SettingsSectionFrame>
  );
};

type PurposeCardProps = {
  purpose: LlmPurpose;
  isLoading: boolean;
  isSaving: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchAll: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  globalProvider: string;
  globalBaseUrl: string;
  globalModel: string;
  apiKeyHint: string | null;
};

function PurposeCard({
  purpose,
  isLoading,
  isSaving,
  watchAll,
  control,
  register,
  errors,
  globalProvider,
  globalBaseUrl,
  globalModel,
  apiKeyHint,
}: PurposeCardProps) {
  const overridePath = `llmPurposeOverrides.${purpose}`;
  const apiKeyPath = `llmPurposeApiKeys.${purpose}`;

  // Watch the override fields
  const providerValue = watchAll.llmPurposeOverrides?.[purpose]?.provider ?? "";
  const baseUrlValue = watchAll.llmPurposeOverrides?.[purpose]?.baseUrl ?? "";
  const modelValue = watchAll.llmPurposeOverrides?.[purpose]?.model ?? "";
  const apiKeyValue = watchAll[apiKeyPath] ?? "";

  const effectiveProvider = providerValue || globalProvider;
  const isCustomProvider = Boolean(providerValue);
  const providerConfig = getLlmProviderConfig(effectiveProvider);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">
            {LLM_PURPOSE_LABELS[purpose]}
          </h4>
          <p className="text-xs text-muted-foreground">
            {PURPOSE_DESCRIPTIONS[purpose]}
          </p>
        </div>
        {isCustomProvider && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Override active
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Provider */}
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Controller
            name={`${overridePath}.provider`}
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(value) => {
                  field.onChange(value || null);
                }}
                disabled={isLoading || isSaving}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Inherit global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__inherit__">Inherit global</SelectItem>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {LLM_PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {!providerValue && (
            <p className="text-xs text-muted-foreground">
              Global: {LLM_PROVIDER_LABELS[globalProvider as keyof typeof LLM_PROVIDER_LABELS] || globalProvider}
            </p>
          )}
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <Label className="text-xs">Base URL</Label>
          <Input
            className="h-8 text-xs"
            placeholder={providerConfig.baseUrlPlaceholder ?? "Inherit"}
            disabled={isLoading || isSaving}
            {...register(`${overridePath}.baseUrl`)}
          />
          {!baseUrlValue && globalBaseUrl && (
            <p className="text-xs text-muted-foreground truncate">
              Global: {globalBaseUrl}
            </p>
          )}
        </div>

        {/* API Key */}
        {providerConfig.showApiKey && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Input
              className="h-8 text-xs"
              type="password"
              placeholder={apiKeyHint ? "Replace key" : "Inherit"}
              disabled={isLoading || isSaving}
              {...register(apiKeyPath)}
            />
            {!apiKeyValue && apiKeyHint && (
              <p className="text-xs text-muted-foreground">
                Global: {formatSecretHint(apiKeyHint)}
              </p>
            )}
          </div>
        )}

        {/* Show API key input even for providers that don't need it, with helper text */}
        {!providerConfig.showApiKey && (
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <div className="h-8 flex items-center text-xs text-muted-foreground">
              {providerConfig.keyHelper || "Not required"}
            </div>
          </div>
        )}

        {/* Model */}
        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder={globalModel || "Inherit"}
            disabled={isLoading || isSaving}
            {...register(`${overridePath}.model`)}
          />
          {!modelValue && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              Global: {globalModel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
