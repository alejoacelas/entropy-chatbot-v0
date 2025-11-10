import { StorageFactory } from '../storage/index.js';

export interface SavedDataset {
  name: string;
  prompts: string[];
  timestamp: number;
}

// Sanitize dataset name for use as filename
function sanitizeDatasetName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get dataset storage key
function getDatasetKey(datasetName: string): string {
  const sanitized = sanitizeDatasetName(datasetName);
  return `datasets/${sanitized}.json`;
}

// Save a dataset
export async function saveDataset(
  datasetName: string,
  prompts: string[]
): Promise<void> {
  const storage = StorageFactory.getStorage();

  const savedDataset: SavedDataset = {
    name: datasetName,
    prompts,
    timestamp: Date.now(),
  };

  const key = getDatasetKey(datasetName);
  await storage.save(key, savedDataset);
}

// List all saved datasets
export async function listDatasets(): Promise<string[]> {
  const storage = StorageFactory.getStorage();

  try {
    const files = await storage.list('datasets/');
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read each file to get the original name
    const datasets = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const key = `datasets/${file}`;
          const parsed = await storage.load<SavedDataset>(key);
          return parsed?.name || file.replace('.json', '').replace(/_/g, ' ');
        } catch {
          // If file is corrupt, return filename without extension
          return file.replace('.json', '').replace(/_/g, ' ');
        }
      })
    );

    return datasets.sort();
  } catch (error) {
    return [];
  }
}

// Load a specific dataset
export async function loadDataset(datasetName: string): Promise<SavedDataset | null> {
  const storage = StorageFactory.getStorage();
  const key = getDatasetKey(datasetName);
  return await storage.load<SavedDataset>(key);
}
