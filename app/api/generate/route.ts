import { NextResponse } from "next/server";

type GenerateBody = {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export const maxDuration = 120;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as GenerateBody;
    if (!body.modelId || !body.messages?.length) {
      return NextResponse.json({ error: "Model and messages are required" }, { status: 400 });
    }

    const startedAt = Date.now();
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
        messages: body.messages,
        max_tokens: 4096,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : `Anthropic returned ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }
    const output = (payload.content ?? [])
      .filter((part: { type: string }) => part.type === "text")
      .map((part: { text: string }) => part.text)
      .join("\n");
    return NextResponse.json({
      output,
      latencyMs: Date.now() - startedAt,
      usage: payload.usage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
