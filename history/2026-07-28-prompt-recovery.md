# 2026-07-28 prompt recovery

## Source audit

- `alejoacelas/entropy-ui-chatbot` contained the missing prompt library.
- Commit `bb12808` preserved the distinct 14,735-byte default and 78,353-byte experimental variants.
- Commit `3e76947` published the final 80,023-byte experimental prompt.
- `alejoacelas/aerin-quick-win` contained the current Aerin instructions and the live Resource Portal query service at `https://aerin.bot/query`.

## Changes

- Bundled the historical default, published experimental, and current portal prompt as editable variants.
- Migrated the existing shared workspace to schema 3, replacing only placeholder or prior canonical seed prompts and preserving user-created prompts, cases, and runs.
- Added a server-side Anthropic tool loop that searches the live Resource Portal and returns full articles with canonical links.
- Removed the access-code proxy, login page, authentication API, cookie code, tests, environment setting, and related styles.

## Verification

- Confirmed the bundled and runtime prompt SHA-1 hashes match their source files byte-for-byte: `66eea750…`, `bce523b5…`, and `9c7572b3…`.
- Sent a real Opus 5 request using the 80 KB prompt. The model made two Resource Portal searches and cited the SparkWell FAQ and responsibilities articles.
- Ran lint, unit tests, production build, and desktop/mobile Playwright workflows.
