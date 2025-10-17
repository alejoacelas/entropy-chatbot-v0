const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper functions
function loadJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getAnnotation(annotations, evalId, testIdx, promptLabel, providerLabel) {
  return annotations[evalId]?.[testIdx]?.[promptLabel]?.[providerLabel] || {};
}

function setAnnotation(annotations, evalId, testIdx, promptLabel, providerLabel, rating, notes) {
  if (!annotations[evalId]) annotations[evalId] = {};
  if (!annotations[evalId][testIdx]) annotations[evalId][testIdx] = {};
  if (!annotations[evalId][testIdx][promptLabel]) annotations[evalId][testIdx][promptLabel] = {};

  annotations[evalId][testIdx][promptLabel][providerLabel] = { rating, notes };
}

// API Routes

/**
 * GET /api/results
 * Load promptfoo results and parse them
 */
app.get('/api/results', (req, res) => {
  try {
    // Look for results in data/evals/, then promptfoo_results.json, then results.json
    let resultsPath = path.join(__dirname, '../data/evals/results.json');
    if (!fs.existsSync(resultsPath)) {
      resultsPath = path.join(__dirname, '../promptfoo_results.json');
    }
    if (!fs.existsSync(resultsPath)) {
      resultsPath = path.join(__dirname, '../results.json');
    }

    const promptfooData = loadJSON(resultsPath);
    if (!promptfooData) {
      return res.status(404).json({ error: 'No results found' });
    }

    // Parse results data
    const results = promptfooData.results?.results || [];
    const uniquePrompts = {};
    const uniqueProviders = {};

    results.forEach(result => {
      const promptLabel = result.prompt?.label || 'unknown';
      const providerLabel = result.provider?.label || 'unknown';
      if (!uniquePrompts[promptLabel]) uniquePrompts[promptLabel] = true;
      if (!uniqueProviders[providerLabel]) uniqueProviders[providerLabel] = true;
    });

    res.json({
      evalId: promptfooData.evalId,
      results,
      promptLabels: Object.keys(uniquePrompts),
      providerLabels: Object.keys(uniqueProviders),
    });
  } catch (err) {
    console.error('Error loading results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/annotations
 * Load saved annotations
 */
app.get('/api/annotations', (req, res) => {
  try {
    const annotationsPath = path.join(__dirname, '../review_annotations.json');
    const annotations = loadJSON(annotationsPath) || {};
    res.json(annotations);
  } catch (err) {
    console.error('Error loading annotations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/annotations
 * Save annotations
 */
app.post('/api/annotations', (req, res) => {
  try {
    const { evalId, testIdx, promptLabel, providerLabel, rating, notes } = req.body;

    const annotationsPath = path.join(__dirname, '../review_annotations.json');
    const annotations = loadJSON(annotationsPath) || {};

    setAnnotation(annotations, evalId, testIdx, promptLabel, providerLabel, rating, notes);
    saveJSON(annotationsPath, annotations);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving annotations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/export
 * Export results to CSV
 */
app.get('/api/export', (req, res) => {
  try {
    // Load data
    let resultsPath = path.join(__dirname, '../data/evals/results.json');
    if (!fs.existsSync(resultsPath)) {
      resultsPath = path.join(__dirname, '../promptfoo_results.json');
    }
    if (!fs.existsSync(resultsPath)) {
      resultsPath = path.join(__dirname, '../results.json');
    }

    const promptfooData = loadJSON(resultsPath);
    const annotationsPath = path.join(__dirname, '../review_annotations.json');
    const annotations = loadJSON(annotationsPath) || {};
    const csvPath = path.join(__dirname, '../data/questions/30-real-questions.csv');

    if (!promptfooData || !fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Data not found' });
    }

    // Load original CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { columns: true });

    // Build result map
    const results = promptfooData.results?.results || [];
    const resultMap = {};
    results.forEach(result => {
      const testIdx = result.testIdx;
      const promptLabel = result.prompt?.label || 'unknown';
      const providerLabel = result.provider?.label || 'unknown';
      const key = `${testIdx}|${promptLabel}|${providerLabel}`;
      resultMap[key] = result;
    });

    // Collect unique combinations
    const combinations = new Set();
    Object.keys(resultMap).forEach(key => {
      const [testIdx, promptLabel, providerLabel] = key.split('|');
      combinations.add(JSON.stringify({ promptLabel, providerLabel }));
    });
    const combList = Array.from(combinations)
      .map(c => JSON.parse(c))
      .sort((a, b) => `${a.promptLabel}${a.providerLabel}`.localeCompare(`${b.promptLabel}${b.providerLabel}`));

    // Add columns for each combination
    const evalId = promptfooData.evalId || '';
    combList.forEach(({ promptLabel, providerLabel }) => {
      const responseCol = `${promptLabel}_${providerLabel}_response`;
      const ratingCol = `${promptLabel}_${providerLabel}_rating`;
      const notesCol = `${promptLabel}_${providerLabel}_notes`;

      records.forEach((record, testIdx) => {
        const key = `${testIdx}|${promptLabel}|${providerLabel}`;
        const result = resultMap[key];

        if (result) {
          record[responseCol] = result.response?.output || '';
          const annotation = getAnnotation(annotations, evalId, testIdx, promptLabel, providerLabel);
          record[ratingCol] = annotation.rating || 0;
          record[notesCol] = annotation.notes || '';
        } else {
          record[responseCol] = '';
          record[ratingCol] = 0;
          record[notesCol] = '';
        }
      });
    });

    // Generate CSV
    const output = stringify(records, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="eval_results_${Date.now()}.csv"`);
    res.send(output);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Evaluation Reviewer running at http://localhost:${PORT}`);
});
