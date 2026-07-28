import { NextResponse } from "next/server";

type GenerateBody = {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: { query?: string } };

type AnthropicPayload = {
  content?: AnthropicBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

const PORTAL_TOOL = {
  name: "search_resource_portal",
  description:
    "Search Anti Entropy's current Resource Portal. Returns up to three matching article excerpts with their canonical URLs. Use this before answering questions about SparkWell, Anti Entropy, or nonprofit operations where the portal may contain relevant guidance.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A concise search query describing the operational question.",
      },
    },
    required: ["query"],
  },
};

type PortalResult = {
  title?: string;
  url?: string;
  description?: string;
  contentText?: string;
};

const rateWindows = new Map<string, number[]>();

function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const cutoff = Date.now() - 10 * 60_000;
  const recent = (rateWindows.get(key) ?? []).filter((time) => time > cutoff);
  if (recent.length >= 120) return true;
  recent.push(Date.now());
  rateWindows.set(key, recent);
  return false;
}

async function searchResourcePortal(query: string, signal: AbortSignal) {
  const cleanQuery = query.trim().slice(0, 500);
  if (!cleanQuery) throw new Error("A search query is required");
  const url = new URL("https://aerin.bot/api/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("limit", "3");
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Resource Portal search returned ${response.status}`);
  const payload = (await response.json()) as { results?: PortalResult[] };
  if (!payload.results?.length) return `No Resource Portal articles matched "${cleanQuery}".`;
  return payload.results.map((article, index) => [
    `RESULT ${index + 1}: ${article.title || "Untitled"}`,
    `CANONICAL URL: ${article.url || "Unavailable"}`,
    article.description ? `DESCRIPTION: ${article.description}` : "",
    "ARTICLE:",
    (article.contentText || "No article text available.").slice(0, 20_000),
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
}

export const maxDuration = 120;

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "Generation limit reached. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as GenerateBody;
    if (!body.modelId?.startsWith("claude-") || !body.messages?.length) {
      return NextResponse.json({ error: "Model and messages are required" }, { status: 400 });
    }
    const totalCharacters =
      (body.systemPrompt?.length ?? 0) +
      body.messages.reduce((total, message) => total + (message.content?.length ?? 0), 0);
    if (body.messages.length > 50 || totalCharacters > 500_000) {
      return NextResponse.json({ error: "This request is too large" }, { status: 413 });
    }

    const startedAt = Date.now();
    const deadline = startedAt + 105_000;
    const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [...body.messages];
    const usage = { input_tokens: 0, output_tokens: 0 };
    let portalSearches = 0;
    const portalQueries: string[] = [];
    const latestUserText =
      [...body.messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const requiresPortal = /\b(sparkwell|resource portal|anti[\s-]?entropy)\b/i.test(latestUserText);

    for (let turn = 0; turn < 4; turn += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 3_000) {
        return NextResponse.json({ error: "Generation timed out before the model finished" }, { status: 504 });
      }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: body.modelId,
          system: body.systemPrompt || undefined,
          messages,
          tools: [PORTAL_TOOL],
          tool_choice:
            turn === 0 && requiresPortal
              ? { type: "tool", name: PORTAL_TOOL.name }
              : { type: "auto" },
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(remainingMs),
      });
      const payload = (await response.json()) as AnthropicPayload;
      if (!response.ok) {
        const message =
          typeof payload.error?.message === "string"
            ? payload.error.message
            : `Anthropic returned ${response.status}`;
        return NextResponse.json({ error: message }, { status: response.status });
      }

      usage.input_tokens += payload.usage?.input_tokens ?? 0;
      usage.output_tokens += payload.usage?.output_tokens ?? 0;
      const blocks = payload.content ?? [];
      const toolCalls = blocks.filter(
        (part): part is Extract<AnthropicBlock, { type: "tool_use" }> =>
          part.type === "tool_use" && part.name === PORTAL_TOOL.name,
      );

      if (!toolCalls.length || payload.stop_reason !== "tool_use") {
        const output = blocks
          .filter((part): part is Extract<AnthropicBlock, { type: "text" }> => part.type === "text")
          .map((part) => part.text)
          .join("\n");
        return NextResponse.json({
          output,
          latencyMs: Date.now() - startedAt,
          usage,
          portalSearches,
          portalQueries,
        });
      }

      portalSearches += toolCalls.length;
      portalQueries.push(...toolCalls.map((call) => call.input.query ?? "").filter(Boolean));
      messages.push({ role: "assistant", content: blocks });
      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          try {
            return {
              type: "tool_result",
              tool_use_id: call.id,
              content: await searchResourcePortal(
                call.input.query ?? "",
                AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
              ),
            };
          } catch (error) {
            return {
              type: "tool_result",
              tool_use_id: call.id,
              is_error: true,
              content: error instanceof Error ? error.message : "Resource Portal search failed",
            };
          }
        }),
      );
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json(
      { error: "The model exceeded the Resource Portal tool-call limit" },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
