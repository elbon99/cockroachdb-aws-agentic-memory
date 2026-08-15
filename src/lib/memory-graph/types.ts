export type ClaimStatus = "valid" | "stale" | "unprovable" | "superseded";
export type EvidenceStrength = "proven" | "partial" | "unknown";
export type AgentRole = "root" | "subagent";
export type WriteOutcome = "applied" | "rejected_stale";

export interface AgentIdentity {
  id: string;
  teamId: string;
  parentAgentId: string | null;
  displayName: string;
  role: AgentRole;
  sessionId: string;
}

export interface TrackedRepository {
  id: string;
  tenantId: string;
  displayName: string;
  remoteUrl: string;
  branch: string;
  localHead: string;
  remoteHead: string;
  remoteFreshness: "current" | "changed" | "unknown";
  checkedAt: string;
}

export interface TrackedFile {
  id: string;
  tenantId: string;
  repositoryId: string;
  path: string;
  content: string;
  contentHash: string;
  sourceRevision: string;
  updatedByAgentId: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  tenantId: string;
  repositoryId: string;
  fileId: string;
  path: string;
  selector: string;
  kind: "json-pointer" | "whole-file";
  currentVersionId: string;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  ordinal: number;
  content: string;
  contentHash: string;
  fileContentHash: string;
  sourceRevision: string;
  createdByAgentId: string;
  createdAt: string;
}

export interface MemoryClaim {
  id: string;
  tenantId: string;
  repositoryId: string;
  statement: string;
  status: ClaimStatus;
  evidenceStrength: EvidenceStrength;
  embedding: number[];
  createdByAgentId: string;
  validFromRevision: string;
  invalidatedAt: string | null;
  invalidationReason: string | null;
  supersededByClaimId: string | null;
  createdAt: string;
}

export interface ClaimDependency {
  claimId: string;
  artifactId: string;
  anchoredVersionId: string;
  relationship: "supported_by" | "constrained_by";
  required: boolean;
}

export interface ClaimRelationship {
  fromClaimId: string;
  toClaimId: string;
  relationship: "derived_from" | "supersedes" | "contradicts";
}

export interface ReadReceipt {
  id: string;
  tenantId: string;
  agentId: string;
  artifactId: string;
  artifactVersionId: string;
  purpose: string;
  readAt: string;
}

export interface WriteEvent {
  id: string;
  tenantId: string;
  repositoryId: string;
  agentId: string;
  fileId: string;
  path: string;
  expectedFileHash: string;
  observedFileHash: string;
  newFileHash: string | null;
  summary: string;
  sourceRevision: string;
  outcome: WriteOutcome;
  changedArtifactIds: string[];
  invalidatedClaimIds: string[];
  createdAt: string;
}

export interface ChangeCapsule {
  path: string;
  selector: string;
  currentVersionId: string;
  currentContentHash: string;
  changesSinceLastRead: Array<{
    agentId: string;
    summary: string;
    outcome: WriteOutcome;
    createdAt: string;
    newFileHash: string | null;
  }>;
}

export interface ReadResult {
  artifact: Artifact;
  version: ArtifactVersion;
  capsule: ChangeCapsule;
}

export interface RecallCandidate {
  claim: MemoryClaim;
  distance: number;
  dependencies: Array<{
    dependency: ClaimDependency;
    artifact: Artifact;
    anchoredVersion: ArtifactVersion;
    currentVersion: ArtifactVersion;
    fresh: boolean;
  }>;
  derivedFromClaimIds: string[];
}

export interface RecallResult {
  query: string;
  admissible: RecallCandidate[];
  withheld: RecallCandidate[];
  generatedAt: string;
}

export interface MemoryGraphSnapshot {
  mode: "local-demo" | "cockroachdb";
  repository: TrackedRepository;
  agents: AgentIdentity[];
  files: TrackedFile[];
  artifacts: Artifact[];
  artifactVersions: ArtifactVersion[];
  claims: MemoryClaim[];
  dependencies: ClaimDependency[];
  relationships: ClaimRelationship[];
  reads: ReadReceipt[];
  writes: WriteEvent[];
}

export interface MemoryGraphSeed extends Omit<MemoryGraphSnapshot, "mode"> {}

export interface RecordReadInput {
  tenantId: string;
  repositoryId: string;
  agentId: string;
  path: string;
  selector: string;
  purpose: string;
}

export interface ApplyWriteInput {
  tenantId: string;
  repositoryId: string;
  agentId: string;
  path: string;
  expectedFileHash: string;
  content: string;
  summary: string;
  sourceRevision: string;
}

export interface ApplyWriteResult {
  event: WriteEvent;
  file: TrackedFile;
  changedArtifacts: Artifact[];
  invalidatedClaims: MemoryClaim[];
}

export interface RememberClaimInput {
  id?: string;
  tenantId: string;
  repositoryId: string;
  agentId: string;
  statement: string;
  evidenceStrength: EvidenceStrength;
  dependencies: Array<{
    artifactId: string;
    artifactVersionId: string;
    relationship: ClaimDependency["relationship"];
    required?: boolean;
  }>;
  derivedFromClaimIds?: string[];
  supersedesClaimId?: string;
  sourceRevision: string;
}
