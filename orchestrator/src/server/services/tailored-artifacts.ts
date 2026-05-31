/**
 * Separate artifact storage for tailored resumes.
 *
 * Each tailored output is a standalone artifact — the base Resume Studio
 * document is never modified. Artifacts store:
 * - Input resume snapshot
 * - Extracted keywords
 * - Role classification
 * - Keyword injection diff
 * - PDF path
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RoleClassification } from "./ats-tailoring";

export interface TailoredArtifact {
  /** Unique artifact identifier */
  id: string;
  /** Job ID this artifact was created for */
  jobId: string;
  /** When the artifact was created */
  createdAt: string;
  /** Input resume snapshot (for diff comparison) */
  inputSnapshot: {
    summary: string;
    experience: string[];
    projects: string[];
  };
  /** Extracted keywords from JD */
  keywords: string[];
  /** Role classification */
  classification: RoleClassification | null;
  /** Keywords that weren't found in original CV */
  flaggedKeywords: string[];
  /** Paper format used */
  paperFormat: "letter" | "a4";
  /** Path to generated PDF (null if not yet generated) */
  pdfPath: string | null;
  /** Summary rewrite */
  summary: string;
  /** Competency grid */
  competencyGrid: string[];
}

const ARTIFACTS_DIR = "data/tailored-artifacts";

/**
 * Save a tailored artifact to disk.
 */
export async function saveArtifact(
  artifact: TailoredArtifact,
): Promise<string> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const filePath = join(ARTIFACTS_DIR, `${artifact.id}.json`);
  await writeFile(filePath, JSON.stringify(artifact, null, 2));
  return filePath;
}

/**
 * Load a tailored artifact from disk.
 */
export async function loadArtifact(
  artifactId: string,
): Promise<TailoredArtifact | null> {
  try {
    const filePath = join(ARTIFACTS_DIR, `${artifactId}.json`);
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data) as TailoredArtifact;
  } catch {
    return null;
  }
}

/**
 * List all artifacts for a specific job.
 */
export async function listArtifactsForJob(
  jobId: string,
): Promise<TailoredArtifact[]> {
  try {
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(ARTIFACTS_DIR).filter(
      (f) => f.endsWith(".json") && !f.startsWith("."),
    );

    const artifacts: TailoredArtifact[] = [];
    for (const file of files) {
      const data = await readFile(join(ARTIFACTS_DIR, file), "utf-8");
      const artifact = JSON.parse(data) as TailoredArtifact;
      if (artifact.jobId === jobId) {
        artifacts.push(artifact);
      }
    }

    return artifacts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Create a new artifact from pipeline results.
 */
export async function createArtifact(
  jobId: string,
  pipelineResult: {
    artifactId: string;
    keywords: string[];
    classification: RoleClassification | null;
    flaggedKeywords: string[];
    paperFormat: "letter" | "a4";
    summary: string;
    competencyGrid: string[];
  },
  inputSnapshot: {
    summary: string;
    experience: string[];
    projects: string[];
  },
): Promise<TailoredArtifact> {
  const artifact: TailoredArtifact = {
    id: pipelineResult.artifactId,
    jobId,
    createdAt: new Date().toISOString(),
    inputSnapshot,
    keywords: pipelineResult.keywords,
    classification: pipelineResult.classification,
    flaggedKeywords: pipelineResult.flaggedKeywords,
    paperFormat: pipelineResult.paperFormat,
    pdfPath: null,
    summary: pipelineResult.summary,
    competencyGrid: pipelineResult.competencyGrid,
  };

  await saveArtifact(artifact);
  return artifact;
}

/**
 * Update an artifact's PDF path after generation.
 */
export async function updateArtifactPdfPath(
  artifactId: string,
  pdfPath: string,
): Promise<void> {
  const artifact = await loadArtifact(artifactId);
  if (artifact) {
    artifact.pdfPath = pdfPath;
    await saveArtifact(artifact);
  }
}
