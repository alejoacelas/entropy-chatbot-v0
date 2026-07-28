# Entropy Lab rebuild

## Outcome

A user can ask a real question, keep it as a test case by default, and compare any saved cases across prompt variants and models without naming or configuring a run first.

## Product rules

- Capture playground inputs by default. The capture state remains visible beside the page title.
- Treat a run as the product of selected cases × prompts × models. Show this arithmetic before spending tokens.
- Name and save runs automatically. Naming is optional organization, not a prerequisite.
- Keep cases visible and reorderable before a run. Accept pasted lines, CSV, JSON, JSONL, and text.
- Keep prompt variants editable in the same app.
- Show results as a case-by-variant matrix. Preserve the complete output behind each preview.
- Limit model calls to four concurrent requests to reduce rate-limit failures.

## Architecture

- Next.js app and API routes deploy as one Vercel project.
- Anthropic’s Models API supplies the available model list; the Messages API generates chat and experiment responses.
- A private Vercel Blob stores the workspace. Local development falls back to process memory.
- The workspace schema is versioned. It contains prompts, cases, sets, chat messages, and runs.

## Acceptance checks

- Capture can be disabled before sending and re-enabled without losing prior cases.
- Captured messages enter the Inbox; unsaved messages do not.
- Cases can be pasted, imported, removed from a set, dragged, or moved with buttons.
- At least one prompt and model are required; the run button shows the exact completion count.
- A completed run appears as a matrix and remains in Library → Runs.
- Prompt variants can be created and edited.
- Desktop and mobile layouts expose the main transitions.
