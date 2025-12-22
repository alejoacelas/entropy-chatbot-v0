import { StorageFactory } from '../storage/index.js';
import { SavedRun, PromptResult } from '../types.js';

// Sanitize run name for use as filename
function sanitizeRunName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get run storage key
function getRunKey(runName: string): string {
  const sanitized = sanitizeRunName(runName);
  return `runs/${sanitized}.json`;
}

// Save a run (new multi-prompt format)
export async function saveRun(
  runName: string,
  datasetName: string,
  model: string,
  promptResults: PromptResult[]
): Promise<void> {
  const storage = StorageFactory.getStorage();

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

  const key = getRunKey(runName);
  await storage.save(key, savedRun);
}

// List all saved runs
export async function listRuns(): Promise<string[]> {
  const storage = StorageFactory.getStorage();

  try {
    const files = await storage.list('runs/');
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read each file to get the original name and timestamp
    const runsWithTimestamp = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const key = `runs/${file}`;
          const parsed = await storage.load<SavedRun>(key);
          return {
            name: parsed?.runName || file.replace('.json', '').replace(/_/g, ' '),
            timestamp: parsed?.timestamp || 0
          };
        } catch {
          // If file is corrupt, return filename without extension
          return {
            name: file.replace('.json', '').replace(/_/g, ' '),
            timestamp: 0
          };
        }
      })
    );

    // Sort by timestamp descending (newest first)
    runsWithTimestamp.sort((a, b) => b.timestamp - a.timestamp);

    return runsWithTimestamp.map(r => r.name);
  } catch (error) {
    return [];
  }
}

// Load a specific run
export async function loadRun(runName: string): Promise<SavedRun | null> {
  const storage = StorageFactory.getStorage();
  const key = getRunKey(runName);
  return await storage.load<SavedRun>(key);
}
