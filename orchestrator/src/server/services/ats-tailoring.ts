/**
 * ATS-Optimized Resume Tailoring Service
 *
 * Implements a 7-step pipeline for tailoring resumes to specific job descriptions:
 * 1. Keyword extraction (15-20 JD keywords)
 * 2. Role classification (open-ended, matchable emphasisAreas)
 * 3. Professional Summary rewrite (inject top 5 keywords)
 * 4. Project selection (emphasisAreas substring matching)
 * 5. Experience bullet reordering (by JD relevance)
 * 6. Competency grid generation (6-8 keyword phrases)
 * 7. Keyword injection (reword bullets, NEVER invent)
 *
 * The output is a separate artifact per job — the base Resume Studio document is never modified.
 */

import { logger } from "@infra/logger";
import type { ResumeProfile } from "@shared/types";
import { LlmService } from "./llm/service";
import type { JsonSchemaDefinition } from "./llm/types";
import { resolveLlmModel } from "./modelSelection";
import { normalizeTextForATS } from "./resume-renderer/ats-normalization";
import { detectCompanyLocation } from "./resume-renderer/ats-normalization";

// --- Types ---

export interface RoleClassification {
  roleSummary: string;
  skillDomains: string[];
  seniorityLevel: string;
  workStyle: string[];
  depthBreadth: string;
  emphasisAreas: string[];
}

export interface KeywordExtractionResult {
  keywords: string[];
}

export interface TailoringPipelineInput {
  jobDescription: string;
  profile: ResumeProfile;
  jobId: string;
}

export interface TailoringPipelineStepResult {
  step: string;
  status: "completed" | "failed";
  result?: unknown;
  error?: string;
}

export interface TailoringPipelineResult {
  success: boolean;
  artifactId: string;
  steps: TailoringPipelineStepResult[];
  keywords: string[];
  classification: RoleClassification | null;
  summary: string;
  competencyGrid: string[];
  flaggedKeywords: string[];
  paperFormat: "letter" | "a4";
  error?: string;
}

// --- JSON Schemas ---

const KEYWORD_EXTRACTION_SCHEMA: JsonSchemaDefinition = {
  name: "keyword_extraction",
  schema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "15-20 keyword phrases from the job description",
      },
    },
    required: ["keywords"],
    additionalProperties: false,
  },
};

const ROLE_CLASSIFICATION_SCHEMA: JsonSchemaDefinition = {
  name: "role_classification",
  schema: {
    type: "object",
    properties: {
      roleSummary: {
        type: "string",
        description: "1-2 sentence summary of what the role primarily does",
      },
      skillDomains: {
        type: "array",
        items: { type: "string" },
        description: "Key skill domains mentioned in the JD",
      },
      seniorityLevel: {
        type: "string",
        description: "Seniority signal: senior, staff, lead, principal, junior, etc.",
      },
      workStyle: {
        type: "array",
        items: { type: "string" },
        description: "Work style signals: collaborative, independent, client-facing, etc.",
      },
      depthBreadth: {
        type: "string",
        description: "Technical depth vs breadth: deep specialist, generalist, T-shaped",
      },
      emphasisAreas: {
        type: "array",
        items: { type: "string" },
        description: "Concrete, specific emphasis areas that can be matched against project descriptions via substring/keyword overlap. Do NOT use vague terms like 'technical depth' or 'system design'. Use specific terms like 'timing closure', 'RAG pipeline', 'latency reduction'.",
      },
    },
    required: ["roleSummary", "skillDomains", "seniorityLevel", "emphasisAreas"],
    additionalProperties: false,
  },
};

const SUMMARY_REWRITE_SCHEMA: JsonSchemaDefinition = {
  name: "summary_rewrite",
  schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Rewritten professional summary with JD keywords injected",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
};

const COMPETENCY_GRID_SCHEMA: JsonSchemaDefinition = {
  name: "competency_grid",
  schema: {
    type: "object",
    properties: {
      competencies: {
        type: "array",
        items: { type: "string" },
        description: "6-8 keyword phrases from JD requirements for the competency grid",
      },
    },
    required: ["competencies"],
    additionalProperties: false,
  },
};

const BULLET_REORDERING_SCHEMA: JsonSchemaDefinition = {
  name: "bullet_reordering",
  schema: {
    type: "object",
    properties: {
      reorderedBullets: {
        type: "array",
        items: { type: "string" },
        description: "Experience bullets reordered by JD relevance (most relevant first)",
      },
    },
    required: ["reorderedBullets"],
    additionalProperties: false,
  },
};

