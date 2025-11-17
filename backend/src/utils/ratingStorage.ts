import { createHash } from 'crypto';
import { StorageFactory } from '../storage/index.js';

export interface QuestionRating {
  model: string;
  systemPrompt: string;
  question: string;
  response: string;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
}

export interface SavedRating {
  contentHash: string;
  ratingUser: string;
  timestamp: number;
  rating: QuestionRating;
}

// Sanitize string for use in filename
function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Generate content hash from model, system prompt, question, and response
export function generateContentHash(
  model: string,
  systemPrompt: string,
  question: string,
  response: string
): string {
  const hash = createHash('sha256');
  hash.update(`${model}|${systemPrompt}|${question}|${response}`);
  return hash.digest('hex');
}

// Get rating storage key
function getRatingKey(contentHash: string, ratingUser: string): string {
  const sanitizedUser = sanitize(ratingUser);
  return `ratings/${contentHash}_${sanitizedUser}.json`;
}

// Load rating for a specific content and user
export async function loadRating(
  model: string,
  systemPrompt: string,
  question: string,
  response: string,
  ratingUser: string
): Promise<SavedRating | null> {
  const storage = StorageFactory.getStorage();
  const contentHash = generateContentHash(model, systemPrompt, question, response);
  const key = getRatingKey(contentHash, ratingUser);

  try {
    const data = await storage.load<SavedRating>(key);
    return data || null;
  } catch (error) {
    // Return null if file doesn't exist
    return null;
  }
}

// Save a single rating for a question
export async function saveRating(
  model: string,
  systemPrompt: string,
  question: string,
  response: string,
  ratingUser: string,
  rating: number,
  comment: string
): Promise<void> {
  const storage = StorageFactory.getStorage();
  const contentHash = generateContentHash(model, systemPrompt, question, response);

  const savedRating: SavedRating = {
    contentHash,
    ratingUser,
    timestamp: Date.now(),
    rating: {
      model,
      systemPrompt,
      question,
      response,
      rating,
      comment,
      timestamp: Date.now(),
    },
  };

  const key = getRatingKey(contentHash, ratingUser);
  await storage.save(key, savedRating);
}

