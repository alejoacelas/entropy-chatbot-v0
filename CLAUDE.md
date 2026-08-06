# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Evaluation System that replaces Promptfoo with a custom solution consisting of:
- **Frontend**: React 19 + TypeScript with shadcn/ui components and Tailwind CSS v4
- **Backend**: Node.js/TypeScript Express API with AI SDK and Anthropic provider

The system allows running batch evaluations of AI prompts with CSV upload, automatic caching, parallel processing with retry logic, and result review capabilities with user ratings.

## Development Commands

### Frontend (from project root)
```bash
npm run dev          # Start Vite dev server on http://localhost:5000
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
- **Production**: Set `REPLIT_DEPLOYMENT=1` to use cloud storage instead of file system

## Architecture

### Backend Structure (`backend/src/`)

**Core Components:**
- `index.ts` - Express server with CORS, routes at `/api` and `/health`
- `routes/evaluation.ts` - API endpoints for evaluations and run management
- `services/evaluationService.ts` - Orchestrates evaluation flow with caching and parallel processing
- `types.ts` - TypeScript interfaces for requests, results, and storage

**Storage Abstraction (`storage/`):**
- `IStorage.ts` - Abstract interface with save/load/list/delete/exists methods
- `FileSystemStorage.ts` - Local file storage for development
- `ObjectStorage.ts` - Google Cloud Storage for production (Replit)
- `StorageFactory.ts` - Environment-based factory (uses `REPLIT_DEPLOYMENT` flag)

**Utilities:**
- `utils/aiClient.ts` - Anthropic API wrapper with exponential backoff retry, web search tools, and extended thinking support
- `utils/cache.ts` - Response cache with SHA-256 keys (cache key = hash of model + systemPrompt + userMessage)
- `utils/csvParser.ts` - CSV parsing to extract prompts
- `utils/runStorage.ts` - Saves/loads evaluation runs, converts to Promptfoo format
- `utils/datasetStorage.ts` - Saves/loads datasets (CSV prompts)
- `utils/promptStorage.ts` - Saves/loads system prompts
- `utils/ratingStorage.ts` - Saves/loads user ratings for evaluation results

**Key Features:**
- Abstracted storage supporting both file system and cloud storage
- Parallel prompt processing with concurrent API calls
- System prompt templates with `{user_message}` placeholder
- Multi-prompt evaluation: compare multiple system prompts against the same dataset
- Saved runs stored as JSON in `backend/runs/` for review
- Saved datasets stored as JSON in `backend/datasets/` for reuse
- Saved system prompts stored as JSON in `backend/saved-prompts/` for reuse
- User ratings stored in `backend/ratings/` for evaluation feedback

### Frontend Structure (`src/`)

**Main Components:**
- `App.tsx` - Tab-based layout with 3 tabs: "Review Results", "Run Evaluation", "Register Prompt"
- `components/EvaluationRunner.tsx` - CSV upload, multi-prompt evaluation execution, results display
- `components/RegisterPrompt.tsx` - System prompt management (create, edit, delete)
- `components/ReviewApp.tsx` - Review existing evaluation results with rating capability
- `api/evaluationApi.ts` - API client for backend communication

**UI Components:**
- `components/ui/` - shadcn/ui components (button, card, tabs, checkbox, alert, badge, textarea, etc.)
- `lib/utils.ts` - Tailwind utility function (cn)

**Key Features:**
- Hardcoded model: `claude-sonnet-4-5-20250929` (defined in `src/constants.ts`)
- Multi-select checkboxes for comparing multiple system prompts
- localStorage persistence for UI state
- Real-time result display with markdown rendering
- Export results as JSON or CSV
- Rating system (1-5 scale with comments) for evaluation results

### API Endpoints

**Evaluation:**
- `POST /api/evaluate` - Run multi-prompt evaluations with dataset
  - Accepts: multipart/form-data with CSV file OR JSON body with `prompts` array
  - Optional params: `model`, `systemPrompts` (array), `runName`, `datasetName`
  - Returns: evaluation results with summary statistics

**Runs:**
- `GET /api/runs` - Lists all saved evaluation run names
- `GET /api/runs/:name` - Returns specific run in Promptfoo-compatible format

**Datasets:**
- `GET /api/datasets` - Lists all saved dataset names
- `GET /api/datasets/:name` - Returns specific dataset with prompts

**System Prompts:**
- `GET /api/prompts` - Lists all saved system prompt names
- `GET /api/prompts/:name` - Returns specific system prompt with content
- `POST /api/prompts` - Saves a new system prompt (body: `{ name, content }`)
- `DELETE /api/prompts/:name` - Deletes a saved system prompt

**Ratings:**
- `POST /api/ratings/load` - Load user rating for specific content
- `POST /api/ratings` - Save user rating (1-5 scale with optional comment)

**Health:**
- `GET /health` - Health check endpoint

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
- Sanitization: `sanitizeRunName()` replaces special characters with underscores for filenames
- Storage factory auto-selects file system vs cloud based on `REPLIT_DEPLOYMENT` environment variable
- 30-minute timeout for long-running evaluations (configurable per request)

### Frontend Patterns
- Model selection is hardcoded to Claude Sonnet 4.5 (imported from `@/constants`)
- System prompts are saved to backend storage for persistence across browsers/users
- React 19 with functional components and hooks
- shadcn/ui components follow Radix UI patterns
- Vite proxy forwards `/api/*` to `http://localhost:3001`

### Caching Strategy
- Cache uses abstract storage (file system in dev, cloud in production)
- Cache hit: Returns instantly without API call
- Cache miss: Calls AI API, saves response to cache
- Cache key includes: model + system prompt + user message

### Retry Logic
- Parallel processing (all prompts evaluated concurrently)
- Exponential backoff on rate limit errors: 1s → 2s → 4s → 8s → 16s
- Up to 5 retry attempts before failing

### AI Client Features
- Streaming API that collects partial responses
- Token usage tracking from finish events
- Optional web search tool integration
- Extended thinking support with 10,000 token budget

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
- File-based storage in development (cloud storage in production)
- Max file upload size: 10MB
- Extended thinking budget: 10,000 tokens
