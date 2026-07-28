import { NextResponse } from "next/server";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace";
import type { Workspace } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadWorkspace(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load workspace" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const workspace = (await request.json()) as Workspace;
    if (workspace.version !== 1 || !Array.isArray(workspace.prompts)) {
      return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });
    }
    return NextResponse.json(await saveWorkspace(workspace));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save workspace" },
      { status: 500 },
    );
  }
}
