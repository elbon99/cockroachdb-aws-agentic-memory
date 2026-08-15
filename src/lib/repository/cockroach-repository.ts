import { randomUUID } from "node:crypto";

import { Pool, type PoolClient } from "pg";

import { embedText, toVectorLiteral } from "@/lib/domain/embedding";
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

type DatabaseRow = Record<string, unknown>;

function iso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(String(value)).toISOString();
}
function mapEnvironment(row: DatabaseRow): EnvironmentState {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    activeReleaseId: String(row.active_release_id),
    pointerVersion: Number(row.pointer_version),
    updatedAt: iso(row.updated_at),
  };
}

function mapRelease(row: DatabaseRow): ReleaseManifest {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    environmentId: String(row.environment_id),
    displayName: String(row.display_name),
    sequence: Number(row.sequence),
    candidateName: row.candidate_name === null ? null : String(row.candidate_name),
    expectedBaseReleaseId:
      row.expected_base_release_id === null ? null : String(row.expected_base_release_id),
    status: row.status as ReleaseManifest["status"],
    blockIds: row.block_ids as string[],
    compiledPrefix: String(row.compiled_prefix),
    compiledPrefixHash: String(row.compiled_prefix_hash),
    createdAt: iso(row.created_at),
    activatedAt: row.activated_at === null ? null : iso(row.activated_at),
  };
}

function mapBlock(row: DatabaseRow): ContextBlock {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    kind: row.kind as ContextBlock["kind"],
    version: Number(row.version),
    title: String(row.title),
    content: String(row.content),
    contentHash: String(row.content_hash),
    status: row.status as ContextBlock["status"],
    metadata: row.metadata as ContextBlock["metadata"],
    createdAt: iso(row.created_at),
  };
}

function parseVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number);
  }
  return String(value)
    .replace(/^\[|\]$/g, "")
    .split(",")
    .filter(Boolean)
    .map(Number);
}

function mapEvidence(row: DatabaseRow): EvidenceMemory {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    releaseId: String(row.release_id),
    purpose: String(row.purpose),
    title: String(row.title),
    content: String(row.content),
    contentHash: String(row.content_hash),
    sourceUri: String(row.source_uri),
    status: row.status as EvidenceMemory["status"],
    embedding: parseVector(row.embedding),
    createdAt: iso(row.created_at),
  };
}

function mapInvocation(row: DatabaseRow): InvocationReceipt {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    environmentId: String(row.environment_id),
    releaseId: String(row.release_id),
    caseInput: row.case_input as InvocationReceipt["caseInput"],
    evidenceIds: row.evidence_ids as string[],
    requestEnvelope: row.request_envelope as InvocationReceipt["requestEnvelope"],
    requestHash: String(row.request_hash),
    action: row.action as InvocationReceipt["action"],
    engine: row.engine as InvocationReceipt["engine"],
    usage: row.usage as InvocationReceipt["usage"],
    createdAt: iso(row.created_at),
  };
}

function mapAudit(row: DatabaseRow): AuditEvent {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    environmentId: String(row.environment_id),
    type: row.type as AuditEvent["type"],
    releaseId: row.release_id === null ? null : String(row.release_id),
    payload: row.payload as AuditEvent["payload"],
    createdAt: iso(row.created_at),
  };
}

