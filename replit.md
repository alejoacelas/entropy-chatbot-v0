# AI Evaluation System

## Overview

A full-stack web application for evaluating AI prompts across different datasets using Claude (Anthropic). The system allows users to register custom system prompts, run evaluations on CSV datasets, and review/rate the results. Built with React (frontend) and Express/Node.js (backend), the application provides a complete workflow for systematic AI prompt testing with caching, persistent storage, and collaborative rating features.

**Last Updated:** November 10, 2025

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 19** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- Path aliasing configured (`@/*` → `./src/*`) for cleaner imports across the application
- Runs on **port 5000** with allowed hosts configuration for Replit environment

**UI Component System**
- **shadcn/ui** components built on Radix UI primitives for accessible, customizable interface elements
- **Tailwind CSS v4** for utility-first styling with CSS variables for theming
- Component library includes: cards, buttons, sliders, select dropdowns, progress bars, text areas, badges, checkboxes, tabs, and scroll areas
- "New York" style variant selected for shadcn components with neutral base color scheme
- Dark mode support via CSS custom properties and variant system

**State Management**
- Local React state (useState) for component-level UI state
- No external state management library; all state is component-based
- Key state includes: evaluation data, run selection, ratings, current question/prompt, and UI flags (loading, error)

**Data Flow**
- Frontend communicates with backend via REST API at `http://localhost:3001/api`
- API client (`src/api/evaluationApi.ts`) handles all backend communication
- Configurable via `VITE_API_URL` environment variable

### Backend Architecture

**Framework & Runtime**
- **Node.js** with **TypeScript** (ESM modules)
- **Express.js** web server running on **port 3001**
- Development server runs with `tsx watch` for hot reloading
- CORS enabled for frontend communication

**API Routes** (`backend/src/routes/evaluation.ts`)
- `POST /api/evaluate` - Run multi-prompt evaluations on datasets
- `GET /api/runs` - List all saved evaluation runs
- `GET /api/runs/:runName` - Load specific run data
- `POST /api/prompts` - Save system prompts
- `GET /api/prompts` - List saved prompts
- `GET /api/prompts/:promptName` - Load specific prompt
- `DELETE /api/prompts/:promptName` - Delete prompt
- `POST /api/datasets` - Save dataset
- `GET /api/datasets` - List datasets
- `GET /api/datasets/:datasetName` - Load dataset
- `GET /api/ratings/:runName/:ratingUser` - Load ratings for user/run
- `POST /api/ratings` - Save individual rating
- `GET /health` - Health check endpoint

**AI Integration**
- Uses **AI SDK** with **Anthropic provider**
- Default model: `claude-sonnet-4-5-20250929`
- Streams responses for efficient processing
- Requires `ANTHROPIC_API_KEY` environment variable

**File-Based Storage**
All data persisted to local filesystem in backend directory:

- **Prompts** (`backend/prompts/`) - System prompt templates stored as JSON files
- **Datasets** (`backend/datasets/`) - Evaluation datasets (CSV data) stored as JSON files
- **Runs** (`backend/runs/`) - Completed evaluation results with all prompt outputs
- **Ratings** (`backend/ratings/`) - User ratings and comments per run/user combination
- **Cache** (`backend/cache/`) - Cached AI responses keyed by model + system prompt + user message (SHA-256 hash)

**Services & Utilities**
- `evaluationService.ts` - Core evaluation logic with rate limiting and caching
- `cache.ts` - File-based response caching to reduce API calls
- `aiClient.ts` - AI API client with exponential backoff retry logic
- `csvParser.ts` - CSV parsing for dataset uploads
- Storage utilities for prompts, datasets, runs, and ratings

### Application Features

**Three Main Tabs:**

1. **Review Results** - Browse saved evaluation runs, view AI responses, and add ratings/comments
   - Select from saved runs
   - Navigate through prompts and test cases
   - Rate responses (1-10 scale) with comments
   - Multiple raters supported (Alejo, Jeffrey, Guest)
   - Export ratings to CSV

2. **Run Evaluation** - Execute new evaluations
   - Upload CSV dataset or select saved dataset
   - Choose multiple system prompts to test
   - Automatically caches responses to avoid duplicate API calls
   - Shows real-time progress and results
   - Saves complete run data for later review

