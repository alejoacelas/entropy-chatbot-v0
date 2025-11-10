import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RATINGS_DIR = path.join(__dirname, '../../ratings');

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

// Ensure ratings directory exists
async function ensureRatingsDir() {
  try {
    await fs.access(RATINGS_DIR);
  } catch {
    await fs.mkdir(RATINGS_DIR, { recursive: true });
  }
}

// Sanitize string for use in filename
function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Get rating file path
function getRatingFilePath(runName: string, ratingUser: string): string {
  const sanitizedRun = sanitize(runName);
  const sanitizedUser = sanitize(ratingUser);
  return path.join(RATINGS_DIR, `${sanitizedRun}_${sanitizedUser}.json`);
}

// Load ratings for a specific run and user
export async function loadRatings(
  runName: string,
  ratingUser: string
): Promise<SavedRating | null> {
  await ensureRatingsDir();

  const filePath = getRatingFilePath(runName, ratingUser);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
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
  await ensureRatingsDir();

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

  const filePath = getRatingFilePath(runName, ratingUser);
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), 'utf-8');
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
