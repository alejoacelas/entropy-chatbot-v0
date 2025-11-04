import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CacheEntry } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '../../cache');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

// Generate cache key from model, system prompt, and user message
export function generateCacheKey(
  model: string,
  systemPrompt: string,
  userMessage: string
): string {
  const hash = createHash('sha256');
  hash.update(`${model}|${systemPrompt}|${userMessage}`);
  return hash.digest('hex');
}

// Get cache file path
function getCacheFilePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

// Get cached response if it exists
export async function getCachedResponse(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<CacheEntry | null> {
  await ensureCacheDir();

  const key = generateCacheKey(model, systemPrompt, userMessage);
  const filePath = getCacheFilePath(key);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(data);
    return entry;
  } catch (error) {
    // Cache miss
    return null;
  }
}

// Save response to cache
export async function setCachedResponse(
  model: string,
  systemPrompt: string,
  userMessage: string,
  response: string,
  latencyMs: number
): Promise<void> {
  await ensureCacheDir();

  const key = generateCacheKey(model, systemPrompt, userMessage);
  const filePath = getCacheFilePath(key);

  const entry: CacheEntry = {
    prompt: userMessage,
    response,
    model,
    systemPrompt,
    timestamp: Date.now(),
    latencyMs,
  };

  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}
