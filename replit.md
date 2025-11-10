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

1. **Create and Configure App Storage Bucket**:
   
   a. **Create the bucket**:
      - In your Replit workspace, open the "App Storage" tool from the left sidebar
      - Click "Create new bucket"
      - Enter a bucket name (use lowercase letters, numbers, hyphens only)
        - Example: `entropy-evals-bucket`
        - **IMPORTANT:** Bucket names cannot contain uppercase letters
      - Click "Create bucket"
   
   b. **Get the Bucket ID** (this is critical):
      - After creating the bucket, select it from the dropdown if not already selected
      - Click on the "Settings" view in the App Storage tool
      - Copy the **Bucket ID** (this is a unique identifier, different from the bucket name)
      - Example Bucket ID format: `entropy-evals-bucket` or similar
   
   c. **Ensure bucket is connected to your deployment**:
      - By default, buckets are accessible to all your Replit Apps
      - If you need to explicitly add the bucket:
        - In App Storage tool, select "Add an existing bucket" from the bucket menu
        - Choose your bucket and click "Add Bucket to Repl"

2. **Set Environment Variables in Production**:
   
   **CRITICAL:** Set these in your deployment's environment variables, not just in dev Secrets:
   
   - `STORAGE_BUCKET_NAME` - **Must be the exact Bucket ID** from step 1b above
     - Common mistake: Using a name you made up instead of the actual Bucket ID
     - To fix: Copy the Bucket ID from App Storage Settings, not what you think it should be
   - `ANTHROPIC_API_KEY` - Should already be in Secrets
   - `REPLIT_DEPLOYMENT=1` - Automatically set by Replit (don't set manually)
   - `PORT` - Automatically provided by Replit autoscale (don't set manually)

3. **Deploy**:
   - Click the "Deploy" button in Replit
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
     - Use App Storage for data persistence
     - Log: "Using Replit Object Storage (bucket: {bucket-id})"
     - Log: "Running in deployment mode - serving frontend static files"

4. **Verify**:
   - Check deployment logs for "Using Replit Object Storage (bucket: your-bucket-id)"
   - Check for "Running in deployment mode - serving frontend static files"
   - If you see errors, check the Troubleshooting section below
   - Test the application in your browser
   - Create a prompt or dataset to verify App Storage is working
   - Data will persist across deployments in App Storage

## Troubleshooting App Storage Issues

### Error: "Invalid bucket name"
- **Cause:** Bucket names must be lowercase only
- **Solution:** 
  - Create a new bucket with all lowercase name (e.g., `entropy-evals-bucket`)
  - Update `STORAGE_BUCKET_NAME` environment variable with the new Bucket ID
  - Redeploy

### Error: "The specified bucket does not exist" (404)
- **Cause 1:** Using a bucket name instead of the actual Bucket ID
  - **Solution:** 
    1. Open App Storage tool
    2. Select your bucket
    3. Go to Settings view
    4. Copy the actual **Bucket ID**
    5. Update `STORAGE_BUCKET_NAME` with this exact value
    6. Redeploy

- **Cause 2:** Bucket not connected to your deployment
  - **Solution:**
    1. Open App Storage tool
    2. Click "Add an existing bucket"
    3. Select your bucket
    4. Click "Add Bucket to Repl"
    5. Redeploy

- **Cause 3:** Environment variable not set in production deployment
  - **Solution:**
    1. Go to your deployment settings (not dev environment)
    2. Verify `STORAGE_BUCKET_NAME` is set in the deployment environment variables
    3. The value must match the Bucket ID from App Storage Settings
    4. Redeploy after making changes

### Error: "Permission denied" or authentication errors
- **Cause:** App Storage authentication requires the app to run on Replit
- **Solution:** This is expected in local development. Use the development file system storage instead (automatic when not deployed)

### How to verify your setup:
1. In App Storage tool, confirm your bucket exists and note the exact Bucket ID
2. In deployment environment variables, confirm `STORAGE_BUCKET_NAME` matches that exact Bucket ID
3. Check deployment logs for the startup message showing the bucket being used
4. Test creating a prompt - if it saves successfully, App Storage is working

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
- `STORAGE_BUCKET_NAME` - **Required** for production. Must be the exact Bucket ID from App Storage Settings (not a custom name)
- `PORT` - Automatically provided by Replit autoscale (do not set manually)
- `REPLIT_DEPLOYMENT=1` - Automatically set by Replit during deployment

## Quick Setup Checklist for Production

Use this checklist to verify your App Storage setup:

- [ ] Created bucket in App Storage tool (lowercase name only)
- [ ] Copied exact Bucket ID from App Storage → Settings view
- [ ] Set `STORAGE_BUCKET_NAME` in deployment environment variables to match Bucket ID
- [ ] Verified bucket is connected to this Repl (should be automatic)
- [ ] Set `ANTHROPIC_API_KEY` in deployment environment variables
- [ ] Deployed the application
- [ ] Checked deployment logs for "Using Replit Object Storage (bucket: ...)"
- [ ] Tested creating a prompt to verify storage works

## Recent Changes (November 10, 2025)

**App Storage Setup Documentation (Latest):**
- Comprehensive setup guide for App Storage (Object Storage) in production
- Clear distinction between bucket name and Bucket ID
- Step-by-step instructions for creating and configuring buckets
- Troubleshooting guide for common errors:
  - Invalid bucket name (uppercase letters issue)
  - Bucket not found (404) - multiple causes and solutions
  - Permission denied errors
- Quick setup checklist for production deployments
- Emphasis on using exact Bucket ID from App Storage Settings

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