import type {
  AuditEvent,
  ContextBlock,
  DemoSeed,
  DemoSnapshot,
  EnvironmentState,
  EvidenceMemory,
  InvocationReceipt,
  PublicationResult,
  ReleaseManifest,
  RetrievedEvidence,
} from "@/lib/domain/types";

export interface ContextSealRepository {
  readonly mode: "cockroachdb" | "local-demo";
  reset(seed: DemoSeed): Promise<void>;
  getEnvironment(environmentId: string): Promise<EnvironmentState>;
  getRelease(releaseId: string): Promise<ReleaseManifest>;
  listReleases(environmentId: string): Promise<ReleaseManifest[]>;
  getBlocks(blockIds: string[]): Promise<ContextBlock[]>;
  getEvidence(evidenceIds: string[]): Promise<EvidenceMemory[]>;
  searchEvidence(input: {
    tenantId: string;
    releaseId: string;
    purpose: string;
    query: string;
    limit: number;
  }): Promise<RetrievedEvidence[]>;
  publishRelease(candidateId: string): Promise<PublicationResult>;
  saveInvocation(receipt: InvocationReceipt): Promise<void>;
  getInvocation(invocationId: string): Promise<InvocationReceipt>;
  listInvocations(environmentId: string): Promise<InvocationReceipt[]>;
  listAuditEvents(environmentId: string): Promise<AuditEvent[]>;
  getSnapshot(environmentId: string, supportCase: DemoSeed["supportCase"]): Promise<DemoSnapshot>;
}
