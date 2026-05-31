/**
 * SSE progress events for the ATS-optimized tailoring pipeline.
 *
 * Streams events during the 7-step pipeline so the UI can show step-by-step progress.
 *
 * Events:
 * - tailoring.started: { step, total }
 * - tailoring.step.started: { step }
 * - tailoring.step.completed: { step, result }
 * - tailoring.step.failed: { step, error }
 * - tailoring.completed: { artifactId, keywordCoverage, flaggedKeywords }
 * - tailoring.failed: { error }
 */

import type { Response } from "express";
import { logger } from "@infra/logger";
import { writeSseData } from "@infra/sse";
import {
  runTailoringPipeline,
  type TailoringPipelineInput,
  type TailoringPipelineResult,
} from "./ats-tailoring";
import { createArtifact } from "./tailored-artifacts";
import type { ResumeProfile } from "@shared/types";

const PIPELINE_STEPS = [
  "keyword_extraction",
  "role_classification",
  "summary_rewrite",
  "project_selection",
  "bullet_reordering",
  "competency_grid",
  "keyword_injection",
] as const;

const STEP_DISPLAY_NAMES: Record<string, string> = {
  keyword_extraction: "Extracting keywords",
  role_classification: "Classifying role",
  summary_rewrite: "Rewriting summary",
  project_selection: "Selecting projects",
  bullet_reordering: "Reordering bullets",
  competency_grid: "Generating competency grid",
  keyword_injection: "Injecting keywords",
};

export interface TailoringSseOptions {
  /** Express response object for SSE streaming */
  res: Response;
  /** Job description text */
  jobDescription: string;
  /** Resume profile */
  profile: ResumeProfile;
  /** Job ID */
  jobId: string;
}

/**
 * Run the tailoring pipeline with SSE progress events.
 *
 * Streams events to the client as each step starts and completes.
 * The pipeline runs all 7 steps sequentially, reporting progress via SSE.
 */
export async function runTailoringWithSse(
  options: TailoringSseOptions,
): Promise<TailoringPipelineResult> {
  const { res, jobDescription, profile, jobId } = options;

  // Send initial started event
  writeSseData(res, {
    type: "tailoring.started",
    step: PIPELINE_STEPS[0],
    total: PIPELINE_STEPS.length,
  });

  try {
    // Run the full pipeline (it handles step-by-step execution internally)
    const result = await runTailoringPipeline({
      jobDescription,
      profile,
      jobId,
    });

    // Send step events based on pipeline results
    for (const stepResult of result.steps) {
      if (stepResult.status === "completed") {
        writeSseData(res, {
          type: "tailoring.step.completed",
          step: stepResult.step,
          displayName: STEP_DISPLAY_NAMES[stepResult.step] || stepResult.step,
          result: stepResult.result,
        });
      } else {
        writeSseData(res, {
          type: "tailoring.step.failed",
          step: stepResult.step,
          displayName: STEP_DISPLAY_NAMES[stepResult.step] || stepResult.step,
          error: stepResult.error,
        });
      }
    }

    // Calculate keyword coverage
    const totalKeywords = result.keywords.length;
    const flaggedCount = result.flaggedKeywords.length;
    const keywordCoverage =
      totalKeywords > 0
        ? ((totalKeywords - flaggedCount) / totalKeywords) * 100
        : 0;

    // Create artifact
    const inputSnapshot = {
      summary: profile.basics?.summary || "",
      experience: (profile.sections?.experience?.items || []).map(
        (e) => e.summary || "",
      ),
      projects: (profile.sections?.projects?.items || []).map(
        (p) => p.name,
      ),
    };

    const artifact = await createArtifact(jobId, result, inputSnapshot);

    // Send completion event
    writeSseData(res, {
      type: "tailoring.completed",
      artifactId: result.artifactId,
      keywordCoverage: Math.round(keywordCoverage),
      flaggedKeywords: result.flaggedKeywords,
      paperFormat: result.paperFormat,
      stepsCompleted: result.steps.filter((s) => s.status === "completed")
        .length,
      totalSteps: result.steps.length,
    });

    logger.info("Tailoring pipeline completed with SSE", {
      artifactId: result.artifactId,
      keywordCoverage,
      flaggedKeywords: result.flaggedKeywords.length,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    writeSseData(res, {
      type: "tailoring.failed",
      error: errorMessage,
    });

    logger.error("Tailoring pipeline failed", { error: errorMessage });

    return {
      success: false,
      artifactId: "",
      steps: [],
      keywords: [],
      classification: null,
      summary: "",
      competencyGrid: [],
      flaggedKeywords: [],
      paperFormat: "a4",
      error: errorMessage,
    };
  }
}

/**
 * Get display name for a pipeline step.
 */
export function getStepDisplayName(step: string): string {
  return STEP_DISPLAY_NAMES[step] || step;
}

/**
 * Get the total number of pipeline steps.
 */
export function getPipelineStepCount(): number {
  return PIPELINE_STEPS.length;
}
