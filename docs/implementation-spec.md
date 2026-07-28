# Entropy Lab rebuild

## Outcome

A user can ask a real question, keep it as a test case by default, and compare any saved cases across prompt variants and models without naming or configuring a run first.

## Product rules

- Capture playground inputs by default. The capture state remains visible beside the page title.
- Treat a run as the product of selected cases × prompts × models. Show this arithmetic before spending tokens.
- Default to Claude Opus 5 while keeping every model returned by Anthropic selectable.
- Name and save runs automatically. Naming is optional organization, not a prerequisite.
- Keep cases visible and reorderable before a run. Accept pasted lines, CSV, JSON, JSONL, and text.
- Keep prompt variants editable in the same app.
- Show results as a case-by-variant matrix. Preserve the complete output behind each preview.
- Limit model calls to four concurrent requests to reduce rate-limit failures.

## Architecture

- Next.js app and API routes deploy as one Vercel project.
- Anthropic’s Models API supplies the available model list; the Messages API generates chat and experiment responses.
- Every model call receives a `search_resource_portal` tool backed by Aerin’s current article index. The model can retrieve full articles and canonical citations during chat or evaluations.
- The prompt library starts with the original 14.7 KB default, the original 80 KB experimental prompt, and Aerin’s current portal instructions.
- SparkWell, Resource Portal, and Anti Entropy questions force a portal lookup. Other questions leave the tool available to the model.
- Results record portal search counts and queries. The selected system prompt is sent and snapshotted byte-for-byte; tool configuration remains a separate platform capability.
- The app opens directly without a password or access-code screen.
- The public generation API limits each forwarded IP to 120 requests per 10 minutes.
- A private Vercel Blob stores prompts, cases, and run summaries. Each completion is checkpointed separately, so accumulated results cannot push the workspace past Vercel’s request limit.
- Runs snapshot their case text, prompt content, and model labels. Editing the library cannot rewrite history.
- Blob reads bypass cache and workspace edits reject stale writes instead of silently overwriting newer state.
- Local development falls back to process memory.

## Acceptance checks

- Capture can be disabled before sending and re-enabled without losing prior cases.
- Captured messages enter the Inbox; unsaved messages do not.
- Cases can be pasted, imported, removed from a set, dragged, or moved with buttons.
- At least one prompt and model are required; the run button shows the exact completion count.
- A completed run appears as a matrix and remains in Library → Runs.
- Any old run can be reopened with its original cases, prompts, models, and full outputs.
- Captured cases can be assigned to multiple sets from Library → Test sets.
- Prompt variants can be created and edited.
- A Resource Portal question triggers a live portal search and returns canonical article links.
- The app and APIs open without a password, cookie, or access-code redirect.
- Desktop and mobile layouts expose the main transitions.
