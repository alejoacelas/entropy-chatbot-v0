import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPTS_DIR = path.join(__dirname, '../../prompts');

export interface SavedPrompt {
  name: string;
  content: string;
  timestamp: number;
}

// Ensure prompts directory exists
async function ensurePromptsDir() {
  try {
    await fs.access(PROMPTS_DIR);
  } catch {
    await fs.mkdir(PROMPTS_DIR, { recursive: true });
  }
}

// Sanitize prompt name for use as filename
function sanitizePromptName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get prompt file path
function getPromptFilePath(promptName: string): string {
  const sanitized = sanitizePromptName(promptName);
  return path.join(PROMPTS_DIR, `${sanitized}.json`);
}

// Save a prompt to disk
export async function savePrompt(
  promptName: string,
  content: string
): Promise<void> {
  await ensurePromptsDir();

  const savedPrompt: SavedPrompt = {
    name: promptName,
    content,
    timestamp: Date.now(),
  };

  const filePath = getPromptFilePath(promptName);
  await fs.writeFile(filePath, JSON.stringify(savedPrompt, null, 2), 'utf-8');
}

// List all saved prompts
export async function listPrompts(): Promise<string[]> {
  await ensurePromptsDir();

  try {
    const files = await fs.readdir(PROMPTS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read each file to get the original name
    const prompts = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(PROMPTS_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const parsed: SavedPrompt = JSON.parse(data);
          return parsed.name;
        } catch {
          // If file is corrupt, return filename without extension
          return file.replace('.json', '').replace(/_/g, ' ');
        }
      })
    );

    return prompts.sort();
  } catch (error) {
    return [];
  }
}

// Load a specific prompt
export async function loadPrompt(promptName: string): Promise<SavedPrompt | null> {
  await ensurePromptsDir();

  const filePath = getPromptFilePath(promptName);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Delete a specific prompt
export async function deletePrompt(promptName: string): Promise<boolean> {
  await ensurePromptsDir();

  const filePath = getPromptFilePath(promptName);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
