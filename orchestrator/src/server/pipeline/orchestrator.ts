/**
 * Main pipeline logic - orchestrates the daily job processing flow.
 *
 * Flow:
 * 1. Run crawler to discover new jobs
 * 2. Score jobs for suitability
 * 3. Leave all jobs in "discovered" for manual processing
 */

import { join } from "node:path";
import { logger } from "@infra/logger";
import { trackServerProductEvent } from "@infra/product-analytics";
import { runWithRequestContext } from "@infra/request-context";
import type { CreateJobInput, PipelineConfig } from "@shared/types";
import { getDataDir } from "../config/dataDir";
import * as jobsRepo from "../repositories/jobs";
import * as pipelineRepo from "../repositories/pipeline";
import { getSetting } from "../repositories/settings";
import { generatePdf } from "../services/pdf";
import { getProfile } from "../services/profile";
import { pickProjectIdsForJob } from "../services/projectSelection";
import {
  extractProjectsFromProfile,
  resolveResumeProjectsSettings,
} from "../services/resumeProjects";
import { generateTailoring } from "../services/summary";
import { progressHelpers, resetProgress } from "./progress";
import {
  discoverJobsStep,
  importJobsStep,
  loadProfileStep,
  notifyPipelineWebhookStep,
  processJobsStep,
  scoreJobsStep,
  selectJobsStep,
} from "./steps";

const DEFAULT_CONFIG: PipelineConfig = {
  topN: 10,
  minSuitabilityScore: 50,
  // Keep Glassdoor opt-in via source picker/settings; do not enable by default.
  sources: ["gradcracker", "indeed", "linkedin", "ukvisajobs"],
  outputDir: join(getDataDir(), "pdfs"),
  enableCrawling: true,
  enableScoring: true,
  enableImporting: true,
  enableAutoTailoring: true,
};

// Track if pipeline is currently running
let isPipelineRunning = false;
let activePipelineRunId: string | null = null;
let cancelRequestedAt: string | null = null;

class PipelineCancelledError extends Error {
  constructor(message = "Pipeline cancellation requested") {
    super(message);
    this.name = "PipelineCancelledError";
  }
}

function ensureNotCancelled(): void {
  if (cancelRequestedAt) {
    throw new PipelineCancelledError();
  }
}

/**
 * Resolve pipelineRunMode from env var. The DB-stored setting
 * can be read asynchronously but for simplicity we use process.env
 * which is populated at startup from .env or env defaults.
 * Explicit API flags override the mode.
 */
function resolvePipelineRunMode(
  apiConfig: Partial<PipelineConfig>,
): "automatic" | "discovery-only" {
  if (apiConfig.pipelineRunMode) return apiConfig.pipelineRunMode;
  const raw = process.env.PIPELINE_RUN_MODE?.trim().toLowerCase();
  return raw === "discovery-only" ? "discovery-only" : "automatic";
}

/**
 * Apply run mode as default stage flags. Explicit flags override.
 */
function applyRunModeFlags(
  mode: "automatic" | "discovery-only",
): Partial<PipelineConfig> {
  if (mode === "discovery-only") {
    return {
      enableCrawling: true,
      enableImporting: true,
      enableScoring: false,
      enableAutoTailoring: false,
    };
  }
  return {};
}

/**
 * Run the full job discovery and processing pipeline.
 */
