# Review App - Mantine

A modern evaluation reviewer built with React, Mantine, and TypeScript. This app allows you to review promptfoo evaluation results with keyboard shortcuts for efficient rating and note-taking.

## Features

- **Filter by Prompt & Model**: Easily filter evaluation results by prompt and model combinations
- **Keyboard Shortcuts**:
  - Press `0-5` to set a rating (when not in a text field)
  - Press `Enter` to focus the notes textarea (when not in a text field)
  - Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows/Linux) in the notes textarea to save and move to the next item
- **Text Truncation**: Long prompts and responses are automatically truncated for easier viewing
- **Progress Tracking**: See real-time progress of how many items you've rated
- **Stats Dashboard**: View statistics about your ratings (average, excellent count, poor count)
- **Responsive Design**: Works great on desktop and tablet

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

1. Make sure you have promptfoo evaluation results at `data/evals/results.json`
2. Run the dev server: `npm run dev`
3. Select a prompt and model from the left sidebar
4. Use the keyboard shortcuts to quickly rate and annotate results:
   - Press a number (0-5) to set the rating
   - Press Enter to focus the notes field
   - Press Cmd+Enter to save and move to the next item
5. Your annotations are saved to `review_annotations.json`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `0-5` | Set rating (when not in text field) |
| `Enter` | Focus notes textarea (when not in text field) |
| `Cmd+Enter` / `Ctrl+Enter` | Save annotation and move to next item (in textarea) |

## Data Format

### Input: Promptfoo Results

Expected at `data/evals/results.json`:

```json
{
  "evalId": "unique-eval-id",
  "results": {
    "results": [
      {
        "testIdx": 0,
        "testCase": {
          "vars": {
            "prompt": "User question here"
          }
        },
        "prompt": {
          "label": "prompt-label"
        },
        "provider": {
          "label": "provider-label"
        },
        "response": {
          "output": "Model response here"
        },
        "gradingResult": {
          "pass": true,
          "score": 0.8
        },
        "latencyMs": 250
      }
    ]
  }
}
```

### Output: Annotations

Saved to `review_annotations.json`:

```json
{
  "eval-id": {
    "0": {
      "prompt-label": {
        "provider-label": {
          "rating": 5,
          "notes": "Great response!"
        }
      }
    }
  }
}
```

## Architecture

- **App.tsx**: Main component handling state management and keyboard events
- **utils/data.ts**: Data loading, saving, and manipulation functions
- **types.ts**: TypeScript interfaces for type safety

## Technologies

- React 18
- Mantine UI (component library)
- TypeScript
- Vite (build tool)
- Emotion (CSS-in-JS)
