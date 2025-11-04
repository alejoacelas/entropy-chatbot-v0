import express from 'express';
import multer from 'multer';
import { runEvaluation } from '../services/evaluationService.js';
import { parsePromptsFromCsv } from '../utils/csvParser.js';
import { saveRun, listRuns, loadRun, convertToPromptfooFormat } from '../utils/runStorage.js';
import { EvaluationRequest } from '../types.js';

const router = express.Router();

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
 * - OR JSON body with prompts array
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
        error: 'No prompts provided. Send either a CSV file or a prompts array in JSON.',
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
      const actualModel = model || 'claude-sonnet-4-5-20250929';
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

export default router;
