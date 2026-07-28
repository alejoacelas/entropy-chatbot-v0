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
    const payload = (await request.json()) as { workspace?: Workspace; baseUpdatedAt?: string } & Partial<Workspace>;
    const workspace = (payload.workspace ?? payload) as Workspace;
    if (workspace.version !== 3 || !Array.isArray(workspace.prompts)) {
      return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });
    }
    if (payload.baseUpdatedAt) {
      const current = await loadWorkspace();
      if (current.updatedAt !== payload.baseUpdatedAt) {
        return NextResponse.json(
          { error: "The workspace changed in another tab. Reloaded the newest version.", workspace: current },
          { status: 409 },
        );
      }
    }
    return NextResponse.json(await saveWorkspace(workspace));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save workspace" },
      { status: 500 },
    );
  }
}
