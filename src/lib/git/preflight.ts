import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitCommandRunner {
  (args: string[], cwd: string): Promise<string>;
}

export interface GitPathChange {
  status: string;
  path: string;
  previousPath: string | null;
}

export interface GitPreflightResult {
  repositoryRoot: string;
  branch: string;
  upstream: string;
  localHead: string;
  remoteHead: string | null;
  remoteChanged: boolean;
  remoteFreshness: "current" | "changed" | "unknown";
  ahead: number;
  behind: number;
  remoteChanges: GitPathChange[];
  localStatus: string[];
  fetched: boolean;
  checkedAt: string;
}

const defaultRunner: GitCommandRunner = async (args, cwd) => {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
};

function parseNameStatus(output: string): GitPathChange[] {
  if (!output) {
    return [];
  }
  return output.split(/\r?\n/).map((line) => {
    const [status = "?", first = "", second] = line.split("\t");
    const renamed = status.startsWith("R") || status.startsWith("C");
    return {
      status,
      path: renamed ? (second ?? first) : first,
      previousPath: renamed ? first : null,
    };
  });
}

function remoteName(upstream: string): string {
  return upstream.includes("/") ? upstream.slice(0, upstream.indexOf("/")) : "origin";
}

function remoteBranch(upstream: string, branch: string): string {
  return upstream.includes("/") ? upstream.slice(upstream.indexOf("/") + 1) : branch;
}

export async function preflightGitRepository(input: {
  repoPath: string;
  fetchRemote?: boolean;
  runner?: GitCommandRunner;
}): Promise<GitPreflightResult> {
  const run = input.runner ?? defaultRunner;
  const root = await run(["rev-parse", "--show-toplevel"], input.repoPath);
  const branch = await run(["branch", "--show-current"], root);
  const localHead = await run(["rev-parse", "HEAD"], root);

  let upstream: string;
  try {
    upstream = await run(
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      root,
    );
  } catch {
    upstream = `origin/${branch}`;
  }

  const remote = remoteName(upstream);
  const targetBranch = remoteBranch(upstream, branch);
  let remoteHead: string | null = null;
  let fetched = false;

  // Remote identity is deliberately checked before any worktree status command.
  try {
    const remoteLine = await run(
      ["ls-remote", "--heads", remote, `refs/heads/${targetBranch}`],
      root,
    );
    remoteHead = remoteLine.split(/\s+/)[0] || null;
    if (input.fetchRemote && remoteHead && remoteHead !== localHead) {
      await run(["fetch", "--no-tags", remote, targetBranch], root);
      fetched = true;
    }
  } catch {
    remoteHead = null;
  }

  let ahead = 0;
  let behind = 0;
  let remoteChanges: GitPathChange[] = [];
  if (remoteHead) {
    try {
      const counts = await run(["rev-list", "--left-right", "--count", `HEAD...${remoteHead}`], root);
      const [left, right] = counts.split(/\s+/).map(Number);
      ahead = Number.isFinite(left) ? left : 0;
      behind = Number.isFinite(right) ? right : 0;
      remoteChanges = parseNameStatus(
        await run(["diff", "--name-status", `HEAD..${remoteHead}`], root),
      );
    } catch {
      // A newly observed remote SHA may not exist locally until fetch is authorized.
      remoteChanges = [];
    }
  }

  const localStatusOutput = await run(["status", "--porcelain=v2", "--untracked-files=all"], root);
  return {
    repositoryRoot: root,
    branch,
    upstream,
    localHead,
    remoteHead,
    remoteChanged: remoteHead !== null && remoteHead !== localHead,
    remoteFreshness: remoteHead === null ? "unknown" : remoteHead === localHead ? "current" : "changed",
    ahead,
    behind,
    remoteChanges,
    localStatus: localStatusOutput ? localStatusOutput.split(/\r?\n/) : [],
    fetched,
    checkedAt: new Date().toISOString(),
  };
}