export async function runPipeline(
  config: Partial<PipelineConfig> = {},
): Promise<{
  success: boolean;
  jobsDiscovered: number;
  jobsProcessed: number;
  error?: string;
}> {
  if (isPipelineRunning) {
    return {
      success: false,
      jobsDiscovered: 0,
      jobsProcessed: 0,
      error: "Pipeline is already running",
    };
  }

  isPipelineRunning = true;
  activePipelineRunId = "pending";
  cancelRequestedAt = null;
  resetProgress();

  // Build merged config: defaults ← run mode flags ← explicit API flags
  const runMode = resolvePipelineRunMode(config);
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...applyRunModeFlags(runMode),
    ...config,
  };
  mergedConfig.pipelineRunMode = runMode;

  const pipelineRun = await pipelineRepo.createPipelineRun();
  activePipelineRunId = pipelineRun.id;

  return runWithRequestContext({ pipelineRunId: pipelineRun.id }, async () => {
    const pipelineLogger = logger.child({ pipelineRunId: pipelineRun.id });
    let jobsDiscovered = 0;
    let jobsProcessed = 0;
    pipelineLogger.info("Starting pipeline run", {
      pipelineRunMode: mergedConfig.pipelineRunMode,
      enableCrawling: mergedConfig.enableCrawling,
      enableScoring: mergedConfig.enableScoring,
      enableImporting: mergedConfig.enableImporting,
      enableAutoTailoring: mergedConfig.enableAutoTailoring,
      topN: mergedConfig.topN,
      minSuitabilityScore: mergedConfig.minSuitabilityScore,
      sources: mergedConfig.sources,
    });

    try {
      ensureNotCancelled();
      const profile = await loadProfileStep();

      // Stage 1: Crawling (discover new jobs from sources)
      const emptyDiscovery = { discoveredJobs: [] as CreateJobInput[], sourceErrors: [] as string[] };
      const { discoveredJobs } = mergedConfig.enableCrawling !== false
        ? await discoverJobsStep({
            mergedConfig,
            shouldCancel: () => cancelRequestedAt !== null,
          }).catch((error) => {
            pipelineLogger.error("Crawling failed", error);
            return emptyDiscovery;
          })
        : (() => {
            pipelineLogger.info("Crawling disabled — skipping discovery");
            return emptyDiscovery;
          })();

      // Stage 2: Importing (save discovered jobs to DB)
      if (mergedConfig.enableImporting !== false && discoveredJobs.length > 0) {
        ensureNotCancelled();
        const { created } = await importJobsStep({ discoveredJobs });
        jobsDiscovered = created;
        await pipelineRepo.updatePipelineRun(pipelineRun.id, {
          jobsDiscovered: created,
        });
      } else if (discoveredJobs.length > 0) {
        pipelineLogger.info("Importing disabled — discovered jobs will not be saved");
      }

      // Stage 3: Scoring (LLM evaluate job fit)
      let unprocessedJobs: Awaited<ReturnType<typeof scoreJobsStep>>["unprocessedJobs"] = [];
      let scoredJobs: Awaited<ReturnType<typeof scoreJobsStep>>["scoredJobs"] = [];

      if (mergedConfig.enableScoring !== false) {
        ensureNotCancelled();
        const scoringResult = await scoreJobsStep({
          profile,
          shouldCancel: () => cancelRequestedAt !== null,
        });
        unprocessedJobs = scoringResult.unprocessedJobs;
        scoredJobs = scoringResult.scoredJobs;
      } else {
        pipelineLogger.info("Scoring disabled — jobs remain unscored");
        progressHelpers.stageSkipped("Scoring disabled by configuration");
      }

      ensureNotCancelled();
      const jobsToProcess = selectJobsStep({
        scoredJobs,
        mergedConfig,
      });

      pipelineLogger.info("Selected jobs for processing", {
        candidates: jobsToProcess.length,
      });

      // Stage 4: Auto-tailoring (summarize + PDF)
      if (mergedConfig.enableAutoTailoring !== false && jobsToProcess.length > 0) {
        const { processedCount } = await processJobsStep({
          jobsToProcess,
          processJob,
          shouldCancel: () => cancelRequestedAt !== null,
        });
        jobsProcessed = processedCount;
      } else if (jobsToProcess.length > 0) {
        pipelineLogger.info("Auto-tailoring disabled — scored jobs remain unprocessed");
        progressHelpers.stageSkipped("Auto-tailoring disabled by configuration");
      }

      await pipelineRepo.updatePipelineRun(pipelineRun.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        jobsDiscovered,
        jobsProcessed,
      });

      progressHelpers.complete(jobsDiscovered, jobsProcessed);
      pipelineLogger.info("Pipeline run completed", {
        jobsDiscovered,
        jobsProcessed,
      });

      await notifyPipelineWebhookStep("pipeline.completed", {
        pipelineRunId: pipelineRun.id,
        jobsDiscovered,
        jobsScored: unprocessedJobs.length,
        jobsProcessed,
      });

      return {
        success: true,
        jobsDiscovered,
        jobsProcessed,
      };
    } catch (error) {
      if (error instanceof PipelineCancelledError) {
        const message = "Cancelled by user request";
        await pipelineRepo.updatePipelineRun(pipelineRun.id, {
          status: "cancelled",
          completedAt: new Date().toISOString(),
          jobsDiscovered,
          jobsProcessed,
          errorMessage: message,
        });
        progressHelpers.cancelled(message);
        pipelineLogger.info("Pipeline run cancelled", {
          jobsDiscovered,
          jobsProcessed,
        });
        return {
          success: false,
          jobsDiscovered,
          jobsProcessed,
          error: message,
        };
      }

      const message = error instanceof Error ? error.message : "Unknown error";

      await pipelineRepo.updatePipelineRun(pipelineRun.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: message,
      });

      progressHelpers.failed(message);
      pipelineLogger.error("Pipeline run failed", error);

      await notifyPipelineWebhookStep("pipeline.failed", {
        pipelineRunId: pipelineRun.id,
        error: message,
      });

      return {
        success: false,
        jobsDiscovered,
        jobsProcessed,
        error: message,
      };
    } finally {
      isPipelineRunning = false;
      activePipelineRunId = null;
      cancelRequestedAt = null;
    }
  });
}

