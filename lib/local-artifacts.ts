import type { ExperimentRun, RunResult } from "./types";

const processStore = globalThis as typeof globalThis & {
  entropyLabRuns?: Map<string, ExperimentRun>;
  entropyLabResults?: Map<string, RunResult>;
};

export const localRuns = processStore.entropyLabRuns ??= new Map();
export const localResults = processStore.entropyLabResults ??= new Map();