const KEYWORD_INJECTION_SCHEMA: JsonSchemaDefinition = {
  name: "keyword_injection",
  schema: {
    type: "object",
    properties: {
      injectedBullets: {
        type: "array",
        items: { type: "string" },
        description: "Experience bullets with JD keywords naturally injected",
      },
    },
    required: ["injectedBullets"],
    additionalProperties: false,
  },
};

// --- Pipeline Steps ---

/**
 * Step 1: Extract 15-20 keywords from the job description.
 */
export async function extractKeywords(
  jd: string,
): Promise<{ success: boolean; keywords: string[]; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const result = await llm.callJson<KeywordExtractionResult>({
    model,
    messages: [
      {
        role: "user",
        content: `Extract 15-20 keyword phrases from this job description that represent the core requirements and skills. These will be used for resume tailoring.

Job Description:
${jd}

Output the keywords as a JSON array of strings. Each keyword should be a short phrase (2-4 words).`,
      },
    ],
    jsonSchema: KEYWORD_EXTRACTION_SCHEMA,
  });

  if (!result.success) {
    return { success: false, keywords: [], error: result.error };
  }

  return { success: true, keywords: result.data.keywords };
}

/**
 * Step 2: Classify the role with open-ended emphasisAreas.
 */
export async function classifyRole(
  jd: string,
): Promise<{ success: boolean; classification: RoleClassification | null; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const result = await llm.callJson<RoleClassification>({
    model,
    messages: [
      {
        role: "user",
        content: `Classify this job description into a structured role profile. Be specific and concrete.

Job Description:
${jd}

IMPORTANT for emphasisAreas: Use specific, concrete terms that can be matched against project descriptions via substring/keyword overlap. Do NOT use vague terms like "technical depth" or "system design". Use specific terms like "timing closure", "RAG pipeline", "latency reduction", "DRC/LVS signoff".`,
      },
    ],
    jsonSchema: ROLE_CLASSIFICATION_SCHEMA,
  });

  if (!result.success) {
    return { success: false, classification: null, error: result.error };
  }

  return { success: true, classification: result.data };
}

/**
 * Step 3: Rewrite Professional Summary with JD keywords.
 */
export async function rewriteSummary(
  currentSummary: string,
  jd: string,
  keywords: string[],
  classification: RoleClassification,
): Promise<{ success: boolean; summary: string; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const top5Keywords = keywords.slice(0, 5);

  const result = await llm.callJson<{ summary: string }>({
    model,
    messages: [
      {
        role: "user",
        content: `Rewrite the professional summary below to incorporate the top 5 JD keywords while preserving the candidate's authentic experience.

RULES:
- NEVER add skills or experience the candidate does not have
- ONLY reword existing experience using the JD vocabulary
- Keep the summary concise (3-4 sentences)
- Maintain the candidate's authentic voice

Current Summary:
${currentSummary}

JD Keywords (top 5 to incorporate):
${top5Keywords.join(", ")}

Role Context:
${classification.roleSummary}`,
      },
    ],
    jsonSchema: SUMMARY_REWRITE_SCHEMA,
  });

  if (!result.success) {
    return { success: false, summary: currentSummary, error: result.error };
  }

  return { success: true, summary: result.data.summary };
}

/**
 * Step 4: Select projects using emphasisAreas substring matching.
 */
export function selectProjects(
  projects: Array<{ name: string; description: string; keywords?: string[] }>,
  emphasisAreas: string[],
): Array<{ name: string; description: string; keywords?: string[] }> {
  // Score each project by emphasisAreas substring match
  const scored = projects.map((project) => {
    const projectText = `${project.name} ${project.description} ${(project.keywords || []).join(" ")}`.toLowerCase();
    const score = emphasisAreas.reduce((acc, area) => {
      const areaWords = area.toLowerCase().split(/\s+/);
      const matchCount = areaWords.filter((w) => projectText.includes(w)).length;
      return acc + matchCount;
    }, 0);
    return { project, score };
  });

  // Sort by score descending, return top 3-4
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.project);
}

/**
 * Step 5: Reorder experience bullets by JD relevance.
 */