export class CockroachContextSealRepository implements ContextSealRepository {
  readonly mode = "cockroachdb" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 8,
      application_name: "contextseal",
    });
  }

  async reset(seed: DemoSeed): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM audit_events WHERE tenant_id = $1", [seed.environment.tenantId]);
      await client.query("DELETE FROM invocations WHERE tenant_id = $1", [seed.environment.tenantId]);
      await client.query("DELETE FROM evidence_memories WHERE tenant_id = $1", [seed.environment.tenantId]);
      await client.query("DELETE FROM releases WHERE tenant_id = $1", [seed.environment.tenantId]);
      await client.query("DELETE FROM context_blocks WHERE tenant_id = $1", [seed.environment.tenantId]);
      await client.query("DELETE FROM environments WHERE tenant_id = $1", [seed.environment.tenantId]);

      await client.query(
        `INSERT INTO environments
          (id, tenant_id, name, active_release_id, pointer_version, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          seed.environment.id,
          seed.environment.tenantId,
          seed.environment.name,
          seed.environment.activeReleaseId,
          seed.environment.pointerVersion,
          seed.environment.updatedAt,
        ],
      );

      for (const block of seed.blocks) {
        await client.query(
          `INSERT INTO context_blocks
            (id, tenant_id, kind, version, title, content, content_hash, status, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::JSONB, $10)`,
          [
            block.id,
            block.tenantId,
            block.kind,
            block.version,
            block.title,
            block.content,
            block.contentHash,
            block.status,
            JSON.stringify(block.metadata),
            block.createdAt,
          ],
        );
      }

      for (const release of seed.releases) {
        await client.query(
          `INSERT INTO releases
            (id, tenant_id, environment_id, display_name, sequence, candidate_name,
             expected_base_release_id, status, block_ids, compiled_prefix,
             compiled_prefix_hash, created_at, activated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::STRING[], $10, $11, $12, $13)`,
          [
            release.id,
            release.tenantId,
            release.environmentId,
            release.displayName,
            release.sequence,
            release.candidateName,
            release.expectedBaseReleaseId,
            release.status,
            release.blockIds,
            release.compiledPrefix,
            release.compiledPrefixHash,
            release.createdAt,
            release.activatedAt,
          ],
        );
      }

      for (const item of seed.evidence) {
        await client.query(
          `INSERT INTO evidence_memories
            (id, tenant_id, release_id, purpose, title, content, content_hash,
             source_uri, status, embedding, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::VECTOR, $11)`,
          [
            item.id,
            item.tenantId,
            item.releaseId,
            item.purpose,
            item.title,
            item.content,
            item.contentHash,
            item.sourceUri,
            item.status,
            toVectorLiteral(item.embedding),
            item.createdAt,
          ],
        );
      }

      await this.insertAudit(client, {
        id: randomUUID(),
        tenantId: seed.environment.tenantId,
        environmentId: seed.environment.id,
        type: "demo_reset",
        releaseId: seed.environment.activeReleaseId,
        payload: { evidenceRows: seed.evidence.length },
        createdAt: new Date().toISOString(),
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getEnvironment(environmentId: string): Promise<EnvironmentState> {
    const result = await this.pool.query("SELECT * FROM environments WHERE id = $1", [environmentId]);
    if (!result.rows[0]) {
      throw new Error(`Environment ${environmentId} was not found. Run db:migrate and db:seed.`);
    }
    return mapEnvironment(result.rows[0]);
  }

  async getRelease(releaseId: string): Promise<ReleaseManifest> {
    const result = await this.pool.query("SELECT * FROM releases WHERE id = $1", [releaseId]);
    if (!result.rows[0]) {
      throw new Error(`Release ${releaseId} was not found`);
    }
    return mapRelease(result.rows[0]);
  }

  async listReleases(environmentId: string): Promise<ReleaseManifest[]> {
    const result = await this.pool.query(
      "SELECT * FROM releases WHERE environment_id = $1 ORDER BY sequence, id",
      [environmentId],
    );
    return result.rows.map(mapRelease);
  }

  async getBlocks(blockIds: string[]): Promise<ContextBlock[]> {
    if (blockIds.length === 0) return [];
    const result = await this.pool.query(
      "SELECT * FROM context_blocks WHERE id = ANY($1::STRING[])",
      [blockIds],
    );
    const blocks = new Map(result.rows.map((row) => [String(row.id), mapBlock(row)]));
    return blockIds.map((id) => {
      const block = blocks.get(id);
      if (!block) throw new Error(`Context block ${id} was not found`);
      return block;
    });
  }

  async getEvidence(evidenceIds: string[]): Promise<EvidenceMemory[]> {
    if (evidenceIds.length === 0) return [];
    const result = await this.pool.query(
      "SELECT * FROM evidence_memories WHERE id = ANY($1::STRING[])",
      [evidenceIds],
    );
    const evidence = new Map(result.rows.map((row) => [String(row.id), mapEvidence(row)]));
    return evidenceIds.map((id) => {
      const item = evidence.get(id);
      if (!item) throw new Error(`Evidence ${id} was not found`);
      return item;
    });
  }

  async searchEvidence(input: {
    tenantId: string;
    releaseId: string;
    purpose: string;
    query: string;
    limit: number;
  }): Promise<RetrievedEvidence[]> {
    const queryVector = toVectorLiteral(embedText(input.query));
    const result = await this.pool.query(
      `SELECT *, embedding <=> $4::VECTOR AS distance
       FROM evidence_memories
       WHERE tenant_id = $1
         AND release_id = $2
         AND purpose = $3
         AND status = 'approved'
       ORDER BY embedding <=> $4::VECTOR
       LIMIT $5`,
      [input.tenantId, input.releaseId, input.purpose, queryVector, input.limit],
    );
    return result.rows.map((row) => ({ ...mapEvidence(row), distance: Number(row.distance) }));
  }

  async publishRelease(candidateId: string): Promise<PublicationResult> {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        const candidateResult = await client.query("SELECT * FROM releases WHERE id = $1", [candidateId]);
        if (!candidateResult.rows[0]) throw new Error(`Candidate ${candidateId} was not found`);
        const candidate = mapRelease(candidateResult.rows[0]);

        const environmentResult = await client.query("SELECT * FROM environments WHERE id = $1", [
          candidate.environmentId,
        ]);
        if (!environmentResult.rows[0]) throw new Error(`Environment ${candidate.environmentId} was not found`);
        const environment = mapEnvironment(environmentResult.rows[0]);

        if (candidate.status !== "candidate") {
          await client.query("ROLLBACK");
          return {
            candidateId,
            outcome: candidate.status === "active" ? "activated" : "stale",
            activeReleaseId: environment.activeReleaseId,
            attempts: attempt,
            reason: `Candidate is already ${candidate.status}`,
          };
        }

        const expectedBase = candidate.expectedBaseReleaseId;
        const blockValidation = await client.query(
          `SELECT count(*)::INT AS approved_count
           FROM context_blocks
           WHERE id = ANY($1::STRING[]) AND status = 'approved'`,
          [candidate.blockIds],
        );
        if (Number(blockValidation.rows[0]?.approved_count) !== candidate.blockIds.length) {
          throw new Error(`Candidate ${candidateId} references a missing or unapproved block`);
        }

        const pointerUpdate = await client.query(
          `UPDATE environments
           SET active_release_id = $1, pointer_version = pointer_version + 1, updated_at = now()
           WHERE id = $2 AND active_release_id = $3
           RETURNING active_release_id`,
          [candidate.id, candidate.environmentId, expectedBase],
        );

        if (pointerUpdate.rowCount !== 1) {
          await client.query("UPDATE releases SET status = 'stale' WHERE id = $1", [candidate.id]);
          await this.insertAudit(client, {
            id: randomUUID(),
            tenantId: candidate.tenantId,
            environmentId: candidate.environmentId,
            type: "release_rejected_stale",
            releaseId: candidate.id,
            payload: {
              expectedBaseReleaseId: expectedBase,
              observedActiveReleaseId: environment.activeReleaseId,
            },
            createdAt: new Date().toISOString(),
          });
          await client.query("COMMIT");
          const observed = await this.getEnvironment(candidate.environmentId);
          return {
            candidateId,
            outcome: "stale",
            activeReleaseId: observed.activeReleaseId,
            attempts: attempt,
            reason: `Expected ${expectedBase}, observed ${observed.activeReleaseId}`,
          };
        }

        await client.query("UPDATE releases SET status = 'superseded' WHERE id = $1", [expectedBase]);
        await client.query(
          "UPDATE releases SET status = 'active', activated_at = now() WHERE id = $1",
          [candidate.id],
        );
        await this.insertAudit(client, {
          id: randomUUID(),
          tenantId: candidate.tenantId,
          environmentId: candidate.environmentId,
          type: "release_activated",
          releaseId: candidate.id,
          payload: {
            expectedBaseReleaseId: expectedBase,
            compiledPrefixHash: candidate.compiledPrefixHash,
          },
          createdAt: new Date().toISOString(),
        });
        await client.query("COMMIT");
        return {
          candidateId,
          outcome: "activated",
          activeReleaseId: candidate.id,
          attempts: attempt,
          reason: `Atomic expected-base transition ${expectedBase} → ${candidate.id}`,
        };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        const code = (error as { code?: string }).code;
        if (code === "40001" && attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 15 * attempt));
          continue;
        }
        throw error;
      } finally {
        client.release();
      }
    }
    throw new Error(`Publication ${candidateId} exhausted retry budget`);
  }

  async saveInvocation(receipt: InvocationReceipt): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO invocations
          (id, tenant_id, environment_id, release_id, case_input, evidence_ids,
           request_envelope, request_hash, action, engine, usage, created_at)
         VALUES ($1, $2, $3, $4, $5::JSONB, $6::STRING[], $7::JSONB, $8,
                 $9::JSONB, $10, $11::JSONB, $12)`,
        [
          receipt.id,
          receipt.tenantId,
          receipt.environmentId,
          receipt.releaseId,
          JSON.stringify(receipt.caseInput),
          receipt.evidenceIds,
          JSON.stringify(receipt.requestEnvelope),
          receipt.requestHash,
          JSON.stringify(receipt.action),
          receipt.engine,
          JSON.stringify(receipt.usage),
          receipt.createdAt,
        ],
      );
      await this.insertAudit(client, {
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
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getInvocation(invocationId: string): Promise<InvocationReceipt> {
    const result = await this.pool.query("SELECT * FROM invocations WHERE id = $1", [invocationId]);
    if (!result.rows[0]) throw new Error(`Invocation ${invocationId} was not found`);
    return mapInvocation(result.rows[0]);
  }

  async listInvocations(environmentId: string): Promise<InvocationReceipt[]> {
    const result = await this.pool.query(
      "SELECT * FROM invocations WHERE environment_id = $1 ORDER BY created_at DESC",
      [environmentId],
    );
    return result.rows.map(mapInvocation);
  }

  async listAuditEvents(environmentId: string): Promise<AuditEvent[]> {
    const result = await this.pool.query(
      "SELECT * FROM audit_events WHERE environment_id = $1 ORDER BY created_at DESC LIMIT 50",
      [environmentId],
    );
    return result.rows.map(mapAudit);
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

  private async insertAudit(client: PoolClient, event: AuditEvent): Promise<void> {
    await client.query(
      `INSERT INTO audit_events
        (id, tenant_id, environment_id, type, release_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::JSONB, $7)`,
      [
        event.id,
        event.tenantId,
        event.environmentId,
        event.type,
        event.releaseId,
        JSON.stringify(event.payload),
        event.createdAt,
      ],
    );
  }
}
