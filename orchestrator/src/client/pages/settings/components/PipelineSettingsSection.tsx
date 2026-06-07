import { SettingsInput } from "@client/pages/settings/components/SettingsInput";
import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type { PipelineValues } from "@client/pages/settings/types";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import type React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type PipelineSettingsSectionProps = {
  values: PipelineValues;
  isLoading: boolean;
  isSaving: boolean;
  layoutMode?: "accordion" | "panel";
};

const WORKPLACE_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

export const PipelineSettingsSection: React.FC<PipelineSettingsSectionProps> = ({
  values,
  isLoading,
  isSaving,
  layoutMode,
}) => {
  const { control, watch, setValue } = useFormContext<UpdateSettingsInput>();

  const currentWorkplaceTypes =
    watch("workplaceTypes") ?? values.workplaceTypes.default;
  const currentPipelineRunMode =
    watch("pipelineRunMode") ?? values.pipelineRunMode.default;

  return (
    <SettingsSectionFrame
      mode={layoutMode}
      title="Pipeline & Extractor Settings"
      value="pipeline"
    >
      <div className="space-y-6">
        {/* Search Terms */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Terms</label>
          <p className="text-xs text-muted-foreground">
            Job titles and keywords to search for. One per line or comma-separated.
          </p>
          <Controller
            name="searchTerms"
            control={control}
            render={({ field }) => (
              <Textarea
                value={
                  Array.isArray(field.value)
                    ? field.value.join("\n")
                    : Array.isArray(values.searchTerms.default)
                      ? values.searchTerms.default.join("\n")
                      : ""
                }
                onChange={(e) => {
                  const terms = e.target.value
                    .split(/[\n,]/g)
                    .map((v) => v.trim())
                    .filter(Boolean);
                  field.onChange(terms.length > 0 ? terms : null);
                }}
                placeholder="software engineer&#10;backend developer&#10;rust engineer"
                disabled={isLoading || isSaving}
                className="min-h-[100px]"
              />
            )}
          />
          {values.searchTerms.effective.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Current: {values.searchTerms.effective.join(", ")}
            </p>
          )}
        </div>

        <Separator />

        {/* Workplace Types */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Workplace Types</label>
          <p className="text-xs text-muted-foreground">
            Filter jobs by workplace type. Leave all unchecked for no filter.
          </p>
          <div className="flex flex-wrap gap-4">
            {WORKPLACE_TYPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Controller
                  name="workplaceTypes"
                  control={control}
                  render={({ field }) => {
                    const currentList = Array.isArray(field.value)
                      ? field.value
                      : values.workplaceTypes.default;
                    const isChecked = currentList.includes(option.value);
                    return (
                      <Checkbox
                        id={`workplace-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...currentList, option.value]
                            : currentList.filter(
                                (v: string) => v !== option.value,
                              );
                          field.onChange(next.length > 0 ? next : null);
                        }}
                        disabled={isLoading || isSaving}
                      />
                    );
                  }}
                />
                <label
                  htmlFor={`workplace-${option.value}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Search Cities */}
        <SettingsInput
          label="Search Cities"
          inputProps={{
            ...useFormContext<UpdateSettingsInput>().register("searchCities"),
          }}
          placeholder="San Francisco|Austin|New York"
          disabled={isLoading || isSaving}
          helper="Pipe-separated city names. Leave empty for no city filter."
          current={
            values.searchCities.effective
              ? `Current: ${values.searchCities.effective}`
              : undefined
          }
        />

        <Separator />

        {/* Pipeline Run Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Pipeline Run Mode</label>
          <p className="text-xs text-muted-foreground">
            Controls which pipeline stages run automatically.
            <br />
            <strong>Automatic:</strong> run all stages (discover, score, tailor, PDF).
            <br />
            <strong>Discovery-only:</strong> stop after importing jobs; process each job individually via the "Process" button.
          </p>
          <Controller
            name="pipelineRunMode"
            control={control}
            render={({ field }) => (
              <Select
                value={
                  (field.value as string | undefined | null) ??
                  values.pipelineRunMode.default ??
                  "automatic"
                }
                onValueChange={(val: string) => field.onChange(val)}
                disabled={isLoading || isSaving}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="discovery-only">
                    Discovery Only
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </SettingsSectionFrame>
  );
};