export async function reorderBullets(
  bullets: string[],
  jd: string,
  keywords: string[],
): Promise<{ success: boolean; reordered: string[]; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const result = await llm.callJson<{ reorderedBullets: string[] }>({
    model,
    messages: [
      {
        role: "user",
        content: `Reorder these experience bullets by relevance to the job description. Most relevant bullets first.

JD Keywords: ${keywords.join(", ")}

Current bullets:
${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Job Description:
${jd}`,
      },
    ],
    jsonSchema: BULLET_REORDERING_SCHEMA,
  });

  if (!result.success) {
    return { success: false, reordered: bullets, error: result.error };
  }

  return { success: true, reordered: result.data.reorderedBullets };
}

/**
 * Step 6: Generate competency grid (6-8 keyword phrases).
 */
export async function generateCompetencyGrid(
  jd: string,
  keywords: string[],
): Promise<{ success: boolean; competencies: string[]; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const result = await llm.callJson<{ competencies: string[] }>({
    model,
    messages: [
      {
        role: "user",
        content: `Generate 6-8 keyword phrases from the job description for a competency grid. These should be the most important skills/technologies from the JD.

Job Description:
${jd}

Extracted Keywords: ${keywords.join(", ")}`,
      },
    ],
    jsonSchema: COMPETENCY_GRID_SCHEMA,
  });

  if (!result.success) {
    return { success: false, competencies: [], error: result.error };
  }

  return { success: true, competencies: result.data.competencies };
}

/**
 * Step 7: Inject keywords into experience bullets (NEVER invent).
 */
