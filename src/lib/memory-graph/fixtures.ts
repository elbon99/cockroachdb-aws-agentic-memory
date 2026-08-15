import { embedText } from "@/lib/domain/embedding";
import { sha256 } from "@/lib/domain/hash";
import { canonicalPointerValue } from "@/lib/memory-graph/json-pointer";
import type {
  Artifact,
  ArtifactVersion,
  MemoryClaim,
  MemoryGraphSeed,
} from "@/lib/memory-graph/types";

export const GRAPH_TENANT_ID = "tenant-acme-support";
export const GRAPH_REPOSITORY_ID = "repo-support-policy";
export const GRAPH_POLICY_PATH = "policies/refund-policy.json";
export const ROOT_AGENT_ID = "agent-root";
export const POLICY_AGENT_ID = "agent-policy-subagent";
export const CASE_AGENT_ID = "agent-case-subagent";

export const INITIAL_POLICY = JSON.stringify(
  {
    refund_window_days: 30,
    currency: "USD",
    damaged_orders_require_evidence: true,
  },
  null,
  2,
);

export const DRIFTED_POLICY = JSON.stringify(
  {
    refund_window_days: 7,
    currency: "USD",
    damaged_orders_require_evidence: true,
  },
  null,
  2,
);

const CREATED_AT = "2026-08-15T06:00:00.000Z";
const INITIAL_REVISION = "1111111111111111111111111111111111111111";

function makeArtifact(input: Omit<Artifact, "tenantId" | "repositoryId" | "fileId">): Artifact {
  return {
    ...input,
    tenantId: GRAPH_TENANT_ID,
    repositoryId: GRAPH_REPOSITORY_ID,
    fileId: "file-refund-policy",
  };
}

function makeVersion(input: {
  id: string;
  artifactId: string;
  content: string;
}): ArtifactVersion {
  return {
    id: input.id,
    artifactId: input.artifactId,
    ordinal: 1,
    content: input.content,
    contentHash: sha256(input.content),
    fileContentHash: sha256(INITIAL_POLICY),
    sourceRevision: INITIAL_REVISION,
    createdByAgentId: POLICY_AGENT_ID,
    createdAt: CREATED_AT,
  };
}

function makeClaim(input: {
  id: string;
  statement: string;
  createdByAgentId: string;
}): MemoryClaim {
  return {
    id: input.id,
    tenantId: GRAPH_TENANT_ID,
    repositoryId: GRAPH_REPOSITORY_ID,
    statement: input.statement,
    status: "valid",
    evidenceStrength: "proven",
    embedding: embedText(input.statement),
    createdByAgentId: input.createdByAgentId,
    validFromRevision: INITIAL_REVISION,
    invalidatedAt: null,
    invalidationReason: null,
    supersededByClaimId: null,
    createdAt: CREATED_AT,
  };
}

export function createMemoryGraphSeed(): MemoryGraphSeed {
  const artifacts: Artifact[] = [
    makeArtifact({
      id: "artifact-policy-file",
      path: GRAPH_POLICY_PATH,
      selector: "",
      kind: "whole-file",
      currentVersionId: "artifact-policy-file-v1",
    }),
    makeArtifact({
      id: "artifact-refund-window",
      path: GRAPH_POLICY_PATH,
      selector: "/refund_window_days",
      kind: "json-pointer",
      currentVersionId: "artifact-refund-window-v1",
    }),
    makeArtifact({
      id: "artifact-currency",
      path: GRAPH_POLICY_PATH,
      selector: "/currency",
      kind: "json-pointer",
      currentVersionId: "artifact-currency-v1",
    }),
  ];

  const versions = [
    makeVersion({
      id: "artifact-policy-file-v1",
      artifactId: "artifact-policy-file",
      content: INITIAL_POLICY,
    }),
    makeVersion({
      id: "artifact-refund-window-v1",
      artifactId: "artifact-refund-window",
      content: canonicalPointerValue(INITIAL_POLICY, "/refund_window_days"),
    }),
    makeVersion({
      id: "artifact-currency-v1",
      artifactId: "artifact-currency",
      content: canonicalPointerValue(INITIAL_POLICY, "/currency"),
    }),
  ];

  const windowClaim = makeClaim({
    id: "claim-refund-window-30",
    statement: "Damaged orders are eligible for an automatic refund within 30 days.",
    createdByAgentId: POLICY_AGENT_ID,
  });
  const currencyClaim = makeClaim({
    id: "claim-refund-currency",
    statement: "Approved refunds are issued in USD.",
    createdByAgentId: POLICY_AGENT_ID,
  });
  const caseClaim = makeClaim({
    id: "claim-case-14-days-eligible",
    statement: "A verified damaged order that is 14 days old is eligible for an automatic refund.",
    createdByAgentId: CASE_AGENT_ID,
  });

  return {
    repository: {
      id: GRAPH_REPOSITORY_ID,
      tenantId: GRAPH_TENANT_ID,
      displayName: "Acme support policy",
      remoteUrl: "https://github.com/elbon99/cockroachdb-aws-agentic-memory.git",
      branch: "main",
      localHead: INITIAL_REVISION,
      remoteHead: INITIAL_REVISION,
      remoteFreshness: "current",
      checkedAt: CREATED_AT,
    },
    agents: [
      {
        id: ROOT_AGENT_ID,
        teamId: "team-support-demo",
        parentAgentId: null,
        displayName: "Support orchestrator",
        role: "root",
        sessionId: "session-root-001",
      },
      {
        id: POLICY_AGENT_ID,
        teamId: "team-support-demo",
        parentAgentId: ROOT_AGENT_ID,
        displayName: "Policy analyst",
        role: "subagent",
        sessionId: "session-policy-001",
      },
      {
        id: CASE_AGENT_ID,
        teamId: "team-support-demo",
        parentAgentId: ROOT_AGENT_ID,
        displayName: "Case evaluator",
        role: "subagent",
        sessionId: "session-case-001",
      },
    ],
    files: [
      {
        id: "file-refund-policy",
        tenantId: GRAPH_TENANT_ID,
        repositoryId: GRAPH_REPOSITORY_ID,
        path: GRAPH_POLICY_PATH,
        content: INITIAL_POLICY,
        contentHash: sha256(INITIAL_POLICY),
        sourceRevision: INITIAL_REVISION,
        updatedByAgentId: POLICY_AGENT_ID,
        updatedAt: CREATED_AT,
      },
    ],
    artifacts,
    artifactVersions: versions,
    claims: [windowClaim, currencyClaim, caseClaim],
    dependencies: [
      {
        claimId: windowClaim.id,
        artifactId: "artifact-refund-window",
        anchoredVersionId: "artifact-refund-window-v1",
        relationship: "constrained_by",
        required: true,
      },
      {
        claimId: currencyClaim.id,
        artifactId: "artifact-currency",
        anchoredVersionId: "artifact-currency-v1",
        relationship: "supported_by",
        required: true,
      },
    ],
    relationships: [
      {
        fromClaimId: caseClaim.id,
        toClaimId: windowClaim.id,
        relationship: "derived_from",
      },
    ],
    reads: [],
    writes: [],
  };
}
