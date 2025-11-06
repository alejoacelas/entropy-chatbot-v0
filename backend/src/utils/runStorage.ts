import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SavedRun, PromptResult } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNS_DIR = path.join(__dirname, '../../runs');

// Ensure runs directory exists
async function ensureRunsDir() {
  try {
    await fs.access(RUNS_DIR);
  } catch {
    await fs.mkdir(RUNS_DIR, { recursive: true });
  }
}

// Sanitize run name for use as filename
function sanitizeRunName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get run file path
function getRunFilePath(runName: string): string {
  const sanitized = sanitizeRunName(runName);
  return path.join(RUNS_DIR, `${sanitized}.json`);
}

// Save a run to disk (new multi-prompt format)
export async function saveRun(
  runName: string,
  datasetName: string,
  model: string,
  promptResults: PromptResult[]
): Promise<void> {
  await ensureRunsDir();

  // Calculate summary statistics
  let totalTests = 0;
  let totalCached = 0;
  let totalErrors = 0;

  for (const pr of promptResults) {
    totalTests += pr.results.length;
    totalCached += pr.results.filter(r => r.cached).length;
    totalErrors += pr.results.filter(r => r.error).length;
  }

  const savedRun: SavedRun = {
    runName,
    datasetName,
    model,
    timestamp: Date.now(),
    promptResults,
    summary: {
      totalPrompts: promptResults.length,
      totalTests,
      cached: totalCached,
      errors: totalErrors,
    },
  };

  const filePath = getRunFilePath(runName);
  await fs.writeFile(filePath, JSON.stringify(savedRun, null, 2), 'utf-8');
}

// List all saved runs
export async function listRuns(): Promise<string[]> {
  await ensureRunsDir();

  try {
    const files = await fs.readdir(RUNS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read each file to get the original name
    const runs = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(RUNS_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const parsed: SavedRun = JSON.parse(data);
          return parsed.runName;
        } catch {
          // If file is corrupt, return filename without extension
          return file.replace('.json', '').replace(/_/g, ' ');
        }
      })
    );

    return runs.sort();
  } catch (error) {
    return [];
  }
}

// Load a specific run
export async function loadRun(runName: string): Promise<SavedRun | null> {
  await ensureRunsDir();

  const filePath = getRunFilePath(runName);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
