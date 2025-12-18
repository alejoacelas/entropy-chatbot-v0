import express from 'express';
import multer from 'multer';
import { runMultiPromptEvaluation } from '../services/evaluationService.js';
import { parseCsvImport, extractUniquePrompts, extractUniqueQuestions, resolvePromptContent } from '../utils/csvParser.js';
import { saveRun, listRuns, loadRun } from '../utils/runStorage.js';
import { saveDataset, listDatasets, loadDataset } from '../utils/datasetStorage.js';
import { savePrompt, listPrompts, loadPrompt, deletePrompt } from '../utils/promptStorage.js';
import { loadRating, saveRating } from '../utils/ratingStorage.js';
import { setCachedResponse } from '../utils/cache.js';
import { CsvImportRow } from '../types.js';

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
 * Validate prompts from CSV against stored prompts
 * Returns validation result with prompts to register
 */
async function validateAndPreparePrompts(
  uniquePrompts: Array<{ name: string; content: string }>
): Promise<{
  valid: boolean;
  errors: string[];
  promptsToRegister: Array<{ name: string; content: string }>;
  existingPrompts: Array<{ name: string; content: string }>;
}> {
  const errors: string[] = [];
  const promptsToRegister: Array<{ name: string; content: string }> = [];
  const existingPrompts: Array<{ name: string; content: string }> = [];

  for (const { name, content } of uniquePrompts) {
    const existing = await loadPrompt(name);

    if (existing) {
      // Check if content matches
      if (existing.content === content) {
        // Same content - use existing
        existingPrompts.push({ name, content });
      } else {
        // Different content - error
        errors.push(
          `Prompt '${name}' already exists with different content. ` +
          `Please use a different prompt name or update the existing prompt first.`
        );
      }
    } else {
      // New prompt - needs registration
      promptsToRegister.push({ name, content });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    promptsToRegister,
    existingPrompts,
  };
}

/**
 * Pre-populate cache with imported answers
 * Uses the same cache key computation as evaluationService
 */
async function prepopulateCache(
  importRows: CsvImportRow[],
  model: string
): Promise<{ cached: number; errors: string[] }> {
  let cached = 0;
  const errors: string[] = [];

  for (const row of importRows) {
    try {
      // Apply the prompt template to get the actual system prompt used for caching
      // This matches the behavior in evaluationService.ts:48
      const appliedSystemPrompt = row.promptContent.replace(/{user_message}/g, row.question);

      await setCachedResponse(
        model,
        appliedSystemPrompt,
        row.question,
        row.answer,
        0 // latencyMs = 0 for imported responses
      );
      cached++;
    } catch (error) {
      errors.push(
        `Failed to cache answer for question "${row.question.substring(0, 50)}...": ` +
        (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  return { cached, errors };
}

/**
 * POST /api/evaluate
 *
 * Accepts CSV file with question, prompt_name, prompt, and answer columns.
 * Auto-registers prompts, pre-populates cache, and runs evaluation.
 * Also supports loading existing datasets and selecting additional prompts.
 *
 * Body format (multipart):
 * {
 *   file?: File,                    // CSV upload with question/prompt_name/prompt/answer columns
 *   datasetName: string,            // Name for new dataset or existing dataset to load
 *   promptNames?: string[],         // Additional prompt names to include (beyond those in CSV)
 *   runName: string,                // Name for this evaluation run
 *   model?: string                  // Model to use (optional, defaults to claude-sonnet-4-5-20250929)
 * }
 */
router.post('/evaluate', upload.single('file'), async (req, res) => {
  // Set timeout to 30 minutes for this specific endpoint
  req.setTimeout(1800000);
  res.setTimeout(1800000);

  try {
    let datasetPrompts: string[] = [];
    let datasetName = '';
    const systemPrompts: Array<{ name: string; content: string }> = [];
    let promptsRegistered = 0;
    let cacheEntriesCreated = 0;

    const model = req.body.model || DEFAULT_MODEL;

    // Run name is required
    const runName = req.body.runName;
    if (!runName || !runName.trim()) {
      return res.status(400).json({
        error: 'runName is required.',
      });
    }

    // Check if CSV file was uploaded
    if (req.file) {
      // Dataset name is required when uploading CSV
      datasetName = req.body.datasetName;
      if (!datasetName || !datasetName.trim()) {
        return res.status(400).json({
          error: 'Dataset name is required when uploading a CSV file.',
        });
      }

      // Parse CSV (prompt column is optional)
      const csvContent = req.file.buffer.toString('utf-8');
      let importRows = parseCsvImport(csvContent);

      console.log(`Parsed CSV with ${importRows.length} rows`);

      // Load all registered prompts to resolve missing prompt content
      const registeredPromptNames = await listPrompts();
      const registeredPromptsMap = new Map<string, string>();
      for (const name of registeredPromptNames) {
        const prompt = await loadPrompt(name);
        if (prompt) {
          registeredPromptsMap.set(name, prompt.content);
        }
      }

      // Resolve missing prompt content from registered prompts
      const resolved = resolvePromptContent(importRows, registeredPromptsMap);
      if (resolved.errors.length > 0) {
        return res.status(400).json({
          error: 'Failed to resolve prompt content',
          details: resolved.errors,
        });
      }
      importRows = resolved.rows;

      // Extract unique prompts and questions from CSV
      const csvPrompts = extractUniquePrompts(importRows);
      const uniqueQuestions = extractUniqueQuestions(importRows);
      datasetPrompts = uniqueQuestions;

      console.log(`Found ${csvPrompts.length} unique prompts and ${uniqueQuestions.length} unique questions in CSV`);

      // Validate CSV prompts against storage (allows same content, errors on different content)
      const validation = await validateAndPreparePrompts(csvPrompts);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Prompt validation failed',
          details: validation.errors,
        });
      }

      // Auto-register new prompts from CSV (skips if already registered with same content)
      for (const { name, content } of validation.promptsToRegister) {
        await savePrompt(name, content);
        console.log(`Auto-registered prompt: ${name}`);
        promptsRegistered++;
      }

      // Pre-populate cache with imported answers
      const cacheResult = await prepopulateCache(importRows, model);
      cacheEntriesCreated = cacheResult.cached;
      console.log(`Pre-populated cache with ${cacheResult.cached} entries`);

      if (cacheResult.errors.length > 0) {
        console.warn('Cache population warnings:', cacheResult.errors);
      }

      // Save the dataset (unique questions only)
      await saveDataset(datasetName.trim(), datasetPrompts);
      console.log(`Saved dataset: ${datasetName} (${datasetPrompts.length} unique questions)`);

      // Add CSV prompts to system prompts
      for (const prompt of csvPrompts) {
        systemPrompts.push(prompt);
      }
    }
    // No CSV - load existing dataset
    else if (req.body.datasetName && typeof req.body.datasetName === 'string') {
      const dataset = await loadDataset(req.body.datasetName);
      if (!dataset) {
        return res.status(404).json({
          error: `Dataset not found: ${req.body.datasetName}`,
        });
      }
      datasetPrompts = dataset.prompts;
      datasetName = req.body.datasetName;
      console.log(`Loaded existing dataset: ${datasetName} (${datasetPrompts.length} prompts)`);
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

    // Get additional prompt names from request (if any)
    let promptNames = req.body.promptNames;

    // If promptNames is a string (from FormData), parse it as JSON
    if (typeof promptNames === 'string') {
      try {
        promptNames = JSON.parse(promptNames);
      } catch (e) {
        // Ignore parse errors - promptNames is optional
        promptNames = [];
      }
    }

    // Load additional prompts by name (beyond those from CSV)
    if (promptNames && Array.isArray(promptNames) && promptNames.length > 0) {
      const existingPromptNames = new Set(systemPrompts.map(p => p.name));

      for (const name of promptNames) {
        // Skip if already added from CSV
        if (existingPromptNames.has(name)) {
          continue;
        }

        const prompt = await loadPrompt(name);
        if (!prompt) {
          return res.status(404).json({
            error: `System prompt not found: ${name}`,
          });
        }
        systemPrompts.push({ name: prompt.name, content: prompt.content });
      }
    }

    // Must have at least one system prompt
    if (systemPrompts.length === 0) {
      return res.status(400).json({
        error: 'No system prompts specified. Either include prompts in CSV or provide promptNames.',
      });
    }

    console.log(`Running evaluation:`);
    console.log(`- Dataset: ${datasetName} (${datasetPrompts.length} questions)`);
    console.log(`- System prompts: ${systemPrompts.map(p => p.name).join(', ')}`);
    console.log(`- Run name: ${runName}`);
    console.log(`- Model: ${model}`);

    // Run evaluation
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
    await saveRun(
      runName.trim(),
      datasetName.trim(),
      model,
      promptResults
    );
    console.log(`Saved run: ${runName}`);

    // Return results
    res.json({
      success: true,
      runName: runName.trim(),
      datasetName: datasetName.trim(),
      model,
      promptResults,
      summary: {
        totalPrompts: systemPrompts.length,
        totalTests,
        cached: totalCached,
        errors: totalErrors,
        promptsRegistered,
        cacheEntriesCreated,
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
 * Body: { model: string, systemPrompt: string, question: string, response: string, ratingUser: string, rating: number, comment: string }
 */
router.post('/ratings', async (req, res) => {
  try {
    const { model, systemPrompt, question, response, ratingUser, rating, comment } = req.body;

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

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const commentStr = typeof comment === 'string' ? comment : '';

    await saveRating(model, systemPrompt, question, response, ratingUser, rating, commentStr);

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
