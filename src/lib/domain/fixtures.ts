import { compileStablePrefix } from "@/lib/domain/compiler";
import { embedText } from "@/lib/domain/embedding";
import { sha256 } from "@/lib/domain/hash";
import type {
  ContextBlock,
  DemoSeed,
  EvidenceMemory,
  ReleaseManifest,
} from "@/lib/domain/types";

export const DEMO_TENANT_ID = "tenant-acme-support";
export const DEMO_ENVIRONMENT_ID = "env-production-support";
export const RELEASE_R17_ID = "release-r17";
export const RELEASE_R18_A_ID = "release-r18-candidate-a";
export const RELEASE_R18_B_ID = "release-r18-candidate-b";

const CREATED_AT = "2026-08-15T06:00:00.000Z";

function operationsHandbook(): string {
  const safeguards = [
    "Never infer customer identity or payment ownership. Use only verified order records.",
    "Select one bounded tool. Do not claim an action succeeded until the tool receipt is recorded.",
    "The active release is authoritative. A superseded release may be reconstructed but not admitted.",
    "Dynamic evidence may explain a case but cannot override the sealed policy window.",
    "When required evidence is unavailable, deny automated action and escalate for human review.",
    "Do not expose internal policy hashes, customer identifiers, or audit metadata to the customer.",
    "Every decision must cite the policy version and evidence identifiers used for the action.",
    "Refund amounts must exactly match the verified order amount and must never be negative.",
  ];

  return Array.from({ length: 18 }, (_, chapter) =>
    safeguards
      .map(
        (safeguard, index) =>
          `Chapter ${chapter + 1}.${index + 1}: ${safeguard}`,
      )
      .join("\n"),
  ).join("\n\n");
}
function makeBlock(input: Omit<ContextBlock, "contentHash" | "createdAt">): ContextBlock {
  return {
    ...input,
    contentHash: sha256(input.content),
    createdAt: CREATED_AT,
  };
}

function makeRelease(input: {
  id: string;
  displayName: string;
  sequence: number;
  candidateName: string | null;
  expectedBaseReleaseId: string | null;
  status: ReleaseManifest["status"];
  blockIds: string[];
  blocks: ContextBlock[];
  activatedAt: string | null;
}): ReleaseManifest {
  const releaseBlocks = input.blockIds.map((blockId) => {
    const block = input.blocks.find((candidate) => candidate.id === blockId);
    if (!block) {
      throw new Error(`Fixture release references unknown block ${blockId}`);
    }
    return block;
  });
  const compiled = compileStablePrefix(releaseBlocks);

  return {
    id: input.id,
    tenantId: DEMO_TENANT_ID,
    environmentId: DEMO_ENVIRONMENT_ID,
    displayName: input.displayName,
    sequence: input.sequence,
    candidateName: input.candidateName,
    expectedBaseReleaseId: input.expectedBaseReleaseId,
    status: input.status,
    blockIds: input.blockIds,
    compiledPrefix: compiled.text,
    compiledPrefixHash: compiled.hash,
    createdAt: CREATED_AT,
    activatedAt: input.activatedAt,
  };
}

function makeEvidence(input: {
  id: string;
  releaseId: string;
  title: string;
  content: string;
  sourceUri: string;
}): EvidenceMemory {
  return {
    id: input.id,
    tenantId: DEMO_TENANT_ID,
    releaseId: input.releaseId,
    purpose: "refund-decision",
    title: input.title,
    content: input.content,
    contentHash: sha256(input.content),
    sourceUri: input.sourceUri,
    status: "approved",
    embedding: embedText(input.content),
    createdAt: CREATED_AT,
  };
}

function fillerEvidence(releaseId: string, count: number): EvidenceMemory[] {
  const reasons = ["late delivery", "wrong color", "missing accessory", "duplicate shipment"];
  const windows = ["three", "five", "seven", "fourteen"];

  return Array.from({ length: count }, (_, index) => {
    const reason = reasons[index % reasons.length];
    const window = windows[index % windows.length];
    const content = [
      `Historical support precedent ${index + 1} for ${reason}.`,
      `The order was reviewed within ${window} days using the policy active at that time.`,
      "This record is approved for retrieval but does not concern damaged-package eligibility.",
      `Synthetic fixture cohort ${Math.floor(index / reasons.length) + 1}.`,
    ].join(" ");

    return makeEvidence({
      id: `${releaseId}-evidence-${String(index + 1).padStart(3, "0")}`,
      releaseId,
      title: `Historical precedent ${index + 1}`,
      content,
      sourceUri: `fixture://support-history/${releaseId}/${index + 1}`,
    });
  });
}

