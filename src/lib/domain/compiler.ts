import { canonicalJson, sha256 } from "@/lib/domain/hash";
import type {
  ContextBlock,
  RequestEnvelope,
  RetrievedEvidence,
  SupportCase,
} from "@/lib/domain/types";

const KIND_ORDER: Record<ContextBlock["kind"], number> = {
  tools: 0,
  policy: 1,
  knowledge: 2,
};

export function compileStablePrefix(blocks: ContextBlock[]): {
  text: string;
  hash: string;
} {
  const ordered = [...blocks].sort((left, right) => {
    const kindDifference = KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
    return kindDifference || left.id.localeCompare(right.id);
  });

  const text = [
    "CONTEXTSEAL RELEASE MANIFEST",
    "Use only the sealed, approved memory below. Select exactly one declared tool.",
    ...ordered.map(
      (block) =>
        `\n--- ${block.kind.toUpperCase()} · ${block.title} · sha256:${block.contentHash} ---\n${block.content}`,
    ),
  ].join("\n");

  return { text, hash: sha256(text) };
}
export function buildRequestEnvelope(input: {
  modelId: string;
  cacheTtl: "5m" | "1h";
  releaseId: string;
  stablePrefix: string;
  stablePrefixHash: string;
  supportCase: SupportCase;
  evidence: RetrievedEvidence[];
}): RequestEnvelope {
  const evidenceText = input.evidence.length
    ? input.evidence
        .map(
          (item) =>
            `[${item.id} · distance=${item.distance.toFixed(4)} · sha256:${item.contentHash}] ${item.content}`,
        )
        .join("\n")
    : "No eligible dynamic evidence was retrieved.";

  return {
    modelId: input.modelId,
    releaseId: input.releaseId,
    stablePrefixHash: input.stablePrefixHash,
    system: [
      { text: input.stablePrefix },
      { cachePoint: { type: "default", ttl: input.cacheTtl } },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            text: [
              "Evaluate this support case using the sealed release and eligible evidence.",
              `CASE=${canonicalJson(input.supportCase)}`,
              "DYNAMIC_EVIDENCE_AFTER_CACHE_CHECKPOINT:",
              evidenceText,
              "Call exactly one tool: deny_refund or issue_refund.",
            ].join("\n"),
          },
        ],
      },
    ],
    tools: [
      {
        name: "deny_refund",
        description: "Deny an ineligible refund and record the policy reason.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            reason: { type: "string" },
          },
          required: ["orderId", "reason"],
        },
      },
      {
        name: "issue_refund",
        description: "Issue an eligible refund for the sealed order and amount.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            amountUsd: { type: "number" },
            reason: { type: "string" },
          },
          required: ["orderId", "amountUsd", "reason"],
        },
      },
    ],
    inference: {
      maxTokens: 300,
      temperature: 0,
    },
  };
}
