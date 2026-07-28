import { get, put } from "@vercel/blob";
import type { Workspace } from "./types";

const PATHNAME = "entropy-lab/workspace.json";

const now = () => new Date().toISOString();

export function defaultWorkspace(): Workspace {
  const createdAt = now();
  return {
    version: 1,
    captureEnabled: true,
    prompts: [
      {
        id: "prompt-direct",
        name: "Direct operator",
        content:
          "You are an operational assistant for small, high-impact organizations. Lead with the answer. Be concise, practical, and explicit about assumptions. Use bullets when they make the next action clearer.",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "prompt-clarifying",
        name: "Clarify first",
        content:
          "You are an operational assistant for small, high-impact organizations. Identify the decision behind the request. If one missing fact would materially change the answer, ask one short question; otherwise state your assumption and answer directly.",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    cases: [],
    collections: [
      { id: "collection-inbox", name: "Inbox", caseIds: [], createdAt },
    ],
    messages: [],
    runs: [],
    updatedAt: createdAt,
  };
}

let localWorkspace: Workspace | null = null;

export async function loadWorkspace(): Promise<Workspace> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    localWorkspace ??= defaultWorkspace();
    return localWorkspace;
  }

  try {
    const result = await get(PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return defaultWorkspace();
    return JSON.parse(await new Response(result.stream).text()) as Workspace;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not found") || message.includes("404")) return defaultWorkspace();
    throw error;
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<Workspace> {
  const saved = { ...workspace, updatedAt: now() };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    localWorkspace = saved;
    return saved;
  }

  await put(PATHNAME, JSON.stringify(saved), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
  return saved;
}
