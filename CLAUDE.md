# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Evaluation System that replaces Promptfoo with a custom solution consisting of:
- **Frontend**: React 19 + TypeScript with shadcn/ui components and Tailwind CSS
- **Backend**: Node.js/TypeScript Express API with AI SDK and Anthropic provider

The system allows running batch evaluations of AI prompts with CSV upload, automatic caching, rate limiting, and result review capabilities.

## Development Commands

### Frontend (from project root)
```bash
npm run dev          # Start Vite dev server on http://localhost:5173
npm run build        # Build frontend for production (runs tsc -b && vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend (from backend/ directory)
```bash
cd backend
npm run dev          # Start backend with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled production build from dist/
```

### Environment Setup
- **Backend**: Requires `backend/.env` with `ANTHROPIC_API_KEY`
- **Frontend**: Optional `VITE_API_URL` (defaults to http://localhost:3001)

## Architecture

### Backend Structure (`backend/src/`)

**Core Components:**
- `index.ts` - Express server with CORS, routes at `/api` and `/health`
- `routes/evaluation.ts` - API endpoints for evaluations and run management
- `services/evaluationService.ts` - Orchestrates evaluation flow with caching
- `types.ts` - TypeScript interfaces for requests, results, and storage

**Utilities:**
- `utils/aiClient.ts` - Anthropic API wrapper with exponential backoff retry (5 attempts: 1s, 2s, 4s, 8s, 16s delays)
- `utils/cache.ts` - File-based response cache with SHA-256 keys (cache key = hash of model + systemPrompt + userMessage)
- `utils/csvParser.ts` - CSV parsing to extract prompts
- `utils/runStorage.ts` - Saves/loads evaluation runs, converts to Promptfoo format
- `utils/datasetStorage.ts` - Saves/loads datasets (CSV prompts)
- `utils/promptStorage.ts` - Saves/loads system prompts

**Key Features:**
- File-based caching in `backend/cache/` to avoid redundant API calls
- Sequential prompt processing to respect rate limits
- System prompt templates with `{user_message}` placeholder in `backend/prompts/system.txt`
- Saved runs stored as JSON in `backend/runs/` for review
- Saved datasets stored as JSON in `backend/datasets/` for reuse
- Saved system prompts stored as JSON in `backend/saved-prompts/` for reuse

### Frontend Structure (`src/`)

**Main Components:**
- `App.tsx` - Tab-based layout with "Run Evaluation" and "Review Results" tabs
- `components/EvaluationRunner.tsx` - CSV upload, evaluation execution, results display
- `ReviewApp.tsx` - Review existing evaluation results (Promptfoo-compatible)
- `api/evaluationApi.ts` - API client for backend communication

**UI Components:**
- `components/ui/` - shadcn/ui components (Button, Card, Tabs, etc.)
- `lib/utils.ts` - Tailwind utility function (cn)

**Key Features:**
- Hardcoded model: `claude-sonnet-4-5-20250929` (see `EvaluationRunner.tsx:13`)
- localStorage persistence for system prompts
- Real-time result display with markdown rendering
- Export results as JSON or CSV

### API Endpoints

**POST /api/evaluate**
- Accepts: multipart/form-data with CSV file OR JSON body with `prompts` array
- Optional params: `model`, `systemPrompt`, `runName`
- Returns: evaluation results with summary statistics

**GET /api/runs**
- Lists all saved evaluation run names

**GET /api/runs/:name**
- Returns specific run in Promptfoo-compatible format

**GET /api/datasets**
- Lists all saved dataset names

**GET /api/datasets/:name**
- Returns specific dataset with prompts

**GET /api/prompts**
- Lists all saved system prompt names

**GET /api/prompts/:name**
- Returns specific system prompt with content

**POST /api/prompts**
- Saves a new system prompt (body: `{ name, content }`)

**DELETE /api/prompts/:name**
- Deletes a saved system prompt

**GET /health**
- Health check endpoint

### Path Aliases

**Frontend**: `@/*` maps to `./src/*` (configured in tsconfig.json)

**Backend**: Uses ESNext modules with `.js` extensions in imports (even for .ts files)

## Important Implementation Details

### Backend Patterns
- All backend files use ES modules (`type: "module"` in package.json)
- Imports use `.js` extensions even for TypeScript files (e.g., `from './types.js'`)
- Cache keys are deterministic SHA-256 hashes for consistent caching
- Error handling includes retry logic for rate limits, graceful degradation for cache misses
- System prompts are templates where `{user_message}` gets replaced with each prompt
- Sanitization fix: `listRuns()`, `listDatasets()`, and `listPrompts()` read original names from JSON files instead of reversing sanitization

### Frontend Patterns
- Model selection is hardcoded to Claude Sonnet 4.5 (imported from `@/constants`)
- System prompts are saved to backend storage for persistence across browsers/users
- React 19 with functional components and hooks
- shadcn/ui components follow Radix UI patterns

### Caching Strategy
- Cache directory: `backend/cache/`
- Cache hit: Returns instantly without API call
- Cache miss: Calls AI API, saves response to cache
- Cache key includes: model + system prompt + user message

### Rate Limiting
- Sequential processing (one prompt at a time)
- Exponential backoff on rate limit errors: 1s → 2s → 4s → 8s → 16s
- Up to 5 retry attempts before failing

## CSV Format

CSV files must have a `prompt` column (case-insensitive). Example:
```csv
prompt
What is artificial intelligence?
Explain machine learning in simple terms
```

## Testing Notes

- No test framework currently configured
- Manual testing through UI or API endpoints
- Use curl for API testing (see README.md examples)

## Known Constraints

- Model is hardcoded in frontend (requires code change to modify)
- Sequential processing limits throughput but respects rate limits
- File-based storage for cache and runs (not database-backed)
- Max file upload size: 10MB
