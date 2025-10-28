# Review App - ShadCN

## Overview

A React-based web application for reviewing and annotating AI prompt evaluation results from Promptfoo. The application provides an interactive interface for examining test outputs, rating responses, and adding detailed notes. It's designed to streamline the process of evaluating AI model outputs across different prompts and providers, with built-in annotation persistence via localStorage and export capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 19** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- Path aliasing configured (`@/*` → `./src/*`) for cleaner imports across the application

**UI Component System**
- **shadcn/ui** components built on Radix UI primitives for accessible, customizable interface elements
- **Tailwind CSS v4** for utility-first styling with CSS variables for theming
- Component library includes: cards, buttons, sliders, select dropdowns, progress bars, text areas, badges, and scroll areas
- "New York" style variant selected for shadcn components with neutral base color scheme
- Dark mode support via CSS custom properties and variant system

**State Management**
- Local React state (useState) for component-level UI state
- No external state management library; all state is component-based
- Key state includes: evaluation data, annotations store, current selection (prompt/provider/test), and UI flags (loading, error)

**Data Flow**
- Data loaded from static JSON files in `/public` directory:
  - `/evals/results.json` - Promptfoo evaluation results
  - `/review_annotations.json` - Initial annotation data
- Annotations persisted to browser localStorage after each change
- No backend API; fully client-side application

### Core Application Logic

**Evaluation Review System**
The application displays results from Promptfoo evaluations, which test AI prompts across different providers and test cases:

- **Result Structure**: Each result contains test case variables, prompt details, provider info, model output, grading results (pass/fail, score, reason), and latency metrics
- **Navigation**: Users can filter by prompt variant and provider, then navigate through test cases sequentially
- **Annotation Model**: Each unique combination of (evalId, testIdx, promptLabel, providerLabel) can have a rating (1-10) and free-form notes

**Utility Functions** (`src/utils.ts`)
- `loadPromptfooResults()` - Fetches evaluation data from `/evals/results.json`
- `loadAnnotations()` - Loads annotations from localStorage (fallback to `/review_annotations.json`)
- `saveAnnotations()` - Persists annotations to localStorage
- `getAnnotation()` / `setAnnotation()` - Accessors for nested annotation structure
- `truncateText()` - Text truncation utility for previews
- `exportAnnotationsToJSON()` / `exportToCSV()` - Export functions for annotation data

**Type System** (`src/types.ts`)
- Strongly typed interfaces for: PromptfooResult, Result, Annotation, AnnotationsStore
- Nested annotation storage structure keyed by evalId → testIdx → promptLabel → providerLabel

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
- Chart color variables (chart-1 through chart-5) for data visualization
- Sidebar-specific color tokens for potential future use

### Content Processing

**Markdown Rendering**
- `react-markdown` library for displaying formatted model outputs
- Supports rich text formatting in AI responses and annotation notes

**Text Transformation** (`transform.js`)
- JavaScript utility for processing model outputs
- Removes "thinking" sections and extracts content after "Signature:" marker
- Processes JSON tool use lines into simplified annotations
- Used for cleaning up verbose AI model outputs before display

## External Dependencies

### UI Component Libraries
- **@radix-ui/react-*** - Headless UI primitives (progress, scroll-area, select, separator, slider, slot)
- **shadcn/ui** - Pre-built accessible components based on Radix UI
- **lucide-react** - Icon library for consistent iconography

### Styling & Utilities
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Type-safe variant API for component styling
- **tailwind-merge** - Intelligent Tailwind class merging utility
- **clsx** - Conditional className construction

### Development Tools
- **TypeScript** - Static type checking
- **ESLint** - Code linting with React-specific rules
- **Vite** - Build tool and dev server

### Data Format Dependencies
- **Promptfoo** - The application expects evaluation data in Promptfoo's output format (results.json schema)
- Results must include: evalId, test cases with variables, prompts with labels, provider information, responses, and grading results

### Browser APIs
- **localStorage** - Primary persistence mechanism for annotations
- **fetch API** - Loading static JSON files from public directory

### Notable Absence
- No backend server or database
- No authentication system
- No real-time collaboration features
- All data stored client-side only