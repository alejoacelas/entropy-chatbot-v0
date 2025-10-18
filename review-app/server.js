import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

// Serve static files from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// API endpoint: Get promptfoo results
app.get('/api/results', (req, res) => {
  try {
    const resultsPath = path.join(
      __dirname,
      '..',
      'data',
      'evals',
      'results.json'
    );
    const data = fs.readFileSync(resultsPath, 'utf-8');
    const parsed = JSON.parse(data);

    // Extract results in a format the frontend expects
    res.json({
      evalId: parsed.evalId,
      results: parsed.results?.results || [],
    });
  } catch (error) {
    console.error('Error loading results:', error);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// API endpoint: Get annotations
app.get('/api/annotations', (req, res) => {
  try {
    const annotationsPath = path.join(__dirname, '..', 'review_annotations.json');
    if (!fs.existsSync(annotationsPath)) {
      return res.json({});
    }
    const data = fs.readFileSync(annotationsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error loading annotations:', error);
    res.status(500).json({ error: 'Failed to load annotations' });
  }
});

// API endpoint: Save annotations
app.post('/api/annotations', (req, res) => {
  try {
    const annotationsPath = path.join(__dirname, '..', 'review_annotations.json');
    const annotations = req.body;
    fs.writeFileSync(annotationsPath, JSON.stringify(annotations, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving annotations:', error);
    res.status(500).json({ error: 'Failed to save annotations' });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
