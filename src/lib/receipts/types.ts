export type SourceKind = "file" | "http" | "sql";
export type MemoryStatus = "proposed" | "valid" | "stale" | "superseded" | "rejected";

export interface ToolSource {
  id: string;
  kind: SourceKind;
  label: string;
  locator: string;
  freshnessSeconds: number;
  currentObservationId: string | null;
}

export interface ToolObservation {
  id: string;
  sourceId: string;
  toolName: string;
  request: Record<string, unknown>;
  responseHash: string;
  sourceVersion: string;
  observedAt: string;
  expiresAt: string | null;
  runId: string;
  step: number;
}

export interface ObservationFragment {
  id: string;
  observationId: string;
  selector: string;
  value: string;
  valueHash: string;
}

export interface MemoryClaim {
  id: string;
  statement: string;
  status: MemoryStatus;
  proposedBy: "bedrock" | "deterministic-demo";
  rationale: string;
  embedding: number[];
  reviewedAt: string | null;
  invalidatedAt: string | null;
  invalidationReason: string | null;
}

export interface MemoryDependency {
  memoryId: string;
  fragmentId: string;
  required: boolean;
}

export interface MemoryReview {
  id: string;
  memoryId: string;
  decision: "approved" | "rejected";
  reviewer: string;
  reason: string;
  createdAt: string;
}

export interface ActionReceipt {
  id: string;
  action: "issue_refund" | "deny_refund";
  outcome: "executed" | "blocked";
  memoryId: string | null;
  reason: string;
  createdAt: string;
}

export interface ReceiptSnapshot {
  mode: "local-demo" | "cockroachdb";
  sources: ToolSource[];
  observations: ToolObservation[];
  fragments: ObservationFragment[];
  memories: MemoryClaim[];
  dependencies: MemoryDependency[];
  reviews: MemoryReview[];
  actions: ActionReceipt[];
}

export interface RecallItem {
  memory: MemoryClaim;
  distance: number;
  dependencies: Array<{
    dependency: MemoryDependency;
    fragment: ObservationFragment;
    currentFragment: ObservationFragment | null;
    fresh: boolean;
  }>;
}

export interface RecallResult {
  query: string;
  admitted: RecallItem[];
  withheld: RecallItem[];
}

export type ReceiptDemoAction =
  | "reset"
  | "observe"
  | "propose"
  | "approve"
  | "act"
  | "change"
  | "refresh"
  | "recall";

export interface ReceiptDemoResult {
  action: ReceiptDemoAction;
  message: string;
  snapshot: ReceiptSnapshot;
  recall?: RecallResult;
}
