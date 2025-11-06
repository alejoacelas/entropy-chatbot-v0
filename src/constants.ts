/**
 * Application-wide constants
 */

/**
 * Default Claude model to use for evaluations
 * Model: Claude Sonnet 4.5 (latest)
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * localStorage keys for persisting user data
 */
export const STORAGE_KEYS = {
  SYSTEM_PROMPTS: 'savedSystemPrompts',
  REVIEW_ANNOTATIONS: 'review_annotations',
} as const;
