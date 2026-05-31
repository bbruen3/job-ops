---
id: llm-configuration
title: LLM Configuration
description: Configure LLM providers, models, and per-task overrides for cloud and local models.
sidebar_position: 16
---

## What it is

JobOps supports multiple LLM providers for scoring, tailoring, Ghostwriter, and resume enhancement. You can use cloud models (OpenAI, Gemini, OpenRouter) or local models (Ollama, LM Studio) — or mix both.

## Providers

| Provider | Endpoint | Notes |
|---|---|---|
| **OpenAI** | `https://api.openai.com/v1` | Default: `gpt-5.4-mini` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Access to many models |
| **Ollama** | `http://localhost:11434/v1` | Local models |
| **LM Studio** | `http://localhost:1234/v1` | Local models |
| **Gemini** | `https://generativelanguage.googleapis.com/v1beta` | Google models |
| **OpenAI-compatible** | Any endpoint | Custom servers |

## Configuration

### Global Settings

Set these environment variables or configure in **Settings → LLM Configuration**:

```bash
LLM_PROVIDER=openrouter          # or openai, ollama, gemini, etc.
LLM_API_KEY=your-api-key         # required for cloud providers
LLM_BASE_URL=http://localhost:11434/v1  # for local models
LLM_MODEL=google/gemini-3-flash-preview  # default model
```

### Per-Task Overrides

Each LLM task can use a different model:

| Task | Environment Variable | Purpose |
|---|---|---|
| Job Scoring | `MODEL_SCORER` | Score jobs against your profile |
| Resume Tailoring | `MODEL_TAILORING` | Generate tailored summary/headline |
| Project Selection | `MODEL_PROJECT_SELECTION` | AI-select relevant projects |
| Resume Enhancement | `MODEL_RESUME_ENHANCE` | ATS-optimized tailoring pipeline |

Example:
```bash
# Use cloud for scoring, local for tailoring
MODEL_SCORER=gpt-5.4-mini
MODEL_TAILORING=llama3.1
MODEL_RESUME_ENHANCE=gpt-5.4-mini
```

## Local Model Setup

### Ollama

1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama3.1`
3. Configure JobOps:
   ```bash
   LLM_PROVIDER=openai_compatible
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_MODEL=llama3.1
   LLM_API_KEY=ollama  # or any non-empty string
   ```

### LM Studio

1. Download LM Studio: https://lmstudio.ai
2. Load a model and start the local server
3. Configure JobOps:
   ```bash
   LLM_PROVIDER=openai_compatible
   LLM_BASE_URL=http://localhost:1234/v1
   LLM_MODEL=your-loaded-model
   LLM_API_KEY=lm-studio  # or any non-empty string
   ```

## Testing Connection

Click **"Test Connection"** in Settings → LLM Configuration to verify your endpoint is reachable.

## Usage Tracking

View token usage and estimated costs in **Settings → LLM Usage**:
- Total input/output tokens
- Breakdown by task type
- Estimated cost per provider

## Graceful Degradation

If a local model is unavailable:
- Scoring falls back to keyword matching (no LLM)
- Tailoring shows a clear error message
- Ghostwriter displays a connection warning

If a model lacks structured output support:
- Falls back to text parsing with warnings
- Some features may have reduced accuracy
