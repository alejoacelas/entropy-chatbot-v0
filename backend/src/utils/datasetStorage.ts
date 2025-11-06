import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASETS_DIR = path.join(__dirname, '../../datasets');

export interface SavedDataset {
  name: string;
  prompts: string[];
  timestamp: number;
}

// Ensure datasets directory exists
async function ensureDatasetsDir() {
  try {
    await fs.access(DATASETS_DIR);
  } catch {
    await fs.mkdir(DATASETS_DIR, { recursive: true });
  }
}

// Sanitize dataset name for use as filename
function sanitizeDatasetName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get dataset file path
function getDatasetFilePath(datasetName: string): string {
  const sanitized = sanitizeDatasetName(datasetName);
  return path.join(DATASETS_DIR, `${sanitized}.json`);
}

// Save a dataset to disk
export async function saveDataset(
  datasetName: string,
  prompts: string[]
): Promise<void> {
  await ensureDatasetsDir();

  const savedDataset: SavedDataset = {
    name: datasetName,
    prompts,
    timestamp: Date.now(),
  };

  const filePath = getDatasetFilePath(datasetName);
  await fs.writeFile(filePath, JSON.stringify(savedDataset, null, 2), 'utf-8');
}

// List all saved datasets
export async function listDatasets(): Promise<string[]> {
  await ensureDatasetsDir();

  try {
    const files = await fs.readdir(DATASETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    return jsonFiles.map(f => f.replace('.json', '').replace(/_/g, ' '));
  } catch (error) {
    return [];
  }
}

// Load a specific dataset
export async function loadDataset(datasetName: string): Promise<SavedDataset | null> {
  await ensureDatasetsDir();

  const filePath = getDatasetFilePath(datasetName);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}