export async function injectKeywords(
  bullets: string[],
  jd: string,
  keywords: string[],
): Promise<{ success: boolean; injected: string[]; error?: string }> {
  const model = await resolveLlmModel("resumeEnhance");
  const llm = new LlmService();

  const result = await llm.callJson<{ injectedBullets: string[] }>({
    model,
    messages: [
      {
        role: "user",
        content: `Reword these experience bullets to naturally incorporate JD vocabulary.

CRITICAL RULE: NEVER add skills or experience the candidate does not have. ONLY reword existing experience using the exact JD vocabulary.

If a bullet says "built ML pipeline" and the JD mentions "RAG pipelines", rewrite to "built RAG pipelines" only if the candidate actually did this work.

JD Keywords: ${keywords.join(", ")}

Current bullets:
${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
      },
    ],
    jsonSchema: KEYWORD_INJECTION_SCHEMA,
  });

  if (!result.success) {
    return { success: false, injected: bullets, error: result.error };
  }

  return { success: true, injected: result.data.injectedBullets };
}

// --- Diff Verification ---

/**
 * Verify keyword injection with post-generation diff and length floor.
 *
 * - Tokens >= 4 characters: fuzzy match (Levenshtein distance <= 2 or substring match)
 * - Tokens < 4 characters: exact match only
 *
 * Returns flagged keywords that don't match the original CV text.
 */
export function verifyKeywordInjection(
  originalText: string,
  injectedText: string,
  keywords: string[],
): string[] {
  const originalLower = originalText.toLowerCase();
  const flagged: string[] = [];

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const tokens = keywordLower.split(/\s+/).filter((t) => t.length > 0);

    const allMatched = tokens.every((token) => {
      if (token.length < 4) {
        // Short token: exact match only
        return originalLower.includes(token);
      }
      // Long token: fuzzy match
      return fuzzyMatch(originalLower, token);
    });

    if (!allMatched) {
      flagged.push(keyword);
    }
  }

  return flagged;
}

function fuzzyMatch(text: string, token: string): boolean {
  // Check exact substring match first
  if (text.includes(token)) {
    return true;
  }

  // Check Levenshtein distance <= 2
  for (let i = 0; i <= text.length - token.length + 2; i++) {
    const window = text.substring(
      Math.max(0, i - 2),
      Math.min(text.length, i + token.length + 2),
    );
    if (levenshteinDistance(window, token) <= 2) {
      return true;
    }
  }

  return false;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

// --- Main Pipeline ---

/**
 * Run the full 7-step ATS-optimized tailoring pipeline.
 *
 * Returns a separate artifact per job — the base Resume Studio document is never modified.
 */
export async function runTailoringPipeline(
  input: TailoringPipelineInput,
): Promise<TailoringPipelineResult> {
  const { jobDescription, profile, jobId } = input;
  const artifactId = `tailored-${jobId}-${Date.now()}`;
  const steps: TailoringPipelineStepResult[] = [];

  logger.info("Starting ATS-optimized tailoring pipeline", {
    artifactId,
    jobId,
  });

  // Step 1: Extract keywords
  const keywordsResult = await extractKeywords(jobDescription);
  steps.push({
    step: "keyword_extraction",
    status: keywordsResult.success ? "completed" : "failed",
    result: keywordsResult.keywords,
    error: keywordsResult.error,
  });

  if (!keywordsResult.success) {
    return {
      success: false,
      artifactId,
      steps,
      keywords: [],
      classification: null,
      summary: "",
      competencyGrid: [],
      flaggedKeywords: [],
      paperFormat: "a4",
      error: keywordsResult.error,
    };
  }

  const keywords = keywordsResult.keywords;

  // Step 2: Classify role
  const classificationResult = await classifyRole(jobDescription);
  steps.push({
    step: "role_classification",
    status: classificationResult.success ? "completed" : "failed",
    result: classificationResult.classification,
    error: classificationResult.error,
  });

  const classification = classificationResult.classification;

  // Step 3: Rewrite summary
  const currentSummary = profile.basics?.summary || "";
  const summaryResult = await rewriteSummary(
    currentSummary,
    jobDescription,
    keywords,
    classification || {
      roleSummary: "",
      skillDomains: [],
      seniorityLevel: "senior",
      workStyle: [],
      depthBreadth: "T-shaped",
      emphasisAreas: [],
    },
  );
  steps.push({
    step: "summary_rewrite",
    status: summaryResult.success ? "completed" : "failed",
    result: summaryResult.summary,
    error: summaryResult.error,
  });

  // Step 4: Select projects (no LLM call - substring matching)
  const projects = profile.sections?.projects?.items || [];
  const selectedProjects = classification?.emphasisAreas
    ? selectProjects(projects, classification.emphasisAreas)
    : projects.slice(0, 4);
  steps.push({
    step: "project_selection",
    status: "completed",
    result: selectedProjects.map((p) => p.name),
  });

  // Step 5: Reorder bullets (for first experience entry)
  const experience = profile.sections?.experience?.items || [];
  let reorderedBullets: string[] = [];
  if (experience.length > 0 && experience[0].summary) {
    const bullets = experience[0].summary.split("\n").filter((b) => b.trim());
    const reorderResult = await reorderBullets(
      bullets,
      jobDescription,
      keywords,
    );
    steps.push({
      step: "bullet_reordering",
      status: reorderResult.success ? "completed" : "failed",
      result: reorderResult.reordered,
      error: reorderResult.error,
    });
    reorderedBullets = reorderResult.reordered;
  } else {
    steps.push({
      step: "bullet_reordering",
      status: "completed",
      result: [],
    });
  }

  // Step 6: Generate competency grid
  const gridResult = await generateCompetencyGrid(jobDescription, keywords);
  steps.push({
    step: "competency_grid",
    status: gridResult.success ? "completed" : "failed",
    result: gridResult.competencies,
    error: gridResult.error,
  });

  // Step 7: Inject keywords
  const allBullets = experience.flatMap((e) =>
    (e.summary || "").split("\n").filter((b) => b.trim()),
  );
  const injectionResult = await injectKeywords(
    allBullets.length > 0 ? allBullets : reorderedBullets,
    jobDescription,
    keywords,
  );
  steps.push({
    step: "keyword_injection",
    status: injectionResult.success ? "completed" : "failed",
    result: injectionResult.injected,
    error: injectionResult.error,
  });

  // Verify keyword injection
  const originalText = experience
    .map((e) => e.summary || "")
    .join("\n");
  const injectedText = injectionResult.injected.join("\n");
  const flaggedKeywords = verifyKeywordInjection(
    originalText,
    injectedText,
    keywords,
  );

  // Detect paper format
  const location = detectCompanyLocation(jobDescription);
  const paperFormat = location === "US" || location === "CA" ? "letter" : "a4";

  const allStepsCompleted = steps.every((s) => s.status === "completed");

  logger.info("ATS-optimized tailoring pipeline completed", {
    artifactId,
    stepsCompleted: steps.filter((s) => s.status === "completed").length,
    totalSteps: steps.length,
    flaggedKeywords: flaggedKeywords.length,
    paperFormat,
  });

  return {
    success: allStepsCompleted,
    artifactId,
    steps,
    keywords,
    classification,
    summary: summaryResult.summary || currentSummary,
    competencyGrid: gridResult.competencies,
    flaggedKeywords,
    paperFormat,
    error: steps.find((s) => s.status === "failed")?.error,
  };
}
