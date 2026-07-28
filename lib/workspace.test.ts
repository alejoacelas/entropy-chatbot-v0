import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { defaultWorkspace, upgradeWorkspace } from "./workspace";

describe("default workspace", () => {
  it("starts with visible capture enabled and reusable prompt variants", () => {
    const workspace = defaultWorkspace();
    expect(workspace.captureEnabled).toBe(true);
    expect(workspace.collections[0]).toMatchObject({ id: "collection-inbox", name: "Inbox" });
    expect(workspace.prompts).toHaveLength(3);
    expect(workspace.prompts[0]).toMatchObject({
      id: "prompt-aerin-original-experimental",
      name: "Aerin — original experimental",
    });
    expect(Buffer.byteLength(workspace.prompts[0].content)).toBe(80_023);
    expect(Buffer.byteLength(workspace.prompts[1].content)).toBe(14_735);
    expect(createHash("sha1").update(workspace.prompts[0].content).digest("hex"))
      .toBe("66eea750901763f754284533b13506c69100a6f6");
    expect(createHash("sha1").update(workspace.prompts[1].content).digest("hex"))
      .toBe("bce523b5fd2fe5ea43c5525f0a4d20a0587e4516");
    expect(workspace.prompts[2].content).toContain("RESOURCE PORTAL");
    expect(workspace.runs).toEqual([]);
  });

  it("repairs the prompt seed once while preserving user data", () => {
    const current = defaultWorkspace();
    const userPrompt = {
      ...current.prompts[0],
      id: "prompt-user",
      name: "My prompt",
      content: "Keep me",
    };
    const legacy = {
      ...current,
      version: 2,
      prompts: [
        { ...current.prompts[0], content: current.prompts[0].content.trim() },
        userPrompt,
      ],
      runs: [{
        id: "run-existing",
        name: "Existing run",
        createdAt: current.updatedAt,
        caseIds: [],
        promptIds: [],
        modelIds: [],
        resultCount: 2,
        errorCount: 0,
      }],
    };

    const migrated = upgradeWorkspace(legacy);
    expect(migrated.migrated).toBe(true);
    expect(migrated.workspace.version).toBe(3);
    expect(Buffer.byteLength(migrated.workspace.prompts[0].content)).toBe(80_023);
    expect(migrated.workspace.prompts.find((prompt) => prompt.id === "prompt-user")?.content)
      .toBe("Keep me");
    expect(migrated.workspace.runs[0]).toMatchObject({ id: "run-existing", resultCount: 2 });
    expect(upgradeWorkspace(migrated.workspace).migrated).toBe(false);
  });
});
