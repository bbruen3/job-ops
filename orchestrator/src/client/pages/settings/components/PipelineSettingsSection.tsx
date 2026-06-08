import * as api from "@client/api";
import { SettingsInput } from "@client/pages/settings/components/SettingsInput";
import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type { PipelineValues } from "@client/pages/settings/types";
import type { UpdateSettingsInput } from "@shared/settings-schema.js";
import type React from "react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const [isClearing, setIsClearing] = useState(false);

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
                render={({ field }) => {
                  // Display logic: join array with newlines.
                  // Preserve trailing empty string so the cursor stays on the new line after Enter.
                  const displayValue = (arr: string[] | null | undefined): string => {
                    if (!Array.isArray(arr) || arr.length === 0) return "";
                    // Join all terms; a trailing empty string becomes a trailing newline
                    return arr.join("\n");
                  };
                  return (
                    <Textarea
                      value={displayValue(field.value ?? values.searchTerms.default)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Split by newlines (each line is a term) and commas (paste compat)
                        const parts = raw.split("\n");
                        const terms = parts.flatMap((line) =>
                          line.split(",").map((v) => v.trim()),
                        );
                        // If the raw value ends with newline, preserve a trailing empty entry
                        // so the textarea shows a blank line for continued typing
                        const endsWithNewline = raw.endsWith("\n");
                        // Filter out empty strings in the middle but keep trailing ones
                        const nonEmpty = terms.filter((t, i) => t !== "" || i === terms.length - 1);
                        const result = nonEmpty.length > 0 && !(nonEmpty.length === 1 && nonEmpty[0] === "")
                          ? endsWithNewline && nonEmpty[nonEmpty.length - 1] !== ""
                            ? [...nonEmpty, ""]
                            : nonEmpty
                          : null;
                        field.onChange(result);
                      }}
                      placeholder="software engineer&#10;backend developer&#10;rust engineer"
                      disabled={isLoading || isSaving}
                      className="min-h-[100px]"
                    />
                  );
                }}
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

        <Separator />

        {/* Job Management */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Job Management</label>
          <p className="text-xs text-muted-foreground">
            Clear all discovered jobs (for example, after changing search terms) or
            delete individual jobs from the discovered tab.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isClearing || isLoading || isSaving}
            onClick={async () => {
              if (!window.confirm("Delete ALL discovered jobs? This cannot be undone.")) return;
              setIsClearing(true);
              try {
                const result = await api.deleteJobsByStatus("discovered");
                toast.success(result.message);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to clear jobs";
                toast.error(message);
              } finally {
                setIsClearing(false);
              }
            }}
          >
            {isClearing ? "Clearing..." : "Clear All Discovered"}
          </Button>
        </div>
      </div>
    </SettingsSectionFrame>
  );
};
