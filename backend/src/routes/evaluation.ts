import express from 'express';
import multer from 'multer';
import { runMultiPromptEvaluation } from '../services/evaluationService.js';
import { parsePromptsFromCsv } from '../utils/csvParser.js';
import { saveRun, listRuns, loadRun } from '../utils/runStorage.js';
import { saveDataset, listDatasets, loadDataset } from '../utils/datasetStorage.js';
import { savePrompt, listPrompts, loadPrompt, deletePrompt } from '../utils/promptStorage.js';
import { loadRatings, saveRating } from '../utils/ratingStorage.js';

const router = express.Router();
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/evaluate
 *
 * Accepts:
 * - CSV file or datasetName for the test data
 * - Array of promptNames to run on the dataset
 * - runName for saving the evaluation
 * - Optional: model selection
 *
 * Body format (multipart or JSON):
 * {
 *   file?: File,                    // CSV upload
 *   datasetName?: string,           // Name for new dataset or existing dataset to load
 *   promptNames: string[],          // Array of system prompt names to test
 *   runName: string,                // Name for this evaluation run
 *   model?: string                  // Model to use (optional)
 * }
 */
router.post('/evaluate', upload.single('file'), async (req, res) => {
  // Set timeout to 30 minutes for this specific endpoint
  req.setTimeout(1800000);
  res.setTimeout(1800000);
  
  try {
    let datasetPrompts: string[] = [];
    let datasetName = '';

    // Check if CSV file was uploaded
    if (req.file) {
      const csvContent = req.file.buffer.toString('utf-8');
      datasetPrompts = parsePromptsFromCsv(csvContent);

      // Dataset name is required when uploading CSV
      datasetName = req.body.datasetName;
      if (!datasetName || !datasetName.trim()) {
        return res.status(400).json({
          error: 'Dataset name is required when uploading a CSV file.',
        });
      }

      // Save the dataset
      await saveDataset(datasetName.trim(), datasetPrompts);
      console.log(`Saved dataset: ${datasetName}`);
    }
    // Check if datasetName was provided (load existing dataset)
    else if (req.body.datasetName && typeof req.body.datasetName === 'string') {
      const dataset = await loadDataset(req.body.datasetName);
      if (!dataset) {
        return res.status(404).json({
          error: `Dataset not found: ${req.body.datasetName}`,
        });
      }
      datasetPrompts = dataset.prompts;
      datasetName = req.body.datasetName;
    }
    // No valid input
    else {
      return res.status(400).json({
        error: 'No dataset provided. Send either a CSV file with datasetName, or an existing datasetName.',
      });
    }

    if (datasetPrompts.length === 0) {
      return res.status(400).json({
        error: 'No valid prompts found in dataset.',
      });
    }

    // Get array of system prompt names
    let promptNames = req.body.promptNames;

    // If promptNames is a string (from FormData), parse it as JSON
    if (typeof promptNames === 'string') {
      try {
        promptNames = JSON.parse(promptNames);
      } catch (e) {
        return res.status(400).json({
          error: 'promptNames must be a valid JSON array.',
        });
      }
    }

    if (!promptNames || !Array.isArray(promptNames) || promptNames.length === 0) {
      return res.status(400).json({
        error: 'promptNames array is required and must contain at least one prompt name.',
      });
    }

    // Load each system prompt
    const systemPrompts: Array<{ name: string; content: string }> = [];
    for (const name of promptNames) {
      const prompt = await loadPrompt(name);
      if (!prompt) {
        return res.status(404).json({
          error: `System prompt not found: ${name}`,
        });
      }
      systemPrompts.push({ name: prompt.name, content: prompt.content });
    }

    // Run name is required
    const runName = req.body.runName;
    if (!runName || !runName.trim()) {
      return res.status(400).json({
        error: 'runName is required.',
      });
    }

    const model = req.body.model || undefined;

    console.log(`Received multi-prompt evaluation request:`);
    console.log(`- Dataset: ${datasetName} (${datasetPrompts.length} prompts)`);
    console.log(`- System prompts: ${systemPrompts.map(p => p.name).join(', ')}`);
    console.log(`- Run name: ${runName}`);

    // Run evaluation with multiple system prompts
    const promptResults = await runMultiPromptEvaluation(datasetPrompts, systemPrompts, model);

    // Calculate summary statistics
    let totalTests = 0;
    let totalCached = 0;
    let totalErrors = 0;

    for (const pr of promptResults) {
      totalTests += pr.results.length;
      totalCached += pr.results.filter(r => r.cached).length;
      totalErrors += pr.results.filter(r => r.error).length;
    }

    // Save run
    const actualModel = model || DEFAULT_MODEL;
    await saveRun(
      runName.trim(),
      datasetName.trim(),
      actualModel,
      promptResults
    );
    console.log(`Saved run: ${runName}`);

    // Return results
    res.json({
      success: true,
      runName: runName.trim(),
      datasetName: datasetName.trim(),
      model: actualModel,
      promptResults,
      summary: {
        totalPrompts: systemPrompts.length,
        totalTests,
        cached: totalCached,
        errors: totalErrors,
      },
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/runs
 *
 * Returns: List of all saved run names
 */
router.get('/runs', async (req, res) => {
  try {
    const runs = await listRuns();
    res.json({
      success: true,
      runs,
    });
  } catch (error) {
    console.error('Error listing runs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/runs/:name
 *
 * Returns: Specific run in native format (not Promptfoo format)
 */
router.get('/runs/:name', async (req, res) => {
  try {
    const runName = req.params.name;
    const savedRun = await loadRun(runName);

    if (!savedRun) {
      return res.status(404).json({
        error: `Run not found: ${runName}`,
      });
    }

    // Return the run directly in our native format
    res.json(savedRun);
  } catch (error) {
    console.error('Error loading run:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/datasets
 *
 * Returns: List of all saved dataset names
 */
router.get('/datasets', async (req, res) => {
  try {
    const datasets = await listDatasets();
    res.json({
      success: true,
      datasets,
    });
  } catch (error) {
    console.error('Error listing datasets:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/datasets/:name
 *
 * Returns: Specific dataset with prompts
 */
router.get('/datasets/:name', async (req, res) => {
  try {
    const datasetName = req.params.name;
    const dataset = await loadDataset(datasetName);

    if (!dataset) {
      return res.status(404).json({
        error: `Dataset not found: ${datasetName}`,
      });
    }

    res.json(dataset);
  } catch (error) {
    console.error('Error loading dataset:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prompts
 *
 * Returns: List of all saved prompt names
 */
router.get('/prompts', async (req, res) => {
  try {
    const prompts = await listPrompts();
    res.json({
      success: true,
      prompts,
    });
  } catch (error) {
    console.error('Error listing prompts:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prompts/:name
 *
 * Returns: Specific prompt with content
 */
router.get('/prompts/:name', async (req, res) => {
  try {
    const promptName = req.params.name;
    const prompt = await loadPrompt(promptName);

    if (!prompt) {
      return res.status(404).json({
        error: `Prompt not found: ${promptName}`,
      });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error loading prompt:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts
 *
 * Saves a new system prompt
 * Body: { name: string, content: string }
 */
router.post('/prompts', async (req, res) => {
  try {
    const { name, content } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Prompt name is required',
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        error: 'Prompt content is required',
      });
    }

    await savePrompt(name.trim(), content.trim());
    console.log(`Saved prompt: ${name}`);

    res.json({
      success: true,
      message: `Prompt "${name}" saved successfully`,
    });
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/prompts/:name
 *
 * Deletes a saved prompt
 */
router.delete('/prompts/:name', async (req, res) => {
  try {
    const promptName = req.params.name;
    const success = await deletePrompt(promptName);

    if (!success) {
      return res.status(404).json({
        error: `Prompt not found: ${promptName}`,
      });
    }

    console.log(`Deleted prompt: ${promptName}`);
    res.json({
      success: true,
      message: `Prompt "${promptName}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ratings/load
 *
 * Returns: Rating for a specific content and user
 * Body: { model: string, systemPrompt: string, question: string, response: string, ratingUser: string }
 */
router.post('/ratings/load', async (req, res) => {
  try {
    const { model, systemPrompt, question, response, ratingUser } = req.body;

    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return res.status(400).json({ error: 'systemPrompt is required' });
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    if (!response || typeof response !== 'string') {
      return res.status(400).json({ error: 'response is required' });
    }

    if (!ratingUser || typeof ratingUser !== 'string') {
      return res.status(400).json({ error: 'ratingUser is required' });
    }

    const rating = await loadRating(model, systemPrompt, question, response, ratingUser);

    res.json(rating);
  } catch (error) {
    console.error('Error loading rating:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ratings
 *
 * Saves a rating for a specific question
 * Body: { runName: string, ratingUser: string, promptIndex: number, questionIndex: number, rating: number, comment: string }
 */
router.post('/ratings', async (req, res) => {
  try {
    const { runName, ratingUser, promptIndex, questionIndex, rating, comment } = req.body;

    if (!runName || typeof runName !== 'string') {
      return res.status(400).json({ error: 'runName is required' });
    }

    if (!ratingUser || typeof ratingUser !== 'string') {
      return res.status(400).json({ error: 'ratingUser is required' });
    }

    if (typeof promptIndex !== 'number' || promptIndex < 0) {
      return res.status(400).json({ error: 'Invalid promptIndex' });
    }

    if (typeof questionIndex !== 'number' || questionIndex < 0) {
      return res.status(400).json({ error: 'Invalid questionIndex' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const commentStr = typeof comment === 'string' ? comment : '';

    await saveRating(runName, ratingUser, promptIndex, questionIndex, rating, commentStr);

    res.json({
      success: true,
      message: 'Rating saved successfully',
    });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
