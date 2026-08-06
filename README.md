<!--ai-->
# Entropy Lab

Chat, collect test cases, and compare prompt and model variants in one Vercel-native workspace. Claude Opus 5 is the default model.

## Run locally

```sh
cp .env.example .env.local
# Add ANTHROPIC_API_KEY
npm install
npm run dev
```

Without `BLOB_READ_WRITE_TOKEN`, local data lives in process memory and resets when the dev server restarts. Production uses a private Vercel Blob store.

## Verify

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deploy

```sh
vercel link
vercel blob create-store entropy-lab-data --access private
vercel --prod
```

Set `ANTHROPIC_API_KEY` for Production, Preview, and Development. Vercel creates `BLOB_READ_WRITE_TOKEN` when the Blob store is connected.

The three bundled Aerin variants come from the original `entropy-ui-chatbot` prompt history and the current prompt hosted at [aerin.bot/llm](https://aerin.bot/llm). Every model call can search the live Anti Entropy Resource Portal through [aerin.bot/query](https://aerin.bot/query?q=fiscal+sponsorship).

See [the implementation spec](docs/implementation-spec.md) and [rebuild history](history/2026-07-28-rebuild.md).
<!--/ai-->
