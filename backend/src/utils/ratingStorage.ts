import { StorageFactory } from '../storage/index.js';

export interface QuestionRating {
  promptIndex: number;
  questionIndex: number;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
}

export interface SavedRating {
  runName: string;
  ratingUser: string;
  timestamp: number;
  ratings: QuestionRating[];
}

// Sanitize string for use in filename
function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get rating storage key
function getRatingKey(runName: string, ratingUser: string): string {
  const sanitizedRun = sanitize(runName);
  const sanitizedUser = sanitize(ratingUser);
  return `ratings/${sanitizedRun}_${sanitizedUser}.json`;
}

// Load ratings for a specific run and user
export async function loadRatings(
  runName: string,
  ratingUser: string
): Promise<SavedRating | null> {
  const storage = StorageFactory.getStorage();
  const key = getRatingKey(runName, ratingUser);

  try {
    const data = await storage.load<SavedRating>(key);
    if (data) {
      return data;
    }
    // Return empty ratings if file doesn't exist
    return {
      runName,
      ratingUser,
      timestamp: Date.now(),
      ratings: [],
    };
  } catch (error) {
    // Return empty ratings if file doesn't exist
    return {
      runName,
      ratingUser,
      timestamp: Date.now(),
      ratings: [],
    };
  }
}

// Save a single rating for a question
export async function saveRating(
  runName: string,
  ratingUser: string,
  promptIndex: number,
  questionIndex: number,
  rating: number,
  comment: string
): Promise<void> {
  const storage = StorageFactory.getStorage();

  // Load existing ratings
  const existing = await loadRatings(runName, ratingUser);

  if (!existing) {
    throw new Error('Failed to load existing ratings');
  }

  // Remove existing rating for this question if present
  existing.ratings = existing.ratings.filter(
    r => !(r.promptIndex === promptIndex && r.questionIndex === questionIndex)
  );

  // Add new rating
  existing.ratings.push({
    promptIndex,
    questionIndex,
    rating,
    comment,
    timestamp: Date.now(),
  });

  existing.timestamp = Date.now();

  const key = getRatingKey(runName, ratingUser);
  await storage.save(key, existing);
}

// Get rating for a specific question
export function getRating(
  savedRating: SavedRating,
  promptIndex: number,
  questionIndex: number
): QuestionRating | undefined {
  return savedRating.ratings.find(
    r => r.promptIndex === promptIndex && r.questionIndex === questionIndex
  );
}
