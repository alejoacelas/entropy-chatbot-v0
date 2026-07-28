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
  portalSearches?: number;
  portalQueries?: string[];
  createdAt: string;
};

export type RunResult = {
  id: string;
  caseId: string;
  promptId: string;
  modelId: string;
  output: string;
  latencyMs: number;
  portalSearches?: number;
  portalQueries?: string[];
  error?: string;
  truncated?: boolean;
};

export type ExperimentRun = {
  id: string;
  name: string;
  createdAt: string;
  caseIds: string[];
  promptIds: string[];
  modelIds: string[];
  caseSnapshots: Array<{ id: string; text: string }>;
  promptSnapshots: Array<{ id: string; name: string; content: string }>;
  modelSnapshots: Array<{ id: string; name: string }>;
  results: RunResult[];
};

export type RunSummary = Omit<ExperimentRun, "results" | "caseSnapshots" | "promptSnapshots" | "modelSnapshots"> & {
  resultCount: number;
  errorCount: number;
};

export type Workspace = {
  version: 3;
  captureEnabled: boolean;
  prompts: PromptVariant[];
  cases: TestCase[];
  collections: Collection[];
  messages: ChatMessage[];
  runs: RunSummary[];
  updatedAt: string;
};

export type ModelOption = {
  id: string;
  name: string;
};
