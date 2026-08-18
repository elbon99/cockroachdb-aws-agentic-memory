import type {
  ActionReceipt,
  MemoryClaim,
  MemoryReview,
  RecallResult,
  ReceiptSnapshot,
} from "@/lib/receipts/types";

export interface ObserveInput {
  sourceId: string;
  toolName: string;
  request: Record<string, unknown>;
  response: unknown;
  sourceVersion: string;
  fragments: Array<{ selector: string; value: unknown }>;
  runId: string;
  step: number;
}

export interface ProposeInput {
  statement: string;
  rationale: string;
  fragmentIds: string[];
  proposedBy: MemoryClaim["proposedBy"];
}

export interface ReceiptStore {
  readonly mode: ReceiptSnapshot["mode"];
  reset(): Promise<void>;
  snapshot(): Promise<ReceiptSnapshot>;
  observe(input: ObserveInput): Promise<{ observationId: string; changed: boolean }>;
  propose(input: ProposeInput): Promise<MemoryClaim>;
  review(memoryId: string, decision: MemoryReview["decision"], reason: string): Promise<MemoryReview>;
  recall(query: string, limit?: number): Promise<RecallResult>;
  act(action: ActionReceipt["action"]): Promise<ActionReceipt>;
}
