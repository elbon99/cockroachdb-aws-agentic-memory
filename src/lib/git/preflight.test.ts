import { describe, expect, it } from "vitest";

import { preflightGitRepository, type GitCommandRunner } from "@/lib/git/preflight";

describe("Git remote-first preflight", () => {
  it("checks the remote before inspecting the worktree and reports added files", async () => {
    const calls: string[] = [];
    const runner: GitCommandRunner = async (args) => {
      const command = args.join(" ");
      calls.push(command);
      if (command === "rev-parse --show-toplevel") return "C:/repo";
      if (command === "branch --show-current") return "main";
      if (command === "rev-parse HEAD") return "local-sha";
      if (command.includes("@{upstream}")) return "origin/main";
      if (command.startsWith("ls-remote")) return "remote-sha\trefs/heads/main";
      if (command.startsWith("fetch")) return "";
      if (command.startsWith("rev-list")) return "0\t1";
      if (command.startsWith("diff")) return "A\tpolicies/new-policy.json";
      if (command.startsWith("status")) return "? scratch.txt";
      throw new Error(`Unexpected command: ${command}`);
    };

    const result = await preflightGitRepository({
      repoPath: "C:/repo",
      fetchRemote: true,
      runner,
    });

    expect(result.remoteFreshness).toBe("changed");
    expect(result.behind).toBe(1);
    expect(result.fetched).toBe(true);
    expect(result.remoteChanges).toEqual([
      { status: "A", path: "policies/new-policy.json", previousPath: null },
    ]);
    expect(calls.indexOf("ls-remote --heads origin refs/heads/main")).toBeLessThan(
      calls.indexOf("status --porcelain=v2 --untracked-files=all"),
    );
  });

  it("degrades to unknown remote freshness without blocking local audit", async () => {
    const runner: GitCommandRunner = async (args) => {
      const command = args.join(" ");
      if (command === "rev-parse --show-toplevel") return "C:/repo";
      if (command === "branch --show-current") return "main";
      if (command === "rev-parse HEAD") return "local-sha";
      if (command.includes("@{upstream}")) return "origin/main";
      if (command.startsWith("ls-remote")) throw new Error("offline");
      if (command.startsWith("status")) return "";
      throw new Error(`Unexpected command: ${command}`);
    };

    const result = await preflightGitRepository({ repoPath: "C:/repo", runner });
    expect(result.remoteFreshness).toBe("unknown");
    expect(result.localStatus).toEqual([]);
  });
});
