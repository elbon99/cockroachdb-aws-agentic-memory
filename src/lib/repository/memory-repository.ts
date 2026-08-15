import { randomUUID } from "node:crypto";

import { cosineDistance, embedText } from "@/lib/domain/embedding";
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
  SupportCase,
} from "@/lib/domain/types";
import type { ContextSealRepository } from "@/lib/repository/repository";

export class MemoryContextSealRepository implements ContextSealRepository {
  readonly mode = "local-demo" as const;

  private environment: EnvironmentState | null = null;
  private releases = new Map<string, ReleaseManifest>();
  private blocks = new Map<string, ContextBlock>();
  private evidence = new Map<string, EvidenceMemory>();
  private invocations = new Map<string, InvocationReceipt>();
  private auditEvents: AuditEvent[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  async reset(seed: DemoSeed): Promise<void> {
    await this.withTransaction(async () => {
      this.environment = structuredClone(seed.environment);
      this.releases = new Map(seed.releases.map((release) => [release.id, structuredClone(release)]));
      this.blocks = new Map(seed.blocks.map((block) => [block.id, structuredClone(block)]));
      this.evidence = new Map(seed.evidence.map((item) => [item.id, structuredClone(item)]));
      this.invocations.clear();
      this.auditEvents = [
        {
          id: randomUUID(),
          tenantId: seed.environment.tenantId,
          environmentId: seed.environment.id,
          type: "demo_reset",
          releaseId: seed.environment.activeReleaseId,
          payload: { evidenceRows: seed.evidence.length },
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }

  async getEnvironment(environmentId: string): Promise<EnvironmentState> {
    if (!this.environment || this.environment.id !== environmentId) {
      throw new Error(`Environment ${environmentId} was not found`);
    }
    return structuredClone(this.environment);
  }

  async getRelease(releaseId: string): Promise<ReleaseManifest> {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error(`Release ${releaseId} was not found`);
    }
    return structuredClone(release);
  }

  async listReleases(environmentId: string): Promise<ReleaseManifest[]> {
    return [...this.releases.values()]
      .filter((release) => release.environmentId === environmentId)
      .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id))
      .map((release) => structuredClone(release));
  }

  async getBlocks(blockIds: string[]): Promise<ContextBlock[]> {
    return blockIds.map((blockId) => {
      const block = this.blocks.get(blockId);
      if (!block) {
        throw new Error(`Context block ${blockId} was not found`);
      }
      return structuredClone(block);
    });
  }

  async getEvidence(evidenceIds: string[]): Promise<EvidenceMemory[]> {
    return evidenceIds.map((evidenceId) => {
      const evidence = this.evidence.get(evidenceId);
      if (!evidence) {
        throw new Error(`Evidence ${evidenceId} was not found`);
      }
      return structuredClone(evidence);
    });
  }

  async searchEvidence(input: {
    tenantId: string;
    releaseId: string;
    purpose: string;
    query: string;
    limit: number;
  }): Promise<RetrievedEvidence[]> {
    const queryEmbedding = embedText(input.query);

    return [...this.evidence.values()]
      .filter(
        (item) =>
          item.tenantId === input.tenantId &&
          item.releaseId === input.releaseId &&
          item.purpose === input.purpose &&
          item.status === "approved",
      )
      .map((item) => ({ ...structuredClone(item), distance: cosineDistance(queryEmbedding, item.embedding) }))
      .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
      .slice(0, input.limit);
  }

  async publishRelease(candidateId: string): Promise<PublicationResult> {
    return this.withTransaction(async () => {
      if (!this.environment) {
        throw new Error("Repository has not been initialized");
      }
      const candidate = this.releases.get(candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} was not found`);
      }
      if (candidate.status !== "candidate") {
        return {
          candidateId,
          outcome: candidate.status === "active" ? "activated" : "stale",
          activeReleaseId: this.environment.activeReleaseId,
          attempts: 1,
          reason: `Candidate is already ${candidate.status}`,
        };
      }

      const expectedBase = candidate.expectedBaseReleaseId;
      if (!expectedBase || this.environment.activeReleaseId !== expectedBase) {
        candidate.status = "stale";
        this.auditEvents.unshift({
          id: randomUUID(),
          tenantId: candidate.tenantId,
          environmentId: candidate.environmentId,
          type: "release_rejected_stale",
          releaseId: candidate.id,
          payload: {
            expectedBaseReleaseId: expectedBase,
            observedActiveReleaseId: this.environment.activeReleaseId,
          },
          createdAt: new Date().toISOString(),
        });
        return {
          candidateId,
          outcome: "stale",
          activeReleaseId: this.environment.activeReleaseId,
          attempts: 1,
          reason: `Expected ${expectedBase}, observed ${this.environment.activeReleaseId}`,
        };
      }

      const referencedBlocks = candidate.blockIds.map((blockId) => this.blocks.get(blockId));
      if (referencedBlocks.some((block) => !block || block.status !== "approved")) {
        throw new Error(`Candidate ${candidateId} references a missing or unapproved block`);
      }

      const former = this.releases.get(expectedBase);
      if (former) {
        former.status = "superseded";
      }
      candidate.status = "active";
      candidate.activatedAt = new Date().toISOString();
      this.environment.activeReleaseId = candidate.id;
      this.environment.pointerVersion += 1;
      this.environment.updatedAt = candidate.activatedAt;
      this.auditEvents.unshift({
        id: randomUUID(),
        tenantId: candidate.tenantId,
        environmentId: candidate.environmentId,
        type: "release_activated",
        releaseId: candidate.id,
        payload: {
          expectedBaseReleaseId: expectedBase,
          compiledPrefixHash: candidate.compiledPrefixHash,
        },
        createdAt: candidate.activatedAt,
      });

      return {
        candidateId,
        outcome: "activated",
        activeReleaseId: candidate.id,
        attempts: 1,
        reason: `Atomic expected-base transition ${expectedBase} → ${candidate.id}`,
      };
    });
  }

  async saveInvocation(receipt: InvocationReceipt): Promise<void> {
    await this.withTransaction(async () => {
      this.invocations.set(receipt.id, structuredClone(receipt));
      this.auditEvents.unshift({
        id: randomUUID(),
        tenantId: receipt.tenantId,
        environmentId: receipt.environmentId,
        type: "invocation_completed",
        releaseId: receipt.releaseId,
        payload: {
          invocationId: receipt.id,
          requestHash: receipt.requestHash,
          action: receipt.action.tool,
          evidenceIds: receipt.evidenceIds,
        },
        createdAt: receipt.createdAt,
      });
    });
  }

  async getInvocation(invocationId: string): Promise<InvocationReceipt> {
    const receipt = this.invocations.get(invocationId);
    if (!receipt) {
      throw new Error(`Invocation ${invocationId} was not found`);
    }
    return structuredClone(receipt);
  }

  async listInvocations(environmentId: string): Promise<InvocationReceipt[]> {
    return [...this.invocations.values()]
      .filter((receipt) => receipt.environmentId === environmentId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((receipt) => structuredClone(receipt));
  }

  async listAuditEvents(environmentId: string): Promise<AuditEvent[]> {
    return this.auditEvents
      .filter((event) => event.environmentId === environmentId)
      .map((event) => structuredClone(event));
  }

  async getSnapshot(environmentId: string, supportCase: SupportCase): Promise<DemoSnapshot> {
    const environment = await this.getEnvironment(environmentId);
    const activeRelease = await this.getRelease(environment.activeReleaseId);

    return {
      mode: {
        database: this.mode,
        agent: process.env.AGENT_ENGINE === "bedrock" ? "bedrock" : "deterministic",
        providerTelemetry: process.env.AGENT_ENGINE === "bedrock",
      },
      environment,
      activeRelease,
      releases: await this.listReleases(environmentId),
      blocks: await this.getBlocks(activeRelease.blockIds),
      invocations: await this.listInvocations(environmentId),
      auditEvents: await this.listAuditEvents(environmentId),
      supportCase,
    };
  }

  private async withTransaction<T>(operation: () => Promise<T> | T): Promise<T> {
    const previous = this.transactionTail;
    let releaseLock!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      releaseLock();
    }
  }
}
