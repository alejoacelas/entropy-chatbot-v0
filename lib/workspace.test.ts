import { describe, expect, it } from "vitest";
import { defaultWorkspace } from "./workspace";

describe("default workspace", () => {
  it("starts with visible capture enabled and reusable prompt variants", () => {
    const workspace = defaultWorkspace();
    expect(workspace.captureEnabled).toBe(true);
    expect(workspace.collections[0]).toMatchObject({ id: "collection-inbox", name: "Inbox" });
    expect(workspace.prompts).toHaveLength(2);
    expect(workspace.runs).toEqual([]);
  });
});
