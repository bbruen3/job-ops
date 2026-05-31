---
id: ats-optimization
title: ATS-Optimized Resume Tailoring
description: 7-step pipeline for tailoring resumes to specific job descriptions with keyword injection, role classification, and ATS compatibility.
sidebar_position: 15
---

## What it is

ATS-Optimized Resume Tailoring is a 7-step pipeline that generates job-specific resume artifacts. It extracts keywords from the JD, classifies the role, rewrites your summary, reorders experience bullets, and verifies keyword injection — all while never modifying your base Resume Studio document.

The pipeline produces a **separate artifact per job** — you can tailor for multiple jobs simultaneously without conflicts.

## The 7-Step Pipeline

1. **Keyword Extraction** — Extracts 15-20 keyword phrases from the job description
2. **Role Classification** — Classifies the role with concrete, matchable emphasisAreas
3. **Summary Rewrite** — Injects top 5 JD keywords into your Professional Summary
4. **Project Selection** — Selects 3-4 most relevant projects using emphasisAreas matching
5. **Bullet Reordering** — Reorders experience bullets by JD relevance (most relevant first)
6. **Competency Grid** — Generates 6-8 keyword phrases for the competency section
7. **Keyword Injection** — Rewrites bullets to incorporate JD vocabulary (NEVER invents)

## How to use

1. Open **Resume Studio** and ensure your base resume is up to date
2. Go to a job in the **Orchestrator** or **In Progress Board**
3. Click **"Tailor for this job"**
4. Watch the progress indicator as the pipeline runs
5. Review flagged keywords (if any) and approve/reject
6. Download the tailored PDF

## Keyword Verification

After the pipeline runs, any keywords that weren't found in your original CV are flagged for review. You must approve, reject, or edit flagged keywords before the PDF is generated.

This ensures no fabricated experience enters your resume.

## Paper Format

The system automatically detects the company location from the JD and selects the appropriate paper format:

- **US/Canada** → Letter (8.5in × 11in)
- **Rest of world** → A4 (210mm × 297mm)

## Configuration

### Model Override

Set `MODEL_RESUME_ENHANCE` to use a different model for the tailoring pipeline:

```bash
# Use a local model for resume tailoring
MODEL_RESUME_ENHANCE=llama3.1

# Use a cloud model
MODEL_RESUME_ENHANCE=gpt-5.4-mini
```

### Writing Style

The tailoring pipeline respects your existing Writing Style settings (tone, formality, constraints). Update these in **Settings → Writing Style**.

## Architecture

```
Resume Studio (base document) + Job Description
        ↓
7-Step Pipeline (LLM calls)
        ↓
Tailored Artifact (separate from base)
  - keywords: string[]
  - classification: RoleClassification
  - summary: string
  - competencyGrid: string[]
  - flaggedKeywords: string[]
  - paperFormat: "letter" | "a4"
        ↓
ATS-Optimized PDF
```

The base Resume Studio document is **never modified** by the tailoring pipeline. Each tailored output is a standalone artifact stored in `data/tailored-artifacts/`.

## Differences from Standard Tailoring

| Feature | Standard Tailoring | ATS-Optimized |
|---|---|---|
| Summary rewrite | ✅ | ✅ + JD keywords |
| Skills section | ✅ | ✅ + competency grid |
| Project selection | ✅ | ✅ + emphasisAreas matching |
| Bullet reordering | ❌ | ✅ by JD relevance |
| Keyword injection | ❌ | ✅ with verification |
| Role classification | ❌ | ✅ open-ended |
| ATS text normalization | ❌ | ✅ Unicode→ASCII |
| Paper format detection | ❌ | ✅ US/CA → letter |
