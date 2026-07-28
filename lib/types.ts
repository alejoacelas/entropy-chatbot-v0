export type PromptVariant = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type TestCase = {
  id: string;
  text: string;
  source: "playground" | "manual" | "import";
  createdAt: string;
};

export type Collection = {
  id: string;
  name: string;
  caseIds: string[];
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelId?: string;
  createdAt: string;
};

export type RunResult = {
  id: string;
  caseId: string;
  promptId: string;
  modelId: string;
  output: string;
  latencyMs: number;
  error?: string;
};

export type ExperimentRun = {
  id: string;
  name: string;
  createdAt: string;
  caseIds: string[];
  promptIds: string[];
  modelIds: string[];
  results: RunResult[];
};

export type Workspace = {
  version: 1;
  captureEnabled: boolean;
  prompts: PromptVariant[];
  cases: TestCase[];
  collections: Collection[];
  messages: ChatMessage[];
  runs: ExperimentRun[];
  updatedAt: string;
};

export type ModelOption = {
  id: string;
  name: string;
};
