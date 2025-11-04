export interface EvaluationRequest {
  prompts?: string[];
  model?: string;
  systemPrompt?: string;
}

export interface EvaluationResult {
  prompt: string;
  response: string;
  cached: boolean;
  latencyMs: number;
  error?: string;
}

export interface CacheEntry {
  prompt: string;
  response: string;
  model: string;
  systemPrompt: string;
  timestamp: number;
  latencyMs: number;
}
