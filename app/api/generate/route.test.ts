import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("generation agent loop", () => {
  it("gives the model live Resource Portal results and reports the search", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    let anthropicCalls = 0;
    let firstAnthropicBody: Record<string, unknown> | undefined;
    let secondAnthropicBody: Record<string, unknown> | undefined;

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://aerin.bot/api/search")) {
        expect(url).toContain("q=SparkWell");
        return Response.json({
          results: [{
            title: "SparkWell FAQs",
            url: "https://resourceportal.antientropy.org/docs/sparkwell-faqs",
            description: "Program FAQ",
            contentText: "SparkWell article",
          }],
        });
      }

      anthropicCalls += 1;
      if (anthropicCalls === 1) {
        firstAnthropicBody = JSON.parse(String(init?.body));
        return Response.json({
          stop_reason: "tool_use",
          content: [{
            type: "tool_use",
            id: "tool-1",
            name: "search_resource_portal",
            input: { query: "SparkWell" },
          }],
          usage: { input_tokens: 10, output_tokens: 4 },
        });
      }

      secondAnthropicBody = JSON.parse(String(init?.body));
      return Response.json({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "SparkWell answer with citation." }],
        usage: { input_tokens: 20, output_tokens: 6 },
      });
    }));

    const response = await POST(new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        modelId: "claude-opus-5",
        systemPrompt: "Use the portal.",
        messages: [{ role: "user", content: "What is SparkWell?" }],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      output: "SparkWell answer with citation.",
      portalSearches: 1,
      usage: { input_tokens: 30, output_tokens: 10 },
    });
    expect(JSON.stringify(secondAnthropicBody)).toContain("SparkWell article");
    expect(firstAnthropicBody).toMatchObject({
      system: "Use the portal.",
      tool_choice: { type: "tool", name: "search_resource_portal" },
    });
    expect(JSON.stringify(firstAnthropicBody)).toContain("search_resource_portal");
    expect(anthropicCalls).toBe(2);
  });
});
