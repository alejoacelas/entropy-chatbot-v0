import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { RunResult } from "@/lib/types";
import { localResults } from "@/lib/local-artifacts";

const validId = (id: string) => /^result-[0-9a-f-]+$/.test(id);
const pathname = (id: string) => `entropy-lab/results/${id}.json`;

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid result id" }, { status: 400 });
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const result = localResults.get(id);
      return result
        ? NextResponse.json(result)
        : NextResponse.json({ error: "Result not found" }, { status: 404 });
    }
    const blob = await get(pathname(id), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(await new Response(blob.stream).text()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load result" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid result id" }, { status: 400 });
  try {
    const result = (await request.json()) as RunResult;
    if (result.id !== id || typeof result.output !== "string") {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Result storage is not configured" }, { status: 503 });
      }
      localResults.set(id, result);
      return NextResponse.json({ ...result, output: result.output.slice(0, 600), truncated: result.output.length > 600 });
    }
    await put(pathname(id), JSON.stringify(result), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
    return NextResponse.json({
      ...result,
      output: result.output.slice(0, 600),
      truncated: result.output.length > 600,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save result" },
      { status: 500 },
    );
  }
}
