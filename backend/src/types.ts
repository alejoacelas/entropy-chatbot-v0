export interface EvaluationRequest {
  prompts?: string[];
  model?: string;
  systemPrompt?: string;
  runName?: string;
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

export interface PromptResult {
  promptName: string;
  promptContent: string;
  results: EvaluationResult[];
}

export interface SavedRun {
  runName: string;
  datasetName: string;
  model: string;
  timestamp: number;
  promptResults: PromptResult[];
  summary: {
    totalPrompts: number;
    totalTests: number;
    cached: number;
    errors: number;
  };
}

// Promptfoo-compatible format for the frontend
export interface PromptfooResult {
  evalId: string;
  results: {
    results: PromptfooTestResult[];
  };
}

export interface PromptfooTestResult {
  testIdx: number;
  testCase: {
    vars: Record<string, any>;
  };
  prompt: {
    label: string;
    raw: string;
  };
  provider: {
    label: string;
  };
  response: {
    output: string;
  };
  gradingResult?: {
    pass: boolean;
    score: number;
    reason?: string;
  };
  latencyMs: number;
}
