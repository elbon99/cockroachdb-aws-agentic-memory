export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type BlockKind = "policy" | "tools" | "knowledge";
export type BlockStatus = "approved" | "revoked";
export type ReleaseStatus = "candidate" | "active" | "superseded" | "stale";
export type AgentEngineName = "deterministic" | "bedrock";
export type SupportToolName = "deny_refund" | "issue_refund";

export interface ContextBlock {
  id: string;
  tenantId: string;
  kind: BlockKind;
  version: number;
  title: string;
  content: string;
  contentHash: string;
  status: BlockStatus;
  metadata: Record<string, JsonValue>;
  createdAt: string;
}
export interface ReleaseManifest {
  id: string;
  tenantId: string;
  environmentId: string;
  displayName: string;
  sequence: number;
  candidateName: string | null;
  expectedBaseReleaseId: string | null;
  status: ReleaseStatus;
  blockIds: string[];
  compiledPrefix: string;
  compiledPrefixHash: string;
  createdAt: string;
  activatedAt: string | null;
}

export interface EvidenceMemory {
  id: string;
  tenantId: string;
  releaseId: string;
  purpose: string;
  title: string;
  content: string;
  contentHash: string;
  sourceUri: string;
  status: "approved" | "rejected" | "superseded";
  embedding: number[];
  createdAt: string;
}

export interface RetrievedEvidence extends EvidenceMemory {
  distance: number;
}

export interface SupportCase {
  id: string;
  customerId: string;
  orderId: string;
  orderAgeDays: number;
  reason: "damaged" | "late" | "changed_mind";
  amountUsd: number;
  summary: string;
}

export interface AgentAction {
  tool: SupportToolName;
  arguments: {
    orderId: string;
    amountUsd?: number;
    reason: string;
  };
  rationale: string;
}

export interface CacheUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteInputTokens: number;
  cacheReadInputTokens: number;
  latencyMs: number;
  realProviderTelemetry: boolean;
}

export interface RequestEnvelope {
  modelId: string;
  releaseId: string;
  stablePrefixHash: string;
  system: Array<
    | { text: string }
    | { cachePoint: { type: "default"; ttl: "5m" | "1h" } }
  >;
  messages: Array<{
    role: "user";
    content: Array<{ text: string }>;
  }>;
  tools: Array<{
    name: SupportToolName;
    description: string;
    inputSchema: Record<string, JsonValue>;
  }>;
  inference: {
    maxTokens: number;
    temperature: number;
  };
}

export interface InvocationReceipt {
  id: string;
  tenantId: string;
  environmentId: string;
  releaseId: string;
  caseInput: SupportCase;
  evidenceIds: string[];
  requestEnvelope: RequestEnvelope;
  requestHash: string;
  action: AgentAction;
  engine: AgentEngineName;
  usage: CacheUsage;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  environmentId: string;
  type:
    | "demo_reset"
    | "release_activated"
    | "release_rejected_stale"
    | "invocation_completed";
  releaseId: string | null;
  payload: Record<string, JsonValue>;
  createdAt: string;
}

export interface EnvironmentState {
  id: string;
  tenantId: string;
  name: string;
  activeReleaseId: string;
  pointerVersion: number;
  updatedAt: string;
}

export interface PublicationResult {
  candidateId: string;
  outcome: "activated" | "stale";
  activeReleaseId: string;
  attempts: number;
  reason: string;
}

export interface ReconstructionResult {
  invocationId: string;
  originalRequestHash: string;
  reconstructedRequestHash: string;
  exactMatch: boolean;
  releaseId: string;
  blockHashes: string[];
  evidenceHashes: string[];
}

export interface DemoSnapshot {
  mode: {
    database: "cockroachdb" | "local-demo";
    agent: AgentEngineName;
    providerTelemetry: boolean;
  };
  environment: EnvironmentState;
  activeRelease: ReleaseManifest;
  releases: ReleaseManifest[];
  blocks: ContextBlock[];
  invocations: InvocationReceipt[];
  auditEvents: AuditEvent[];
  supportCase: SupportCase;
}

export interface DemoSeed {
  environment: EnvironmentState;
  releases: ReleaseManifest[];
  blocks: ContextBlock[];
  evidence: EvidenceMemory[];
  supportCase: SupportCase;
}
