export interface PromptfooResult {
  evalId: string;
  results: {
    results: Result[];
  };
}

export interface Result {
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
  gradingResult: {
    pass: boolean;
    score: number;
    reason?: string;
  };
  latencyMs: number;
}

export interface Annotation {
  rating: number;
  notes: string;
}

export interface AnnotationsStore {
  [evalId: string]: {
    [testIdx: string]: {
      [promptLabel: string]: {
        [providerLabel: string]: Annotation;
      };
    };
  };
}

