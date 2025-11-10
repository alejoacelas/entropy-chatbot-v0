# AI Evaluation System

## Overview

A full-stack web application designed for evaluating AI prompts using Anthropic's Claude across various datasets. The system enables users to register custom system prompts, execute evaluations on CSV datasets, and review/rate the generated results. It provides a comprehensive workflow for systematic AI prompt testing, including caching, persistent storage, and collaborative rating features. The project aims to streamline the process of testing and comparing AI prompt effectiveness.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with **React 19** and **TypeScript**, using **Vite** for bundling. It utilizes **shadcn/ui** components, styled with **Tailwind CSS v4** for a utility-first approach and theming, including dark mode. State management relies on local React state, communicating with the backend via a REST API at `/api`.

### Backend

The backend is built with **Node.js** and **Express.js** in TypeScript, serving both the API and static frontend files in production. Key API routes handle evaluation runs, prompt management, dataset uploads, and rating submissions. AI integration uses the **AI SDK** with the **Anthropic provider** (defaulting to `claude-sonnet-4-5-20250929`), streaming responses and requiring `ANTHROPIC_API_KEY`.

### Storage Architecture

The application employs a storage abstraction layer (`IStorage`) that dynamically adapts to the environment:
- **Development:** Uses `FileSystemStorage` for local file-based storage of prompts, datasets, runs, ratings, and cache in respective backend directories.
- **Production (Replit Deployment):** Uses `ObjectStorage` with Replit's Object Storage (Google Cloud Storage) for persistent, cloud-based storage, automatically detected via `REPLIT_DEPLOYMENT=1` and requiring `STORAGE_BUCKET_NAME`.
All storage maintains a consistent key structure (e.g., `prompts/*.json`).

### Application Features

The system offers three primary functionalities:
1.  **Review Results:** Browse, view, and rate saved evaluation runs with multi-rater support and export capabilities.
2.  **Run Evaluation:** Execute new evaluations on chosen datasets and system prompts, with real-time progress, response caching, and automatic saving.
3.  **Register Prompt:** Create, view, edit, and delete system prompt templates for use in evaluations.

### Content Processing

The application uses `react-markdown` for rendering AI model outputs and `csv-parse` in the backend for processing uploaded CSV datasets, expecting a "prompt" column.

### Deployment

The system supports local development with separate frontend and backend servers and a unified single-server architecture for Replit production deployments, where the backend serves static frontend files and uses Object Storage for persistence.

## External Dependencies

### Frontend Dependencies

*   **@radix-ui/react-\***: Headless UI primitives.
*   **shadcn/ui**: Pre-built accessible components.
*   **lucide-react**: Icon library.
*   **tailwindcss**: Utility-first CSS framework.
*   **class-variance-authority**, **tailwind-merge**, **clsx**: Utilities for styling.
*   **react-markdown**: Markdown rendering.

### Backend Dependencies

*   **@ai-sdk/anthropic**, **ai**: Anthropic AI provider and Vercel AI SDK.
*   **express**: Web server framework.
*   **cors**: CORS middleware.
*   **multer**: File upload handling.
*   **csv-parse**: CSV parsing.
*   **dotenv**: Environment variable management.
*   **@google-cloud/storage**: Google Cloud Storage client for Replit Object Storage.
*   **tsx**: TypeScript execution for development.

### Development Tools

*   **TypeScript**: Static type checking.
*   **ESLint**: Code linting.
*   **Vite**: Build tool and dev server.

## Deployment Guide

### Local Development

1. Clone the repository
2. Install dependencies: `npm install` (frontend) and `cd backend && npm install` (backend)
3. Set `ANTHROPIC_API_KEY` in environment or `.env` file
4. Run workflows: `npm run dev` (frontend) and `cd backend && npm run dev` (backend)
5. Data stored locally in `backend/prompts/`, `backend/datasets/`, etc.

### Replit Production Deployment

**Architecture:** Production uses a unified single-server architecture where the backend serves both API endpoints and the built frontend static files. The backend automatically uses the `PORT` environment variable provided by Replit autoscale.

**Setup Steps:**