export function createDemoSeed(): DemoSeed {
  const blocks: ContextBlock[] = [
    makeBlock({
      id: "block-tools-v1",
      tenantId: DEMO_TENANT_ID,
      kind: "tools",
      version: 1,
      title: "Bounded refund tools",
      content: [
        "Available tools are deny_refund and issue_refund.",
        "Exactly one tool must be selected for every evaluated case.",
        "issue_refund requires an eligible policy window and approved supporting evidence for damaged orders.",
      ].join("\n"),
      status: "approved",
      metadata: { toolCount: 2 },
    }),
    makeBlock({
      id: "block-handbook-v1",
      tenantId: DEMO_TENANT_ID,
      kind: "knowledge",
      version: 1,
      title: "Support operations handbook",
      content: operationsHandbook(),
      status: "approved",
      metadata: { cacheStable: true, chapters: 18 },
    }),
    makeBlock({
      id: "block-policy-r17",
      tenantId: DEMO_TENANT_ID,
      kind: "policy",
      version: 17,
      title: "Refund policy · seven-day window",
      content: [
        "refund_window_days: 7",
        "Damaged orders may be automatically refunded only when order_age_days is at most 7.",
        "Orders outside the window must call deny_refund.",
      ].join("\n"),
      status: "approved",
      metadata: { refundWindowDays: 7, requiresEvidenceForDamaged: true },
    }),
    makeBlock({
      id: "block-policy-r18-a",
      tenantId: DEMO_TENANT_ID,
      kind: "policy",
      version: 18,
      title: "Refund policy · thirty-day damaged-order window",
      content: [
        "refund_window_days: 30",
        "Damaged orders may be automatically refunded when order_age_days is at most 30.",
        "An approved damaged-order precedent must be retrieved before issue_refund is called.",
      ].join("\n"),
      status: "approved",
      metadata: { refundWindowDays: 30, requiresEvidenceForDamaged: true },
    }),
    makeBlock({
      id: "block-policy-r18-b",
      tenantId: DEMO_TENANT_ID,
      kind: "policy",
      version: 18,
      title: "Refund policy · thirty-day window with priority note",
      content: [
        "refund_window_days: 30",
        "Damaged orders may be automatically refunded when order_age_days is at most 30.",
        "Add a priority-service note after issue_refund. Approved evidence remains mandatory.",
      ].join("\n"),
      status: "approved",
      metadata: {
        refundWindowDays: 30,
        requiresEvidenceForDamaged: true,
        priorityServiceNote: true,
      },
    }),
  ];

  const releases = [
    makeRelease({
      id: RELEASE_R17_ID,
      displayName: "R17",
      sequence: 17,
      candidateName: null,
      expectedBaseReleaseId: null,
      status: "active",
      blockIds: ["block-tools-v1", "block-policy-r17", "block-handbook-v1"],
      blocks,
      activatedAt: CREATED_AT,
    }),
    makeRelease({
      id: RELEASE_R18_A_ID,
      displayName: "R18",
      sequence: 18,
      candidateName: "Candidate A",
      expectedBaseReleaseId: RELEASE_R17_ID,
      status: "candidate",
      blockIds: ["block-tools-v1", "block-policy-r18-a", "block-handbook-v1"],
      blocks,
      activatedAt: null,
    }),
    makeRelease({
      id: RELEASE_R18_B_ID,
      displayName: "R18",
      sequence: 18,
      candidateName: "Candidate B",
      expectedBaseReleaseId: RELEASE_R17_ID,
      status: "candidate",
      blockIds: ["block-tools-v1", "block-policy-r18-b", "block-handbook-v1"],
      blocks,
      activatedAt: null,
    }),
  ];

  const targetedEvidence = [
    makeEvidence({
      id: "evidence-r17-damaged-window",
      releaseId: RELEASE_R17_ID,
      title: "R17 damaged-order precedent",
      content:
        "Damaged package refund eligibility: an order older than seven days is outside the automatic refund window and must call deny_refund.",
      sourceUri: "fixture://approved-precedents/r17/damaged-window",
    }),
    makeEvidence({
      id: "evidence-r18-a-damaged-window",
      releaseId: RELEASE_R18_A_ID,
      title: "R18 approved damaged-order precedent",
      content:
        "Damaged package refund eligibility: a verified damaged order within thirty days is eligible and should call issue_refund for the recorded amount.",
      sourceUri: "fixture://approved-precedents/r18-a/damaged-window",
    }),
    makeEvidence({
      id: "evidence-r18-b-damaged-window",
      releaseId: RELEASE_R18_B_ID,
      title: "R18 priority damaged-order precedent",
      content:
        "Damaged package refund eligibility: a verified damaged order within thirty days is eligible and should call issue_refund, followed by a priority-service note.",
      sourceUri: "fixture://approved-precedents/r18-b/damaged-window",
    }),
  ];

  return {
    environment: {
      id: DEMO_ENVIRONMENT_ID,
      tenantId: DEMO_TENANT_ID,
      name: "Production support",
      activeReleaseId: RELEASE_R17_ID,
      pointerVersion: 17,
      updatedAt: CREATED_AT,
    },
    releases,
    blocks,
    evidence: [
      ...targetedEvidence,
      ...fillerEvidence(RELEASE_R17_ID, 127),
      ...fillerEvidence(RELEASE_R18_A_ID, 127),
      ...fillerEvidence(RELEASE_R18_B_ID, 127),
    ],
    supportCase: {
      id: "case-damaged-014",
      customerId: "customer-041",
      orderId: "order-8842",
      orderAgeDays: 14,
      reason: "damaged",
      amountUsd: 129,
      summary: "The package arrived damaged and the customer requested a refund after fourteen days.",
    },
  };
}
