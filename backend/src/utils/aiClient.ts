import { streamText } from 'ai';
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
  webSearch?: boolean;
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
 * Uses streaming API but collects all parts into a complete response
 * Converts citations to inline markdown links for Streamdown rendering
 * Retry on rate limit errors with delays: 1s, 2s, 4s, 8s, 16s
 */
export async function generateTextWithRetry(
  options: GenerateTextOptions
): Promise<GenerateTextResult> {
  const { model, systemPrompt, userMessage, maxTokens = 16000, webSearch = false } = options;

  const maxRetries = 5;
  const baseDelay = 1000; // 1 second

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      // Create web search tool if enabled
      const webSearchTool = webSearch ? anthropic.tools.webSearch_20250305() : undefined;

      const result = streamText({
        model: anthropic(model),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        maxOutputTokens: maxTokens,
        tools: webSearchTool ? {
          web_search: webSearchTool,
        } : undefined,
        providerOptions: {
          anthropic: {
            thinking: {
              type: 'enabled' as const,
              budgetTokens: 10000
            },
          },
        },
      });

      // Collect all parts from the stream
      let markdownText = '';
      let reasoningText = '';
      let citationCounter = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          markdownText += part.text;
        } else if (part.type === 'reasoning-delta') {
          // Accumulate reasoning text
          reasoningText += part.text;
        } else if (part.type === 'reasoning-end') {
          // Wrap accumulated reasoning in <thinking> tags
          if (reasoningText) {
            markdownText += `<thinking>${reasoningText}</thinking>`;
            reasoningText = ''; // Reset for next reasoning block
          }
        } else if ((part as any).type === 'citation') {
          // Add inline citation as markdown link with superscript
          // Using 'any' cast because patches add this type dynamically
          const citation = part as any;
          citationCounter++;
          markdownText += `[<sup>${citationCounter}</sup>](${citation.url})`;
        } else if (part.type === 'finish') {
          // Capture usage from finish event
          if (part.totalUsage) {
            promptTokens = part.totalUsage.inputTokens || 0;
            completionTokens = part.totalUsage.outputTokens || 0;
          }
        }
        // Other parts (source, file, tool-call, etc.) are ignored
      }

      const latencyMs = Date.now() - startTime;

      return {
        text: markdownText,
        latencyMs,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
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