export type ProcessJobOptions = {
  force?: boolean;
  requestOrigin?: string | null;
  analyticsOrigin?:
    | "move_to_ready"
    | "generate_pdf"
    | "pipeline"
    | "manual_job_create";
};

/**
 * Step 1: Generate AI summary and suggest projects.
 */
export async function summarizeJob(
  jobId: string,
  options?: ProcessJobOptions,
): Promise<{
  success: boolean;
  error?: string;
}> {
  return runWithRequestContext({ jobId }, async () => {
    const jobLogger = logger.child({ jobId });
    jobLogger.info("Summarizing job");
    try {
      const job = await jobsRepo.getJobById(jobId);
      if (!job) return { success: false, error: "Job not found" };

      const profile = await getProfile();

      // 1. Generate Summary & Tailoring
      let tailoredSummary = job.tailoredSummary;
      let tailoredHeadline = job.tailoredHeadline;
      let tailoredSkills = job.tailoredSkills;

      if (!tailoredSummary || !tailoredHeadline || options?.force) {
        jobLogger.info("Generating tailoring content");
        const tailoringResult = await generateTailoring(
          job.jobDescription || "",
          profile,
        );
        if (tailoringResult.success && tailoringResult.data) {
          tailoredSummary = tailoringResult.data.summary;
          tailoredHeadline = tailoringResult.data.headline;
          tailoredSkills = JSON.stringify(tailoringResult.data.skills);
        } else if (options?.force || !tailoredSummary || !tailoredHeadline) {
          return {
            success: false,
            error: `Tailoring failed: ${tailoringResult.error || "unknown error"}`,
          };
        }
      }

      // 2. Suggest Projects
      let selectedProjectIds = job.selectedProjectIds;
      if (!selectedProjectIds || options?.force) {
        jobLogger.info("Selecting projects");
        try {
          const { catalog, selectionItems } =
            extractProjectsFromProfile(profile);
          const overrideResumeProjectsRaw = await getSetting("resumeProjects");
          const { resumeProjects } = resolveResumeProjectsSettings({
            catalog,
            overrideRaw: overrideResumeProjectsRaw,
          });

          const locked = resumeProjects.lockedProjectIds;
          const desiredCount = Math.max(
            0,
            resumeProjects.maxProjects - locked.length,
          );
          const eligibleSet = new Set(resumeProjects.aiSelectableProjectIds);
          const eligibleProjects = selectionItems.filter((p) =>
            eligibleSet.has(p.id),
          );

          const picked = await pickProjectIdsForJob({
            jobDescription: job.jobDescription || "",
            eligibleProjects,
            desiredCount,
          });

          selectedProjectIds = [...locked, ...picked].join(",");
        } catch (error) {
          jobLogger.warn("Failed to suggest projects", error);
        }
      }

      await jobsRepo.updateJob(job.id, {
        tailoredSummary: tailoredSummary ?? undefined,
        tailoredHeadline: tailoredHeadline ?? undefined,
        tailoredSkills: tailoredSkills ?? undefined,
        selectedProjectIds: selectedProjectIds ?? undefined,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      jobLogger.error("Summarization failed", error);
      return { success: false, error: message };
    }
  });
}

/**
 * Step 2: Generate PDF using current summary and project selection.
 */
export async function generateFinalPdf(
  jobId: string,
  options?: ProcessJobOptions,
): Promise<{
  success: boolean;
  error?: string;
}> {
  return runWithRequestContext({ jobId }, async () => {
    const jobLogger = logger.child({ jobId });
    jobLogger.info("Generating final PDF");
    try {
      const job = await jobsRepo.getJobById(jobId);
      if (!job) return { success: false, error: "Job not found" };

      // Mark as processing
      await jobsRepo.updateJob(job.id, { status: "processing" });

      const pdfResult = await generatePdf(
        job.id,
        {
          summary: job.tailoredSummary || "",
          headline: job.tailoredHeadline || "",
          skills: job.tailoredSkills ? JSON.parse(job.tailoredSkills) : [],
        },
        job.jobDescription || "",
        undefined, // deprecated baseResumePath parameter
        job.selectedProjectIds,
        {
          tracerLinksEnabled: job.tracerLinksEnabled,
          requestOrigin: options?.requestOrigin ?? null,
          tracerCompanyName: job.employer ?? null,
        },
      );

      if (!pdfResult.success) {
        // Revert status if failed
        await jobsRepo.updateJob(job.id, { status: "discovered" });
        return { success: false, error: pdfResult.error };
      }

      await jobsRepo.updateJob(job.id, {
        status: "ready",
        pdfPath: pdfResult.pdfPath,
      });

      const analyticsOrigin = options?.analyticsOrigin ?? "move_to_ready";
      const generationKind = job.status === "ready" ? "regenerate" : "initial";
      void trackServerProductEvent(
        "resume_generated",
        {
          origin: analyticsOrigin,
          generation_kind: generationKind,
          tracer_links_enabled: job.tracerLinksEnabled,
          has_tailored_summary: Boolean(job.tailoredSummary),
          has_tailored_skills: Boolean(job.tailoredSkills),
        },
        {
          requestOrigin: options?.requestOrigin ?? null,
          urlPath: "/jobs",
        },
      );

      if (job.status !== "ready") {
        void trackServerProductEvent(
          "job_moved_to_ready",
          {
            origin: analyticsOrigin,
            tracer_links_enabled: job.tracerLinksEnabled,
          },
          {
            requestOrigin: options?.requestOrigin ?? null,
            urlPath: "/jobs",
          },
        );
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      jobLogger.error("PDF generation failed", error);
      return { success: false, error: message };
    }
  });
}

/**
 * Process a single job (runs both steps in sequence).
 */
export async function processJob(
  jobId: string,
  options?: ProcessJobOptions,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Step 1: Summarize & Select Projects
    const sumResult = await summarizeJob(jobId, options);
    if (!sumResult.success) return sumResult;

    // Step 2: Generate PDF
    const pdfResult = await generateFinalPdf(jobId, options);
    return pdfResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Check if pipeline is currently running.
 */
export function getPipelineStatus(): { isRunning: boolean } {
  return { isRunning: isPipelineRunning };
}

export function requestPipelineCancel(): {
  accepted: boolean;
  pipelineRunId: string | null;
  alreadyRequested: boolean;
} {
  if (!isPipelineRunning) {
    return { accepted: false, pipelineRunId: null, alreadyRequested: false };
  }

  const pipelineRunId =
    activePipelineRunId && activePipelineRunId !== "pending"
      ? activePipelineRunId
      : null;

  if (cancelRequestedAt) {
    return {
      accepted: true,
      pipelineRunId,
      alreadyRequested: true,
    };
  }

  cancelRequestedAt = new Date().toISOString();
  return {
    accepted: true,
    pipelineRunId,
    alreadyRequested: false,
  };
}

export function isPipelineCancelRequested(): boolean {
  return cancelRequestedAt !== null;
}
