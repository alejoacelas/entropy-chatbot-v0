# Review App - Eval Results Reviewer

A React-based web application for reviewing and annotating evaluation results from promptfoo tests. This app provides an intuitive interface for rating model responses and exporting annotations without requiring a backend server.

## Features

- **Import Results**: Automatically loads evaluation results from `public/data/evals/results.json`
- **Local Storage**: Saves all annotations to browser localStorage (no backend needed)
- **Rating System**: Rate responses on a 0-5 scale with notes
- **Keyboard Shortcuts**: 
  - Press `0-5` to quickly rate responses
  - Press `Enter` to focus on notes field
  - Press `⌘/Ctrl + Enter` to save and move to next item
- **Progress Tracking**: See how many items you've rated and average scores
- **CSV Export**: Download a CSV file with all results and annotations
- **JSON Export**: Download annotations as JSON for backup or sharing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Place your evaluation results file at:
```
public/data/evals/results.json
```

If you have results in the parent directory, you can copy them:
```bash
cp ../data/evals/results.json public/data/evals/
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically `http://localhost:5173`)

## Usage

### Rating Items

1. Use the sidebar to select a prompt and model combination
2. Review the question and model response
3. Rate the response using the slider or keyboard (0-5)
4. Add optional notes in the text area
5. Click "Save" or "Next" to continue

### Exporting Data

The app provides two export options in the sidebar:

#### CSV Export
Downloads a CSV file with:
- Test index and prompt text
- For each (prompt, model) combination:
  - Model response
  - Your rating (0-5)
  - Your notes

Format: `annotations_export_YYYY-MM-DD.csv`

#### JSON Export
Downloads a JSON file with all annotations in the format:
```json
{
  "eval_id": {
    "testIdx": {
      "promptLabel": {
        "providerLabel": {
          "rating": 5,
          "notes": "Great response!"
        }
      }
    }
  }
}
```

Format: `review_annotations.json`

## Data Storage

All annotations are stored in browser localStorage under the key `review_annotations`. This means:

- ✅ No backend server required
- ✅ Data persists between sessions
- ✅ Works offline
- ⚠️ Data is browser-specific (not synced across devices)
- ⚠️ Clearing browser data will delete annotations (use export to backup)

## Comparison with Python Script

This app provides the same functionality as `review_evals.py` but with:

- Modern web UI instead of Streamlit
- No Python/server requirements
- Faster performance
- Better keyboard shortcuts
- Identical CSV export format

## Building for Production

```bash
npm run build
npm run preview
```

The built files will be in the `dist/` directory and can be hosted on any static file server.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Markdown
