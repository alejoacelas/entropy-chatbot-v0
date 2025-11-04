import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EvaluationResult } from '../types.js';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';
import { generateTextWithRetry } from '../utils/aiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SYSTEM_PROMPT_PATH = path.join(__dirname, '../../prompts/system.txt');
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Load system prompt template from file
 */
async function loadSystemPromptTemplate(customTemplate?: string): Promise<string> {
  if (customTemplate) {
    return customTemplate;
  }

  try {
    const template = await fs.readFile(DEFAULT_SYSTEM_PROMPT_PATH, 'utf-8');
    return template;
  } catch (error) {
    console.error('Failed to load system prompt template, using default');
    return 'You are a helpful AI assistant.\n\nUser message: {user_message}';
  }
}

/**
 * Replace {user_message} placeholder in system prompt with actual user message
 */
function applyPromptTemplate(template: string, userMessage: string): string {
  return template.replace(/{user_message}/g, userMessage);
}

/**
 * Run evaluation for a single prompt
 */
async function evaluatePrompt(
  prompt: string,
  model: string,
  systemPromptTemplate: string
): Promise<EvaluationResult> {
  try {
    // Apply template to generate final system prompt
    const systemPrompt = applyPromptTemplate(systemPromptTemplate, prompt);

    // Check cache first
    const cached = await getCachedResponse(model, systemPrompt, prompt);
    if (cached) {
      console.log(`Cache hit for prompt: "${prompt.substring(0, 50)}..."`);
      return {
        prompt,
        response: cached.response,
        cached: true,
        latencyMs: cached.latencyMs,
      };
    }

    // Cache miss - call AI API
    console.log(`Cache miss for prompt: "${prompt.substring(0, 50)}..."`);
    const result = await generateTextWithRetry({
      model,
      systemPrompt,
      userMessage: prompt,
    });

    // Save to cache
    await setCachedResponse(model, systemPrompt, prompt, result.text, result.latencyMs);

    return {
      prompt,
      response: result.text,
      cached: false,
      latencyMs: result.latencyMs,
    };
  } catch (error) {
    console.error(`Error evaluating prompt: "${prompt.substring(0, 50)}..."`, error);
    return {
      prompt,
      response: '',
      cached: false,
      latencyMs: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run evaluation for multiple prompts
 */
export async function runEvaluation(
  prompts: string[],
  model?: string,
  systemPrompt?: string
): Promise<EvaluationResult[]> {
  const modelToUse = model || DEFAULT_MODEL;
  const systemPromptTemplate = await loadSystemPromptTemplate(systemPrompt);

  console.log(`Starting evaluation with model: ${modelToUse}`);
  console.log(`Total prompts: ${prompts.length}`);

  const results: EvaluationResult[] = [];

  // Process prompts sequentially to respect rate limits
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`Processing prompt ${i + 1}/${prompts.length}`);

    const result = await evaluatePrompt(prompt, modelToUse, systemPromptTemplate);
    results.push(result);
  }

  // Summary
  const cached = results.filter(r => r.cached).length;
  const errors = results.filter(r => r.error).length;
  console.log(`Evaluation complete: ${results.length} total, ${cached} cached, ${errors} errors`);

  return results;
}