1. **Create Object Storage Bucket**:
   - Open the "Object Storage" tool in Replit
   - Create a new bucket (e.g., "ai-evaluation-data")
   - Note the bucket name

2. **Set Environment Variables**:
   - Add `STORAGE_BUCKET_NAME` environment variable with your bucket name
   - `ANTHROPIC_API_KEY` should already be in Secrets
   - `REPLIT_DEPLOYMENT=1` is automatically set by Replit during deployment
   - `PORT` is automatically provided by Replit autoscale

3. **Deploy**:
   - Click "Deploy" button in Replit
   - The deployment build process will:
     - Install frontend dependencies (`npm install`)
     - Build frontend static files (`npm run build`)
     - Install backend dependencies (`cd backend && npm install`)
     - Compile backend TypeScript to JavaScript (`npm run build`)
     - Start backend server (`node backend/dist/index.js`)
   - The backend will automatically:
     - Use the PORT environment variable provided by Replit
     - Detect deployment environment via `REPLIT_DEPLOYMENT=1`
     - Serve frontend static files from the `dist/` directory
     - Serve API routes at `/api/*`
     - Use Object Storage for data persistence
     - Log: "Using Replit Object Storage (bucket: {name})"
     - Log: "Running in deployment mode - serving frontend static files"

4. **Verify**:
   - Check deployment logs for "Using Replit Object Storage"
   - Check for "Running in deployment mode - serving frontend static files"
   - Test the application in your browser
   - Create a prompt or dataset to verify Object Storage is working
   - Data will persist across deployments in Object Storage

### Deployment Configuration

**Build Command:**
```bash
npm install && npm run build && cd backend && npm install && npm run build
```

**Run Command:**
```bash
node backend/dist/index.js
```

**Deployment Target:** Autoscale (stateless, scales based on traffic)

## Environment Variables

### Required Secrets
- `ANTHROPIC_API_KEY` - API key for Anthropic Claude access

### Development Configuration (Optional)
- `PORT` - Backend server port (defaults to 3001 in development)

### Production Configuration (Replit Deployment)
- `STORAGE_BUCKET_NAME` - **Required** for production. Name of the Replit Object Storage bucket
- `PORT` - Automatically provided by Replit autoscale (do not set manually)
- `REPLIT_DEPLOYMENT=1` - Automatically set by Replit during deployment

## Recent Changes (November 10, 2025)

**Deployment Configuration Fixes:**
- Fixed build command to install frontend dependencies before building
- Updated build sequence: install frontend deps → build frontend → install backend deps → build backend
- Simplified PORT handling to use environment variable with 3001 development fallback
- Backend now properly uses PORT provided by Replit autoscale
- Development environment unchanged (backend runs on port 3001 locally)

**Storage Architecture Migration:**
- Implemented storage abstraction layer for environment-aware data persistence
- Added `IStorage` interface with FileSystemStorage and ObjectStorage adapters
- Created `StorageFactory` with automatic environment detection
- Migrated all storage services (prompts, datasets, runs, ratings, cache) to use abstraction
- Local development uses file system storage (unchanged behavior)
- Production deployment uses Replit Object Storage for persistent, reliable cloud storage
- Installed `@google-cloud/storage` dependency for Object Storage integration

**Previous Additions:**
- Complete Node.js/Express backend with TypeScript
- File-based storage system with abstraction layer
- Anthropic AI SDK integration for Claude API access
- Response caching to reduce API costs
- Multi-prompt evaluation system
- Rating/review system with multi-user support
- CSV dataset upload and management
- Frontend-backend integration with Vite proxy

## Data Persistence

**Development:**
- Data stored locally in backend file system (`prompts/`, `datasets/`, `runs/`, `ratings/`, `cache/`)
- Files survive server restarts on local machine
- Simple JSON file storage, no database required

**Production (Replit Deployment):**
- Data stored in Replit Object Storage (Google Cloud Storage)
- Files persist across deployments and server restarts
- Reliable, cloud-based storage
- Same JSON structure and directory organization as local storage

**Shared Features:**
- Cached AI responses minimize API costs
- Ratings tracked per user per run for collaborative review
- All data stored as JSON for easy inspection and portability