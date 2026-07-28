import { get, put } from "@vercel/blob";
import type { Workspace } from "./types";
import { canonicalPrompts } from "./canonical-prompts";

const PATHNAME = "entropy-lab/workspace.json";

const now = () => new Date().toISOString();

export function defaultWorkspace(): Workspace {
  const createdAt = now();
  return {
    version: 3,
    captureEnabled: true,
    prompts: canonicalPrompts(),
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

export function upgradeWorkspace(value: unknown): { workspace: Workspace; migrated: boolean } {
  const candidate = value as Partial<Omit<Workspace, "version">> & { version?: number };
  if (candidate.version === 3 && Array.isArray(candidate.prompts)) {
    return { workspace: candidate as Workspace, migrated: false };
  }
  if ((candidate.version === 1 || candidate.version === 2) && Array.isArray(candidate.prompts)) {
    const placeholders = new Set(["prompt-direct", "prompt-clarifying"]);
    const canonicalIds = new Set(canonicalPrompts().map((prompt) => prompt.id));
    const userPrompts = candidate.prompts.filter(
      (prompt) => !placeholders.has(prompt.id) && !canonicalIds.has(prompt.id),
    );
    return {
      workspace: {
        ...(candidate as Omit<Workspace, "version" | "prompts">),
        version: 3,
        prompts: [...canonicalPrompts(), ...userPrompts],
      },
      migrated: true,
    };
  }
  return { workspace: defaultWorkspace(), migrated: true };
}

export async function loadWorkspace(): Promise<Workspace> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    localWorkspace ??= defaultWorkspace();
    return localWorkspace;
  }

  try {
    const result = await get(PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return saveWorkspace(defaultWorkspace());
    const parsed = JSON.parse(await new Response(result.stream).text());
    const { workspace, migrated } = upgradeWorkspace(parsed);
    return migrated ? saveWorkspace(workspace) : workspace;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not found") || message.includes("404")) return saveWorkspace(defaultWorkspace());
    throw error;
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<Workspace> {
  const saved = { ...workspace, updatedAt: now() };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
    }
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
