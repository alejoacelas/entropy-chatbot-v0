import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptVariant } from "./types";

function promptFile(name: string) {
  return readFileSync(join(process.cwd(), "prompts", name), "utf8");
}

export function canonicalPrompts(): PromptVariant[] {
  return [
    {
      id: "prompt-aerin-original-experimental",
      name: "Aerin — original experimental",
      content: promptFile("original-experimental.txt"),
      createdAt: "2025-12-19T00:00:00.000Z",
      updatedAt: "2025-12-19T00:00:00.000Z",
    },
    {
      id: "prompt-aerin-original-default",
      name: "Aerin — original default",
      content: promptFile("original-default.txt"),
      createdAt: "2025-11-26T00:00:00.000Z",
      updatedAt: "2025-11-26T00:00:00.000Z",
    },
    {
      id: "prompt-aerin-portal",
      name: "Aerin — current portal instructions",
      content: promptFile("aerin-live.txt"),
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    },
  ];
}
