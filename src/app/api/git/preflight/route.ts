import { NextResponse } from "next/server";

import { preflightGitRepository } from "@/lib/git/preflight";

export const dynamic = "force-dynamic";

async function run(fetchRemote: boolean): Promise<NextResponse> {
  try {
    const repoPath = process.env.CONTEXTSEAL_TRACKED_REPO?.trim() || process.cwd();
    const result = await preflightGitRepository({ repoPath, fetchRemote });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git preflight failed";
    return NextResponse.json(
      { remoteFreshness: "unknown", error: message, checkedAt: new Date().toISOString() },
      { status: 503 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return run(false);
}

// Explicit POST authorization may update remote-tracking refs with `git fetch`.
// It never pulls, merges, rebases, or modifies the worktree.
export async function POST(): Promise<NextResponse> {
  return run(true);
}
