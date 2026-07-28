import { NextResponse } from "next/server";
import type { ModelOption } from "@/lib/types";

const FALLBACK_MODELS: ModelOption[] = [
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
  { id: "claude-opus-5", name: "Claude Opus 5" },
];

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json(FALLBACK_MODELS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json(FALLBACK_MODELS);
    const payload = (await response.json()) as {
      data?: Array<{ id: string; display_name?: string }>;
    };
    const models = (payload.data ?? [])
      .filter((model) => model.id.startsWith("claude-"))
      .map((model) => ({ id: model.id, name: model.display_name || model.id }));
    return NextResponse.json(models.length ? models : FALLBACK_MODELS);
  } catch {
    return NextResponse.json(FALLBACK_MODELS);
  }
}
