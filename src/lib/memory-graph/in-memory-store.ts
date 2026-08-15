import { randomUUID } from "node:crypto";

import { cosineDistance, embedText } from "@/lib/domain/embedding";
import { sha256 } from "@/lib/domain/hash";
import { canonicalPointerValue } from "@/lib/memory-graph/json-pointer";
import type { MemoryGraphStore } from "@/lib/memory-graph/store";
import type {
  ApplyWriteInput,
  ApplyWriteResult,
  Artifact,
  ArtifactVersion,
  ClaimDependency,
  ClaimRelationship,
  MemoryClaim,
  MemoryGraphSeed,
  MemoryGraphSnapshot,
  ReadReceipt,
  ReadResult,
  RecallCandidate,
  RecallResult,
  RecordReadInput,
  RememberClaimInput,
  TrackedFile,
  WriteEvent,
} from "@/lib/memory-graph/types";

export class InMemoryGraphStore implements MemoryGraphStore {
  readonly mode = "local-demo" as const;

  private seed: MemoryGraphSeed | null = null;
  private transactionTail: Promise<void> = Promise.resolve();

  async reset(seed: MemoryGraphSeed): Promise<void> {
    await this.withTransaction(() => {
      this.seed = structuredClone(seed);
    });
  }

  async snapshot(repositoryId: string): Promise<MemoryGraphSnapshot> {
    const state = this.state();
    if (state.repository.id !== repositoryId) {
      throw new Error(`Repository ${repositoryId} was not found`);
    }
    return { mode: this.mode, ...structuredClone(state) };
  }

  async recordRead(input: RecordReadInput): Promise<ReadResult> {
    return this.withTransaction(() => {
      const state = this.state();
      this.assertScope(input.tenantId, input.repositoryId, input.agentId);
      const artifact = state.artifacts.find(
        (item) => item.path === input.path && item.selector === input.selector,
      );
      if (!artifact) {
        throw new Error(`Artifact ${input.path}#${input.selector} is not tracked`);
      }
      const version = this.version(artifact.currentVersionId);
      const previousRead = [...state.reads]
        .reverse()
        .find((receipt) => receipt.agentId === input.agentId && receipt.artifactId === artifact.id);
      const changesSinceLastRead = state.writes
        .filter(
          (event) =>
            event.fileId === artifact.fileId &&
            (!previousRead || event.createdAt >= previousRead.readAt),
        )
        .map((event) => ({
          agentId: event.agentId,
          summary: event.summary,
          outcome: event.outcome,
          createdAt: event.createdAt,
          newFileHash: event.newFileHash,
        }));

      const receipt: ReadReceipt = {
        id: randomUUID(),
        tenantId: input.tenantId,
        agentId: input.agentId,
        artifactId: artifact.id,
        artifactVersionId: version.id,
        purpose: input.purpose,
        readAt: new Date().toISOString(),
      };
      state.reads.push(receipt);

      return {
        artifact: structuredClone(artifact),
        version: structuredClone(version),
        capsule: {
          path: artifact.path,
          selector: artifact.selector,
          currentVersionId: version.id,
          currentContentHash: version.contentHash,
          changesSinceLastRead,
        },
      };
    });
  }

