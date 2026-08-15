import { beforeEach, describe, expect, it } from "vitest";

import { sha256 } from "@/lib/domain/hash";
import {
  CASE_AGENT_ID,
  createMemoryGraphSeed,
  DRIFTED_POLICY,
  GRAPH_POLICY_PATH,
  GRAPH_REPOSITORY_ID,
  GRAPH_TENANT_ID,
  INITIAL_POLICY,
  POLICY_AGENT_ID,
  ROOT_AGENT_ID,
} from "@/lib/memory-graph/fixtures";
import { InMemoryGraphStore } from "@/lib/memory-graph/in-memory-store";

describe("validity-aware memory graph", () => {
  let store: InMemoryGraphStore;

  beforeEach(async () => {
    store = new InMemoryGraphStore();
    await store.reset(createMemoryGraphSeed());
  });

  it("selectively invalidates direct and derived memories while preserving history", async () => {
    const result = await store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: POLICY_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: sha256(INITIAL_POLICY),
      content: DRIFTED_POLICY,
      summary: "Reduce the automatic refund window from 30 days to 7 days.",
      sourceRevision: "2222222222222222222222222222222222222222",
    });

    expect(result.event.outcome).toBe("applied");
    expect(result.changedArtifacts.map((item) => item.id)).toEqual(
      expect.arrayContaining(["artifact-policy-file", "artifact-refund-window"]),
    );
    expect(result.changedArtifacts.map((item) => item.id)).not.toContain("artifact-currency");
    expect(result.invalidatedClaims.map((item) => item.id).sort()).toEqual([
      "claim-case-14-days-eligible",
      "claim-refund-window-30",
    ]);

    const snapshot = await store.snapshot(GRAPH_REPOSITORY_ID);
    expect(snapshot.claims.find((item) => item.id === "claim-refund-currency")?.status).toBe(
      "valid",
    );
    expect(
      snapshot.artifactVersions.filter((item) => item.artifactId === "artifact-refund-window"),
    ).toHaveLength(2);
  });

  it("withholds a semantically matching stale claim from recall", async () => {
    await store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: POLICY_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: sha256(INITIAL_POLICY),
      content: DRIFTED_POLICY,
      summary: "Reduce refund eligibility window.",
      sourceRevision: "2222222222222222222222222222222222222222",
    });

    const recall = await store.recall(
      GRAPH_REPOSITORY_ID,
      "Can a damaged order that is 14 days old receive an automatic refund?",
    );
    expect(recall.withheld.map((item) => item.claim.id)).toContain(
      "claim-case-14-days-eligible",
    );
    expect(recall.admissible.map((item) => item.claim.id)).not.toContain(
      "claim-case-14-days-eligible",
    );
  });

  it("rejects two concurrent writes based on the same file version", async () => {
    const common = {
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: sha256(INITIAL_POLICY),
    };
    const [left, right] = await Promise.all([
      store.applyWrite({
        ...common,
        agentId: POLICY_AGENT_ID,
        content: DRIFTED_POLICY,
        summary: "Policy candidate A",
        sourceRevision: "revision-a",
      }),
      store.applyWrite({
        ...common,
        agentId: CASE_AGENT_ID,
        content: JSON.stringify({ refund_window_days: 14, currency: "USD" }),
        summary: "Policy candidate B",
        sourceRevision: "revision-b",
      }),
    ]);

    expect([left.event.outcome, right.event.outcome].sort()).toEqual([
      "applied",
      "rejected_stale",
    ]);
  });

  it("gives subagents a compact change capsule on their next read", async () => {
    await store.recordRead({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: CASE_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      selector: "/refund_window_days",
      purpose: "Evaluate refund eligibility",
    });
    await store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: POLICY_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: sha256(INITIAL_POLICY),
      content: DRIFTED_POLICY,
      summary: "The policy agent reduced the refund window.",
      sourceRevision: "2222222222222222222222222222222222222222",
    });

    const read = await store.recordRead({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: CASE_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      selector: "/refund_window_days",
      purpose: "Re-evaluate refund eligibility",
    });
    expect(read.version.content).toBe("7");
    expect(read.capsule.changesSinceLastRead).toHaveLength(1);
    expect(read.capsule.changesSinceLastRead[0]?.agentId).toBe(POLICY_AGENT_ID);
  });

  it("only permits a replacement claim against the current artifact version", async () => {
    const write = await store.applyWrite({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: POLICY_AGENT_ID,
      path: GRAPH_POLICY_PATH,
      expectedFileHash: sha256(INITIAL_POLICY),
      content: DRIFTED_POLICY,
      summary: "Reduce refund eligibility window.",
      sourceRevision: "2222222222222222222222222222222222222222",
    });
    const currentWindow = write.changedArtifacts.find(
      (item) => item.id === "artifact-refund-window",
    );
    expect(currentWindow).toBeDefined();

    const claim = await store.rememberClaim({
      tenantId: GRAPH_TENANT_ID,
      repositoryId: GRAPH_REPOSITORY_ID,
      agentId: ROOT_AGENT_ID,
      statement: "A damaged order that is 14 days old is outside the 7-day automatic refund window.",
      evidenceStrength: "proven",
      dependencies: [
        {
          artifactId: currentWindow!.id,
          artifactVersionId: currentWindow!.currentVersionId,
          relationship: "constrained_by",
        },
      ],
      supersedesClaimId: "claim-case-14-days-eligible",
      sourceRevision: "2222222222222222222222222222222222222222",
    });
    expect(claim.status).toBe("valid");

    await expect(
      store.rememberClaim({
        tenantId: GRAPH_TENANT_ID,
        repositoryId: GRAPH_REPOSITORY_ID,
        agentId: ROOT_AGENT_ID,
        statement: "This claim is anchored to an obsolete version.",
        evidenceStrength: "proven",
        dependencies: [
          {
            artifactId: "artifact-refund-window",
            artifactVersionId: "artifact-refund-window-v1",
            relationship: "supported_by",
          },
        ],
        sourceRevision: "2222222222222222222222222222222222222222",
      }),
    ).rejects.toThrow("stale artifact");
  });
});
