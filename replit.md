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