  async applyWrite(input: ApplyWriteInput): Promise<ApplyWriteResult> {
    return this.withTransaction(() => {
      const state = this.state();
      this.assertScope(input.tenantId, input.repositoryId, input.agentId);
      const file = state.files.find((item) => item.path === input.path);
      if (!file) {
        throw new Error(`File ${input.path} is not tracked`);
      }

      const now = new Date().toISOString();
      if (file.contentHash !== input.expectedFileHash) {
        const event = this.writeEvent(input, file, now, "rejected_stale", null, [], []);
        state.writes.push(event);
        return {
          event: structuredClone(event),
          file: structuredClone(file),
          changedArtifacts: [],
          invalidatedClaims: [],
        };
      }

      const artifacts = state.artifacts.filter((item) => item.fileId === file.id);
      const pending = artifacts.map((artifact) => {
        const content =
          artifact.kind === "whole-file"
            ? input.content
            : canonicalPointerValue(input.content, artifact.selector);
        return { artifact, content, contentHash: sha256(content) };
      });
      const newFileHash = sha256(input.content);
      const changedArtifacts: Artifact[] = [];

      for (const item of pending) {
        const current = this.version(item.artifact.currentVersionId);
        if (current.contentHash === item.contentHash) {
          continue;
        }
        const version: ArtifactVersion = {
          id: randomUUID(),
          artifactId: item.artifact.id,
          ordinal: current.ordinal + 1,
          content: item.content,
          contentHash: item.contentHash,
          fileContentHash: newFileHash,
          sourceRevision: input.sourceRevision,
          createdByAgentId: input.agentId,
          createdAt: now,
        };
        state.artifactVersions.push(version);
        item.artifact.currentVersionId = version.id;
        changedArtifacts.push(structuredClone(item.artifact));
      }

      file.content = input.content;
      file.contentHash = newFileHash;
      file.sourceRevision = input.sourceRevision;
      file.updatedByAgentId = input.agentId;
      file.updatedAt = now;

      const invalidated = this.invalidateClaims(changedArtifacts, now);
      const event = this.writeEvent(
        input,
        file,
        now,
        "applied",
        newFileHash,
        changedArtifacts.map((item) => item.id),
        invalidated.map((item) => item.id),
      );
      state.writes.push(event);

      return {
        event: structuredClone(event),
        file: structuredClone(file),
        changedArtifacts,
        invalidatedClaims: invalidated.map((item) => structuredClone(item)),
      };
    });
  }

  async rememberClaim(input: RememberClaimInput): Promise<MemoryClaim> {
    return this.withTransaction(() => {
      const state = this.state();
      this.assertScope(input.tenantId, input.repositoryId, input.agentId);
      const now = new Date().toISOString();
      const id = input.id ?? randomUUID();
      if (state.claims.some((item) => item.id === id)) {
        throw new Error(`Claim ${id} already exists`);
      }

      for (const dependency of input.dependencies) {
        const artifact = state.artifacts.find((item) => item.id === dependency.artifactId);
        if (!artifact || artifact.currentVersionId !== dependency.artifactVersionId) {
          throw new Error(`Cannot create claim from stale artifact ${dependency.artifactId}`);
        }
      }
      for (const parentId of input.derivedFromClaimIds ?? []) {
        const parent = state.claims.find((item) => item.id === parentId);
        if (!parent || parent.status !== "valid") {
          throw new Error(`Cannot derive from non-valid claim ${parentId}`);
        }
      }

      const claim: MemoryClaim = {
        id,
        tenantId: input.tenantId,
        repositoryId: input.repositoryId,
        statement: input.statement,
        status: "valid",
        evidenceStrength: input.evidenceStrength,
        embedding: embedText(input.statement),
        createdByAgentId: input.agentId,
        validFromRevision: input.sourceRevision,
        invalidatedAt: null,
        invalidationReason: null,
        supersededByClaimId: null,
        createdAt: now,
      };
      state.claims.push(claim);
      state.dependencies.push(
        ...input.dependencies.map<ClaimDependency>((dependency) => ({
          claimId: id,
          artifactId: dependency.artifactId,
          anchoredVersionId: dependency.artifactVersionId,
          relationship: dependency.relationship,
          required: dependency.required ?? true,
        })),
      );
      state.relationships.push(
        ...(input.derivedFromClaimIds ?? []).map<ClaimRelationship>((parentId) => ({
          fromClaimId: id,
          toClaimId: parentId,
          relationship: "derived_from",
        })),
      );

      if (input.supersedesClaimId) {
        const former = state.claims.find((item) => item.id === input.supersedesClaimId);
        if (!former) {
          throw new Error(`Superseded claim ${input.supersedesClaimId} was not found`);
        }
        former.status = "superseded";
        former.supersededByClaimId = id;
        former.invalidatedAt ??= now;
        state.relationships.push({
          fromClaimId: id,
          toClaimId: former.id,
          relationship: "supersedes",
        });
      }
      return structuredClone(claim);
    });
  }

  async recall(repositoryId: string, query: string, limit = 5): Promise<RecallResult> {
    const state = this.state();
    if (state.repository.id !== repositoryId) {
      throw new Error(`Repository ${repositoryId} was not found`);
    }
    const queryEmbedding = embedText(query);
    const candidates = state.claims
      .map((claim) => this.recallCandidate(claim, cosineDistance(queryEmbedding, claim.embedding)))
      .sort((left, right) => left.distance - right.distance || left.claim.id.localeCompare(right.claim.id));

    return {
      query,
      admissible: candidates
        .filter((candidate) => this.isAdmissible(candidate))
        .slice(0, limit),
      withheld: candidates
        .filter((candidate) => !this.isAdmissible(candidate))
        .slice(0, limit),
      generatedAt: new Date().toISOString(),
    };
  }

