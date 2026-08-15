import type {
  ApplyWriteInput,
  ApplyWriteResult,
  MemoryGraphSeed,
  MemoryGraphSnapshot,
  ReadResult,
  RecallResult,
  RecordReadInput,
  RememberClaimInput,
  MemoryClaim,
} from "@/lib/memory-graph/types";

export interface MemoryGraphStore {
  readonly mode: "local-demo" | "cockroachdb";
  reset(seed: MemoryGraphSeed): Promise<void>;
  snapshot(repositoryId: string): Promise<MemoryGraphSnapshot>;
  recordRead(input: RecordReadInput): Promise<ReadResult>;
  applyWrite(input: ApplyWriteInput): Promise<ApplyWriteResult>;
  rememberClaim(input: RememberClaimInput): Promise<MemoryClaim>;
  recall(repositoryId: string, query: string, limit?: number): Promise<RecallResult>;
}
