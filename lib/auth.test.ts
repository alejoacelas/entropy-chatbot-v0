import { describe, expect, it } from "vitest";
import { accessToken } from "./auth";

describe("access token", () => {
  it("is deterministic without exposing the access code", async () => {
    const token = await accessToken("example-code");
    expect(token).toHaveLength(64);
    expect(token).toBe(await accessToken("example-code"));
    expect(token).not.toContain("example-code");
  });
});