  private invalidateClaims(changedArtifacts: Artifact[], now: string): MemoryClaim[] {
    const state = this.state();
    const changedIds = new Set(changedArtifacts.map((item) => item.id));
    const invalidated = new Map<string, MemoryClaim>();
    const queue = state.dependencies
      .filter((dependency) => changedIds.has(dependency.artifactId))
      .map((dependency) => dependency.claimId);

    while (queue.length > 0) {
      const claimId = queue.shift()!;
      if (invalidated.has(claimId)) {
        continue;
      }
      const claim = state.claims.find((item) => item.id === claimId);
      if (!claim || claim.status !== "valid") {
        continue;
      }
      claim.status = "stale";
      claim.invalidatedAt = now;
      claim.invalidationReason = "An anchored artifact or upstream claim changed";
      invalidated.set(claim.id, claim);
      for (const relation of state.relationships) {
        if (relation.relationship === "derived_from" && relation.toClaimId === claim.id) {
          queue.push(relation.fromClaimId);
        }
      }
    }
    return [...invalidated.values()];
  }

  private recallCandidate(claim: MemoryClaim, distance: number): RecallCandidate {
    const state = this.state();
    const dependencies = state.dependencies
      .filter((item) => item.claimId === claim.id)
      .map((dependency) => {
        const artifact = state.artifacts.find((item) => item.id === dependency.artifactId);
        if (!artifact) {
          throw new Error(`Artifact ${dependency.artifactId} was not found`);
        }
        const anchoredVersion = this.version(dependency.anchoredVersionId);
        const currentVersion = this.version(artifact.currentVersionId);
        return {
          dependency: structuredClone(dependency),
          artifact: structuredClone(artifact),
          anchoredVersion: structuredClone(anchoredVersion),
          currentVersion: structuredClone(currentVersion),
          fresh: anchoredVersion.id === currentVersion.id,
        };
      });
    return {
      claim: structuredClone(claim),
      distance,
      dependencies,
      derivedFromClaimIds: state.relationships
        .filter((item) => item.fromClaimId === claim.id && item.relationship === "derived_from")
        .map((item) => item.toClaimId),
    };
  }

  private isAdmissible(candidate: RecallCandidate): boolean {
    const state = this.state();
    return (
      candidate.claim.status === "valid" &&
      candidate.dependencies.every((item) => !item.dependency.required || item.fresh) &&
      candidate.derivedFromClaimIds.every(
        (claimId) => state.claims.find((item) => item.id === claimId)?.status === "valid",
      )
    );
  }

  private writeEvent(
    input: ApplyWriteInput,
    file: TrackedFile,
    createdAt: string,
    outcome: WriteEvent["outcome"],
    newFileHash: string | null,
    changedArtifactIds: string[],
    invalidatedClaimIds: string[],
  ): WriteEvent {
    return {
      id: randomUUID(),
      tenantId: input.tenantId,
      repositoryId: input.repositoryId,
      agentId: input.agentId,
      fileId: file.id,
      path: input.path,
      expectedFileHash: input.expectedFileHash,
      observedFileHash: outcome === "applied" ? input.expectedFileHash : file.contentHash,
      newFileHash,
      summary: input.summary,
      sourceRevision: input.sourceRevision,
      outcome,
      changedArtifactIds,
      invalidatedClaimIds,
      createdAt,
    };
  }

  private assertScope(tenantId: string, repositoryId: string, agentId: string): void {
    const state = this.state();
    if (state.repository.tenantId !== tenantId || state.repository.id !== repositoryId) {
      throw new Error("Tenant or repository scope does not match");
    }
    if (!state.agents.some((agent) => agent.id === agentId)) {
      throw new Error(`Agent ${agentId} was not found`);
    }
  }

  private version(id: string): ArtifactVersion {
    const version = this.state().artifactVersions.find((item) => item.id === id);
    if (!version) {
      throw new Error(`Artifact version ${id} was not found`);
    }
    return version;
  }

  private state(): MemoryGraphSeed {
    if (!this.seed) {
      throw new Error("Memory graph has not been initialized");
    }
    return this.seed;
  }

  private async withTransaction<T>(operation: () => Promise<T> | T): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}
