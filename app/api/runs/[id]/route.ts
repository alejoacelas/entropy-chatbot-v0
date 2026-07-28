import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { ExperimentRun, RunSummary } from "@/lib/types";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace";
import { localRuns } from "@/lib/local-artifacts";

const validId = (id: string) => /^run-[0-9a-f-]+$/.test(id);
const pathname = (id: string) => `entropy-lab/runs/${id}.json`;

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const run = localRuns.get(id);
      return run
        ? NextResponse.json(run)
        : NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const blob = await get(pathname(id), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(JSON.parse(await new Response(blob.stream).text()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load run" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Run storage is not configured" }, { status: 503 });
  }
  try {
    const run = (await request.json()) as ExperimentRun;
    if (run.id !== id || !Array.isArray(run.results)) {
      return NextResponse.json({ error: "Invalid run" }, { status: 400 });
    }
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put(pathname(id), JSON.stringify(run), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 0,
      });
    } else {
      localRuns.set(id, run);
    }
    const summary: RunSummary = {
      id: run.id,
      name: run.name,
      createdAt: run.createdAt,
      caseIds: run.caseIds,
      promptIds: run.promptIds,
      modelIds: run.modelIds,
      resultCount: run.results.length,
      errorCount: run.results.filter((result) => result.error).length,
    };
    const current = await loadWorkspace();
    const workspace = await saveWorkspace({
      ...current,
      runs: [summary, ...current.runs.filter((existing) => existing.id !== summary.id)],
    });
    return NextResponse.json({ run, workspace });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save run" },
      { status: 500 },
    );
  }
}
