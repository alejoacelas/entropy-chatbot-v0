import { StorageFactory } from '../storage/index.js';

export interface SavedPrompt {
  name: string;
  content: string;
  timestamp: number;
}

// Sanitize prompt name for use as filename
function sanitizePromptName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get prompt storage key
function getPromptKey(promptName: string): string {
  const sanitized = sanitizePromptName(promptName);
  return `prompts/${sanitized}.json`;
}

// Save a prompt
export async function savePrompt(
  promptName: string,
  content: string
): Promise<void> {
  const storage = StorageFactory.getStorage();

  const savedPrompt: SavedPrompt = {
    name: promptName,
    content,
    timestamp: Date.now(),
  };

  const key = getPromptKey(promptName);
  await storage.save(key, savedPrompt);
}

// List all saved prompts
export async function listPrompts(): Promise<string[]> {
  const storage = StorageFactory.getStorage();

  try {
    const files = await storage.list('prompts/');
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Read each file to get the original name
    const prompts = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const key = `prompts/${file}`;
          const parsed = await storage.load<SavedPrompt>(key);
          return parsed?.name || file.replace('.json', '').replace(/_/g, ' ');
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
  const storage = StorageFactory.getStorage();
  const key = getPromptKey(promptName);
  return await storage.load<SavedPrompt>(key);
}

// Delete a specific prompt
export async function deletePrompt(promptName: string): Promise<boolean> {
  const storage = StorageFactory.getStorage();
  const key = getPromptKey(promptName);

  try {
    await storage.delete(key);
    return true;
  } catch (error) {
    return false;
  }
}
