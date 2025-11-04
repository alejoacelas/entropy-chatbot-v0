import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Sleep utility for exponential backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is a rate limit error
function isRateLimitError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const statusCode = error?.statusCode || error?.status;

  return (
    statusCode === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

export interface GenerateTextOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate text with exponential backoff retry logic
 * Retry on rate limit errors with delays: 1s, 2s, 4s, 8s, 16s
 */
export async function generateTextWithRetry(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const { model, systemPrompt, userMessage, maxTokens = 16000 } = options;

  const maxRetries = 5;
  const baseDelay = 1000; // 1 second

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      const result = await generateText({
        model: anthropic(model),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        maxTokens,
      });

      const latencyMs = Date.now() - startTime;

      return {
        text: result.text,
        latencyMs,
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        } : undefined,
      };
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error
      if (isRateLimitError(error)) {
        // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s
        const delay = baseDelay * Math.pow(2, attempt);

        console.log(
          `Rate limit error (attempt ${attempt + 1}/${maxRetries}). ` +
          `Retrying in ${delay}ms...`
        );

        // Don't sleep on the last attempt
        if (attempt < maxRetries - 1) {
          await sleep(delay);
          continue;
        }
      }

      // If it's not a rate limit error, or we've exhausted retries, throw
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
