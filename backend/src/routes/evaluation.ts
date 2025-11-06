import express from 'express';
import multer from 'multer';
import { runEvaluation } from '../services/evaluationService.js';
import { parsePromptsFromCsv } from '../utils/csvParser.js';
import { saveRun, listRuns, loadRun, convertToPromptfooFormat } from '../utils/runStorage.js';
import { saveDataset, listDatasets, loadDataset } from '../utils/datasetStorage.js';
import { savePrompt, listPrompts, loadPrompt, deletePrompt } from '../utils/promptStorage.js';

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
 * - CSV file (multipart/form-data with "file" field)
 * - OR JSON body with prompts array or datasetName
 * - Optional: model selection
 * - Optional: system prompt template
 *
 * Returns: Array of evaluation results
 */
router.post('/evaluate', upload.single('file'), async (req, res) => {
  try {
    let prompts: string[] = [];

    // Check if CSV file was uploaded
    if (req.file) {
      const csvContent = req.file.buffer.toString('utf-8');
      prompts = parsePromptsFromCsv(csvContent);

      // Save dataset if datasetName is provided
      const datasetName = req.body.datasetName;
      if (datasetName && datasetName.trim()) {
        await saveDataset(datasetName.trim(), prompts);
        console.log(`Saved dataset: ${datasetName}`);
      }
    }
    // Check if datasetName was provided (load existing dataset)
    else if (req.body.datasetName && typeof req.body.datasetName === 'string') {
      const dataset = await loadDataset(req.body.datasetName);
      if (!dataset) {
        return res.status(404).json({
          error: `Dataset not found: ${req.body.datasetName}`,
        });
      }
      prompts = dataset.prompts;
    }
    // Check if prompts array was sent in JSON body
    else if (req.body.prompts && Array.isArray(req.body.prompts)) {
      prompts = req.body.prompts.filter(
        (p: any) => typeof p === 'string' && p.trim().length > 0
      );
    }
    // No valid input
    else {
      return res.status(400).json({
        error: 'No prompts provided. Send either a CSV file, a datasetName, or a prompts array in JSON.',
      });
    }

    if (prompts.length === 0) {
      return res.status(400).json({
        error: 'No valid prompts found.',
      });
    }

    // Extract optional parameters
    const model = req.body.model || undefined;
    const systemPrompt = req.body.systemPrompt || undefined;
    const runName = req.body.runName;

    console.log(`Received evaluation request with ${prompts.length} prompts`);

    // Run evaluation
    const results = await runEvaluation(prompts, model, systemPrompt);

    // Save run if runName is provided
    if (runName && runName.trim()) {
      const actualModel = model || DEFAULT_MODEL;
      await saveRun(runName.trim(), actualModel, systemPrompt || '', results);
      console.log(`Saved run: ${runName}`);
    }

    // Return results
    res.json({
      success: true,
      total: results.length,
      cached: results.filter(r => r.cached).length,
      errors: results.filter(r => r.error).length,
      results,
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
 * Returns: Specific run in Promptfoo-compatible format
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

    // Convert to Promptfoo format for frontend compatibility
    const promptfooFormat = convertToPromptfooFormat(savedRun);

    res.json(promptfooFormat);
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

export default router;
