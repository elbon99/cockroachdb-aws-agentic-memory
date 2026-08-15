import { proposeClaimFromArtifactDrift } from "@/lib/aws/claim-proposer";
import {
  CASE_AGENT_ID,
  DRIFTED_POLICY,
  GRAPH_POLICY_PATH,
  GRAPH_REPOSITORY_ID,
  GRAPH_TENANT_ID,
  POLICY_AGENT_ID,
  ROOT_AGENT_ID,
} from "@/lib/memory-graph/fixtures";
import {
  getMemoryGraphStore,
  resetMemoryGraphStore,
} from "@/lib/memory-graph/factory";
import type { MemoryGraphSnapshot, RecallResult } from "@/lib/memory-graph/types";

export type DemoAction = "reset" | "read" | "mutate" | "reverify" | "recall" | "race";

export interface DemoActionResult {
  action: DemoAction;
  message: string;
  snapshot: MemoryGraphSnapshot;
  recall?: RecallResult;
  detail?: unknown;
}

const REVISION_2 = "2222222222222222222222222222222222222222";

export async function getDemoSnapshot(): Promise<MemoryGraphSnapshot> {
  return (await getMemoryGraphStore()).snapshot(GRAPH_REPOSITORY_ID);
}

export async function runDemoAction(action: DemoAction): Promise<DemoActionResult> {
  if (action === "reset") {
    const store = await resetMemoryGraphStore();
    return {
      action,
      message: "Restored the 30-day policy and its original evidence graph.",
      snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
    };
  }

  const store = await getMemoryGraphStore();
  if (action === "read") {
    const detail = await store.recordRead({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: CASE_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      selector: "/refund_window_days",
      purpose: "Evaluate a damaged order that is 14 days old",
    });
    return {
      action,
      message: "The case subagent read the exact policy field and received its audit capsule.",
      snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
      detail,
    };
  }

  if (action === "mutate") {
    const before = await store.snapshot(GRAPH_REPOSITORY_ID);
    const file = before.files.find((item) => item.path === GRAPH_POLICY_PATH);
    if (!file) throw new Error("Demo policy file is missing");
    const detail = await store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: POLICY_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: file.contentHash,
      content: DRIFTED_POLICY,
      summary: "Remote policy update reduced the refund window from 30 days to 7 days.",
      sourceRevision: REVISION_2,
    });
    return {
      action,
      message: `Changed ${detail.changedArtifacts.length} artifact versions and invalidated ${detail.invalidatedClaims.length} dependent memories.`,
      snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
      detail,
    };
  }

  if (action === "reverify") {
    const before = await store.snapshot(GRAPH_REPOSITORY_ID);
    const window = before.artifacts.find((item) => item.id === "artifact-refund-window");
    if (!window) throw new Error("Refund-window artifact is missing");
    const versions = before.artifactVersions
      .filter((item) => item.artifactId === window.id)
      .sort((left, right) => left.ordinal - right.ordinal);
    const currentVersion = versions.find((item) => item.id === window.currentVersionId);
    const previousVersion = versions.at(-2);
    if (!currentVersion || currentVersion.content !== "7") {
      throw new Error("Apply the 30-to-7 day artifact change before re-verification");
    }
    let policyStatement = "Damaged orders are eligible for an automatic refund only within 7 days.";
    let detail: unknown;
    if (process.env.AGENT_ENGINE === "bedrock") {
      detail = await proposeClaimFromArtifactDrift({
        path: window.path,
        selector: window.selector,
        previousValue: previousVersion?.content ?? "unknown",
        currentValue: currentVersion.content,
      });
      policyStatement = (detail as { statement: string }).statement;
    }
    const existing = before.claims.some((item) => item.id === "claim-refund-window-7");
    if (!existing) {
      await store.rememberClaim({
        id: "claim-refund-window-7",
        tenantId: GRAPH_TENANT_ID,
        repositoryId: GRAPH_REPOSITORY_ID,
        agentId: ROOT_AGENT_ID,
        statement: policyStatement,
        evidenceStrength: "proven",
        dependencies: [
          {
            artifactId: window.id,
            artifactVersionId: window.currentVersionId,
            relationship: "constrained_by",
          },
        ],
        supersedesClaimId: "claim-refund-window-30",
        sourceRevision: REVISION_2,
      });
      await store.rememberClaim({
        id: "claim-case-14-days-ineligible",
        tenantId: GRAPH_TENANT_ID,
        repositoryId: GRAPH_REPOSITORY_ID,
        agentId: ROOT_AGENT_ID,
        statement: "A damaged order that is 14 days old is outside the 7-day automatic refund window.",
        evidenceStrength: "proven",
        dependencies: [],
        derivedFromClaimIds: ["claim-refund-window-7"],
        supersedesClaimId: "claim-case-14-days-eligible",
        sourceRevision: REVISION_2,
      });
    }
    return {
      action,
      message: "The root agent established replacement claims against the current artifact version.",
      snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
      detail,
    };
  }

  if (action === "recall") {
    const recall = await store.recall(
      GRAPH_REPOSITORY_ID,
      "Can a damaged order that is 14 days old receive an automatic refund?",
    );
    return {
      action,
      message: `${recall.admissible.length} memories admitted; ${recall.withheld.length} obsolete memories withheld.`,
      snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
      recall,
    };
  }

  await store.reset((await import("@/lib/memory-graph/fixtures")).createMemoryGraphSeed());
  const initial = await store.snapshot(GRAPH_REPOSITORY_ID);
  const file = initial.files[0];
  if (!file) throw new Error("Demo policy file is missing");
  const common = {
    tenantId: GRAPH_TENANT_ID,
    repositoryId: GRAPH_REPOSITORY_ID,
    path: GRAPH_POLICY_PATH,
    expectedFileHash: file.contentHash,
  };
  const detail = await Promise.all([
    store.applyWrite({
      ...common,
      agentId: POLICY_AGENT_ID,
      content: DRIFTED_POLICY,
      summary: "Candidate A reduces the window to 7 days.",
      sourceRevision: "candidate-a",
    }),
    store.applyWrite({
      ...common,
      agentId: CASE_AGENT_ID,
      content: JSON.stringify({ refund_window_days: 14, currency: "USD" }, null, 2),
      summary: "Candidate B changes the window to 14 days.",
      sourceRevision: "candidate-b",
    }),
  ]);
  return {
    action,
    message: "One expected-base write won; the competing subagent write was rejected as stale.",
    snapshot: await store.snapshot(GRAPH_REPOSITORY_ID),
    detail,
  };
}
