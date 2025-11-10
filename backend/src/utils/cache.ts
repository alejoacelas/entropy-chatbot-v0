import { createHash } from 'crypto';
import { StorageFactory } from '../storage/index.js';
import { CacheEntry } from '../types.js';

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

// Get cache storage key
function getCacheKey(key: string): string {
  return `cache/${key}.json`;
}

// Get cached response if it exists
export async function getCachedResponse(
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<CacheEntry | null> {
  const storage = StorageFactory.getStorage();
  const key = generateCacheKey(model, systemPrompt, userMessage);
  const storageKey = getCacheKey(key);

  try {
    const entry = await storage.load<CacheEntry>(storageKey);
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
  const storage = StorageFactory.getStorage();
  const key = generateCacheKey(model, systemPrompt, userMessage);
  const storageKey = getCacheKey(key);

  const entry: CacheEntry = {
    prompt: userMessage,
    response,
    model,
    systemPrompt,
    timestamp: Date.now(),
    latencyMs,
  };

  await storage.save(storageKey, entry);
}