3. **Register Prompt** - Manage system prompts
   - Create and save new system prompt templates
   - View all saved prompts
   - Edit existing prompts
   - Delete prompts
   - Use in evaluations

### Styling Architecture

**Tailwind CSS Configuration**
- Tailwind v4 with Vite plugin integration
- Custom CSS theme variables defined in `src/index.css`
- Theme system supports light/dark modes via CSS custom properties
- Typography plugin included for markdown rendering
- Animation utilities via `tw-animate-css` plugin

**Design System**
- Neutral color palette as base
- Consistent border radius system (sm/md/lg/xl variants)
- Comprehensive color tokens for background, foreground, card, primary, secondary, muted, accent, destructive states
- Alert components for error/info messages

### Content Processing

**Markdown Rendering**
- `react-markdown` library for displaying formatted AI model outputs
- Supports rich text formatting in responses

**CSV Processing**
- Backend parses uploaded CSV files
- Expects single column with header "prompt" or "Prompt"
- Extracts prompts for evaluation dataset

## External Dependencies

### Frontend Dependencies
- **@radix-ui/react-*** - Headless UI primitives (checkbox, progress, scroll-area, select, separator, slider, slot, tabs)
- **shadcn/ui** - Pre-built accessible components based on Radix UI
- **lucide-react** - Icon library for consistent iconography
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Type-safe variant API for component styling
- **tailwind-merge** - Intelligent Tailwind class merging utility
- **clsx** - Conditional className construction
- **react-markdown** - Markdown rendering for AI outputs

### Backend Dependencies
- **@ai-sdk/anthropic** - Anthropic provider for AI SDK
- **ai** - Vercel AI SDK for streaming responses
- **express** - Web server framework
- **cors** - CORS middleware
- **multer** - File upload handling
- **csv-parse** - CSV parsing utility
- **dotenv** - Environment variable management
- **tsx** - TypeScript execution for development

### Development Tools
- **TypeScript** - Static type checking (frontend & backend)
- **ESLint** - Code linting with React-specific rules
- **Vite** - Build tool and dev server

## Workflows

Two workflows configured:

1. **Frontend** - `npm run dev` (port 5000)
   - Vite development server
   - Hot module replacement enabled
   - Serves React application

2. **Backend** - `cd backend && npm run dev` (port 3001)
   - Express API server
   - tsx watch for TypeScript hot reloading
   - Serves REST API endpoints

## Environment Variables

Required secrets:
- `ANTHROPIC_API_KEY` - API key for Anthropic Claude access

Optional configuration:
- `VITE_API_URL` - Backend API URL (defaults to `http://localhost:3001`)
- `PORT` - Backend server port (defaults to 3001)

## Recent Changes (November 10, 2025)

**Major Additions:**
- Added complete Node.js/Express backend with TypeScript
- Implemented file-based storage system for all data
- Integrated Anthropic AI SDK for Claude API access
- Added response caching to reduce API costs
- Created multi-prompt evaluation system
- Added rating/review system with multi-user support
- Implemented CSV dataset upload and management

**New Components:**
- `EvaluationRunner` - Run new evaluations with multiple prompts
- `RegisterPrompt` - Manage system prompt templates
- Updated `ReviewApp` - Review and rate evaluation results
- Additional shadcn/ui components (tabs, checkbox)

**Infrastructure:**
- Backend workflow configured on port 3001
- Frontend workflow configured on port 5000
- All npm dependencies installed and verified
- Anthropic API key configured in secrets

## Usage Flow

1. **Register Prompts** - Create system prompt templates you want to test
2. **Prepare Dataset** - Upload a CSV file with test prompts or use saved dataset
3. **Run Evaluation** - Select prompts and dataset, run evaluation (cached responses reused)
4. **Review Results** - Navigate through results, add ratings and comments
5. **Export Data** - Export ratings and results for analysis

## Data Persistence

All data is stored locally in the backend file system:
- Prompts, datasets, runs, and ratings survive server restarts
- Cached responses persist to minimize API costs
- No database required - simple JSON file storage
- Ratings tracked per user per run for collaborative review
