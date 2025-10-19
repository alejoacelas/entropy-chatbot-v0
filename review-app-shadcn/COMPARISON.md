# Comparison: React App vs Python Script

This document compares the React review app with the original `review_evals.py` Python script.

## Feature Parity

| Feature | Python Script | React App | Notes |
|---------|--------------|-----------|-------|
| Load promptfoo results | ✅ | ✅ | Both load from JSON |
| Rate responses (0-5) | ✅ | ✅ | Same scale |
| Add notes | ✅ | ✅ | Text annotations |
| Save annotations | ✅ (JSON file) | ✅ (localStorage) | Different storage |
| Filter by prompt/model | ✅ | ✅ | Same functionality |
| Navigate between items | ✅ | ✅ | React has better UX |
| Export to CSV | ✅ | ✅ | **Identical format** |
| Export annotations JSON | ✅ | ✅ | Same format |
| Progress tracking | ✅ | ✅ | Both show completion |
| Keyboard shortcuts | ⚠️ (limited) | ✅ | More shortcuts in React |
| Statistics | ✅ | ✅ | Average, counts, etc. |

## Advantages of React App

### User Experience
- **Faster UI**: No page reloads, instant updates
- **Better keyboard shortcuts**: 0-5 for ratings, Enter to focus, ⌘/Ctrl+Enter to save
- **Modern interface**: Built with shadcn/ui components
- **Responsive design**: Works on tablets and smaller screens
- **Visual feedback**: Smooth animations and transitions

### Technical
- **No backend required**: Runs entirely in browser
- **No installation**: Just open in browser (after npm install once)
- **No Python/Streamlit**: Uses standard web technologies
- **Portable**: Can be hosted on any static file server
- **Offline capable**: Works without internet after initial load

### Performance
- **Instant navigation**: No server round-trips
- **Local storage**: Saves immediately
- **Fast exports**: Client-side CSV generation

## Advantages of Python Script

### Integration
- **Server file access**: Can read/write files directly
- **Original CSV merge**: Can merge with original CSV columns
- **Script integration**: Easy to call from other Python code

### Portability
- **No build step**: Just run the script
- **File-based storage**: Annotations saved to JSON file on disk
- **Easy backup**: Annotations are in a file, not browser storage

## Data Storage Comparison

### Python Script
- Stores annotations in: `review_annotations.json`
- Location: Same directory as script
- Sharing: Copy file to share with others
- Backup: File-based, easy to version control

### React App
- Stores annotations in: Browser localStorage
- Location: Browser-specific storage
- Sharing: Export JSON, share file
- Backup: Export regularly to save

## CSV Export Format

Both produce identical CSV format:

```csv
testIdx,prompt_text,prompt1_model1_response,prompt1_model1_rating,prompt1_model1_notes,...
0,"Question text","Model response",5,"Great answer",...
```

## Recommendation

**Use React App if:**
- You want faster, more responsive UI
- You're reviewing many items and want better shortcuts
- You don't need to integrate with other Python scripts
- You prefer a modern web interface

**Use Python Script if:**
- You're already using Streamlit
- You need to integrate with other Python code
- You prefer file-based annotation storage
- You need to merge with original CSV columns directly

## Migration Between Tools

### From Python to React
1. Copy `review_annotations.json` content
2. Open React app
3. Import the JSON (paste into localStorage via browser console):
   ```javascript
   localStorage.setItem('review_annotations', JSON.stringify(YOUR_DATA_HERE))
   ```

### From React to Python
1. Click "Download Annotations JSON" in React app
2. Place `review_annotations.json` in same directory as Python script
3. Run Python script - it will load the annotations

Both tools are compatible and can share annotation data!


