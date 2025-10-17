# Evaluation Reviewer - Node Web App

A fast, keyboard-driven web application for reviewing promptfoo evaluation results. Built with vanilla JavaScript, Express, and DaisyUI.

## Features

- **Keyboard-first workflow**: Type numbers to rate, press Enter for notes, Cmd+Enter to save
- **Filter by prompt & model**: Easily switch between different test configurations
- **Real-time statistics**: Track progress and rating distributions
- **CSV export**: Download results with all annotations
- **Persistent storage**: Annotations are saved and survive new evaluation runs
- **Responsive design**: Works on desktop and tablet

## Setup

### Prerequisites
- Node.js 14+ and npm

### Installation

```bash
# Navigate to the project directory
cd review-app

# Install dependencies
npm install
```

### Configuration

The app expects the following files in the parent directory:
- `promptfoo_results.json` (or `results.json`) - Output from promptfoo
- `data/questions/30-real-questions.csv` - Original test cases
- `review_annotations.json` - Will be created automatically on first save

If your files are in different locations, edit `server.js` to update the paths.

### Running the App

```bash
npm start
```

Then open your browser to `http://localhost:3000`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **0-5** | Set rating (0 = not rated, 1-5 = poor to excellent) |
| **Enter** | Focus on notes textarea |
| **Cmd+Enter** | Save current evaluation and move to next |
| ← Previous | Navigate to previous result |
| → Next | Navigate to next result |

## File Structure

```
review-app/
├── server.js              # Express API server
├── public/
│   ├── index.html         # Single-page application
│   ├── css/
│   │   └── styles.css     # Custom styles
│   └── js/
│       ├── app.js         # Main app initialization
│       ├── state.js       # Reactive state management
│       ├── api.js         # Backend API client
│       ├── keyboard.js    # Keyboard shortcuts
│       └── ui.js          # DOM rendering
├── package.json
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/results` | GET | Load promptfoo results |
| `/api/annotations` | GET | Load saved annotations |
| `/api/annotations` | POST | Save an annotation |
| `/api/export` | GET | Download CSV with all results |
| `/api/health` | GET | Health check |

## Data Format

### Annotations Storage (review_annotations.json)

```json
{
  "eval-id-123": {
    "0": {
      "baseline_prompt": {
        "GPT-4.1-mini": {
          "rating": 5,
          "notes": "Good response"
        }
      }
    }
  }
}
```

### CSV Export

Each test case is one row with columns for:
- Original CSV columns (prompt, source, etc.)
- For each (prompt, model) combination:
  - `{prompt}_{model}_response` - The model's output
  - `{prompt}_{model}_rating` - Your rating (0-5)
  - `{prompt}_{model}_notes` - Your notes

Example columns:
- `prompt`
- `Source`
- `baseline_GPT-4_response`
- `baseline_GPT-4_rating`
- `baseline_GPT-4_notes`

## Styling

The app uses:
- **DaisyUI**: Component library built on Tailwind CSS
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Custom CSS**: Lightweight additional styling in `public/css/styles.css`

No build process required - all CSS is delivered via CDN.

## Development

### Adding new features

1. **State changes**: Update `state.js` to add new state properties and methods
2. **API calls**: Add methods to `api.js`
3. **UI updates**: Add rendering methods to `ui.js`
4. **Event handlers**: Add listeners in `app.js`

### Testing keyboard shortcuts

Open browser DevTools (F12) and you'll see logs of initialized shortcuts.

## Troubleshooting

**"No evaluation results found"**
- Make sure `promptfoo_results.json` exists in the parent directory
- Check that the path in `server.js` is correct

**Annotations not saving**
- Check that you have write permissions for the project directory
- Look at console logs for error messages

**Styling issues**
- Clear your browser cache
- Make sure DaisyUI CDN is accessible
- Check browser console for CSS loading errors

## License

MIT
