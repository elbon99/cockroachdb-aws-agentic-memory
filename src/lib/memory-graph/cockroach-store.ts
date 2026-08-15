import { randomUUID } from "node:crypto";

import { Pool, type PoolClient } from "pg";

import { cosineDistance, embedText, toVectorLiteral } from "@/lib/domain/embedding";
import { sha256 } from "@/lib/domain/hash";
import { canonicalPointerValue } from "@/lib/memory-graph/json-pointer";
import type { MemoryGraphStore } from "@/lib/memory-graph/store";
import type {
  AgentIdentity,
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
  TrackedRepository,
  WriteEvent,
} from "@/lib/memory-graph/types";

type Row = Record<string, unknown>;

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function vector(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  return String(value).replace(/^\[|\]$/g, "").split(",").filter(Boolean).map(Number);
}

function mapRepository(row: Row): TrackedRepository {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), displayName: String(row.display_name),
    remoteUrl: String(row.remote_url), branch: String(row.branch), localHead: String(row.local_head),
    remoteHead: String(row.remote_head), remoteFreshness: row.remote_freshness as TrackedRepository["remoteFreshness"],
    checkedAt: iso(row.checked_at),
  };
}

function mapAgent(row: Row): AgentIdentity {
  return {
    id: String(row.id), teamId: String(row.team_id),
    parentAgentId: row.parent_agent_id === null ? null : String(row.parent_agent_id),
    displayName: String(row.display_name), role: row.role as AgentIdentity["role"],
    sessionId: String(row.session_id),
  };
}

function mapFile(row: Row): TrackedFile {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), repositoryId: String(row.repository_id),
    path: String(row.path), content: String(row.content), contentHash: String(row.content_hash),
    sourceRevision: String(row.source_revision), updatedByAgentId: String(row.updated_by_agent_id),
    updatedAt: iso(row.updated_at),
  };
}

function mapArtifact(row: Row): Artifact {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), repositoryId: String(row.repository_id),
    fileId: String(row.file_id), path: String(row.path), selector: String(row.selector),
    kind: row.kind as Artifact["kind"], currentVersionId: String(row.current_version_id),
  };
}

function mapVersion(row: Row): ArtifactVersion {
  return {
    id: String(row.id), artifactId: String(row.artifact_id), ordinal: Number(row.ordinal),
    content: String(row.content), contentHash: String(row.content_hash),
    fileContentHash: String(row.file_content_hash), sourceRevision: String(row.source_revision),
    createdByAgentId: String(row.created_by_agent_id), createdAt: iso(row.created_at),
  };
}

function mapClaim(row: Row): MemoryClaim {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), repositoryId: String(row.repository_id),
    statement: String(row.statement), status: row.status as MemoryClaim["status"],
    evidenceStrength: row.evidence_strength as MemoryClaim["evidenceStrength"],
    embedding: vector(row.embedding), createdByAgentId: String(row.created_by_agent_id),
    validFromRevision: String(row.valid_from_revision),
    invalidatedAt: row.invalidated_at === null ? null : iso(row.invalidated_at),
    invalidationReason: row.invalidation_reason === null ? null : String(row.invalidation_reason),
    supersededByClaimId: row.superseded_by_claim_id === null ? null : String(row.superseded_by_claim_id),
    createdAt: iso(row.created_at),
  };
}

function mapDependency(row: Row): ClaimDependency {
  return {
    claimId: String(row.claim_id), artifactId: String(row.artifact_id),
    anchoredVersionId: String(row.anchored_version_id),
    relationship: row.relationship as ClaimDependency["relationship"], required: Boolean(row.required),
  };
}

function mapRelationship(row: Row): ClaimRelationship {
  return {
    fromClaimId: String(row.from_claim_id), toClaimId: String(row.to_claim_id),
    relationship: row.relationship as ClaimRelationship["relationship"],
  };
}

function mapRead(row: Row): ReadReceipt {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), agentId: String(row.agent_id),
    artifactId: String(row.artifact_id), artifactVersionId: String(row.artifact_version_id),
    purpose: String(row.purpose), readAt: iso(row.read_at),
  };
}

function mapWrite(row: Row): WriteEvent {
  return {
    id: String(row.id), tenantId: String(row.tenant_id), repositoryId: String(row.repository_id),
    agentId: String(row.agent_id), fileId: String(row.file_id), path: String(row.path),
    expectedFileHash: String(row.expected_file_hash), observedFileHash: String(row.observed_file_hash),
    newFileHash: row.new_file_hash === null ? null : String(row.new_file_hash), summary: String(row.summary),
    sourceRevision: String(row.source_revision), outcome: row.outcome as WriteEvent["outcome"],
    changedArtifactIds: strings(row.changed_artifact_ids), invalidatedClaimIds: strings(row.invalidated_claim_ids),
    createdAt: iso(row.created_at),
  };
}

export class CockroachGraphStore implements MemoryGraphStore {
  readonly mode = "cockroachdb" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl, max: 8, application_name: "contextseal-graph" });
  }

  async reset(seed: MemoryGraphSeed): Promise<void> {
    await this.transaction(async (client) => {
      const tenant = seed.repository.tenantId;
      await client.query("DELETE FROM artifact_read_receipts WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM artifact_write_events WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM claim_relationships WHERE from_claim_id IN (SELECT id FROM memory_claims WHERE tenant_id = $1)", [tenant]);
      await client.query("DELETE FROM claim_dependencies WHERE claim_id IN (SELECT id FROM memory_claims WHERE tenant_id = $1)", [tenant]);
      await client.query("DELETE FROM memory_claims WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM graph_artifact_versions WHERE artifact_id IN (SELECT id FROM graph_artifacts WHERE tenant_id = $1)", [tenant]);
      await client.query("DELETE FROM graph_artifacts WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM tracked_files WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM graph_agents WHERE tenant_id = $1", [tenant]);
      await client.query("DELETE FROM graph_repositories WHERE tenant_id = $1", [tenant]);

      const r = seed.repository;
      await client.query(
        `INSERT INTO graph_repositories
          (id, tenant_id, display_name, remote_url, branch, local_head, remote_head, remote_freshness, checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.tenantId, r.displayName, r.remoteUrl, r.branch, r.localHead, r.remoteHead, r.remoteFreshness, r.checkedAt],
      );
      for (const agent of seed.agents) {
        await client.query(
          `INSERT INTO graph_agents
            (id, tenant_id, team_id, parent_agent_id, display_name, role, session_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [agent.id, tenant, agent.teamId, agent.parentAgentId, agent.displayName, agent.role, agent.sessionId],
        );
      }
      for (const file of seed.files) {
        await client.query(
          `INSERT INTO tracked_files
            (id, tenant_id, repository_id, path, content, content_hash, source_revision, updated_by_agent_id, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [file.id, file.tenantId, file.repositoryId, file.path, file.content, file.contentHash, file.sourceRevision, file.updatedByAgentId, file.updatedAt],
        );
      }
      for (const artifact of seed.artifacts) {
        await client.query(
          `INSERT INTO graph_artifacts
            (id, tenant_id, repository_id, file_id, path, selector, kind, current_version_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [artifact.id, artifact.tenantId, artifact.repositoryId, artifact.fileId, artifact.path, artifact.selector, artifact.kind, artifact.currentVersionId],
        );
      }
      for (const version of seed.artifactVersions) {
        await this.insertVersion(client, version);
      }
      for (const claim of seed.claims) await this.insertClaim(client, claim);
      for (const dependency of seed.dependencies) await this.insertDependency(client, dependency);
      for (const relation of seed.relationships) await this.insertRelationship(client, relation);
    });
  }

  async snapshot(repositoryId: string): Promise<MemoryGraphSnapshot> {
    const repositoryResult = await this.pool.query("SELECT * FROM graph_repositories WHERE id = $1", [repositoryId]);
    if (!repositoryResult.rows[0]) throw new Error(`Repository ${repositoryId} was not found`);
    const tenant = String(repositoryResult.rows[0].tenant_id);
    const [agents, files, artifacts, versions, claims, dependencies, relationships, reads, writes] = await Promise.all([
      this.pool.query("SELECT * FROM graph_agents WHERE tenant_id = $1 ORDER BY role, id", [tenant]),
      this.pool.query("SELECT * FROM tracked_files WHERE repository_id = $1 ORDER BY path", [repositoryId]),
      this.pool.query("SELECT * FROM graph_artifacts WHERE repository_id = $1 ORDER BY path, selector", [repositoryId]),
      this.pool.query("SELECT v.* FROM graph_artifact_versions v JOIN graph_artifacts a ON a.id=v.artifact_id WHERE a.repository_id=$1 ORDER BY v.artifact_id,v.ordinal", [repositoryId]),
      this.pool.query("SELECT * FROM memory_claims WHERE repository_id = $1 ORDER BY created_at,id", [repositoryId]),
      this.pool.query("SELECT d.* FROM claim_dependencies d JOIN memory_claims c ON c.id=d.claim_id WHERE c.repository_id=$1 ORDER BY d.claim_id", [repositoryId]),
      this.pool.query("SELECT r.* FROM claim_relationships r JOIN memory_claims c ON c.id=r.from_claim_id WHERE c.repository_id=$1 ORDER BY r.from_claim_id", [repositoryId]),
      this.pool.query("SELECT rr.* FROM artifact_read_receipts rr JOIN graph_artifacts a ON a.id=rr.artifact_id WHERE a.repository_id=$1 ORDER BY rr.read_at", [repositoryId]),
      this.pool.query("SELECT * FROM artifact_write_events WHERE repository_id=$1 ORDER BY created_at", [repositoryId]),
    ]);
    return {
      mode: this.mode, repository: mapRepository(repositoryResult.rows[0]), agents: agents.rows.map(mapAgent),
      files: files.rows.map(mapFile), artifacts: artifacts.rows.map(mapArtifact),
      artifactVersions: versions.rows.map(mapVersion), claims: claims.rows.map(mapClaim),
      dependencies: dependencies.rows.map(mapDependency), relationships: relationships.rows.map(mapRelationship),
      reads: reads.rows.map(mapRead), writes: writes.rows.map(mapWrite),
    };
  }

  async recordRead(input: RecordReadInput): Promise<ReadResult> {
    return this.transaction(async (client) => {
      await this.assertAgent(client, input.tenantId, input.agentId);
      const result = await client.query(
        `SELECT a.*, v.id AS v_id, v.artifact_id AS v_artifact_id, v.ordinal AS v_ordinal,
                v.content AS v_content, v.content_hash AS v_content_hash,
                v.file_content_hash AS v_file_content_hash, v.source_revision AS v_source_revision,
                v.created_by_agent_id AS v_created_by_agent_id, v.created_at AS v_created_at
         FROM graph_artifacts a JOIN graph_artifact_versions v ON v.id=a.current_version_id
         WHERE a.tenant_id=$1 AND a.repository_id=$2 AND a.path=$3 AND a.selector=$4`,
        [input.tenantId, input.repositoryId, input.path, input.selector],
      );
      const row = result.rows[0];
      if (!row) throw new Error(`Artifact ${input.path}#${input.selector} is not tracked`);
      const artifact = mapArtifact(row);
      const version = mapVersion({
        id: row.v_id, artifact_id: row.v_artifact_id, ordinal: row.v_ordinal, content: row.v_content,
        content_hash: row.v_content_hash, file_content_hash: row.v_file_content_hash,
        source_revision: row.v_source_revision, created_by_agent_id: row.v_created_by_agent_id,
        created_at: row.v_created_at,
      });
      const previous = await client.query(
        "SELECT read_at FROM artifact_read_receipts WHERE agent_id=$1 AND artifact_id=$2 ORDER BY read_at DESC LIMIT 1",
        [input.agentId, artifact.id],
      );
      const since = previous.rows[0]?.read_at ?? "1970-01-01T00:00:00.000Z";
      const changes = await client.query(
        "SELECT * FROM artifact_write_events WHERE file_id=$1 AND created_at>=$2 ORDER BY created_at",
        [artifact.fileId, since],
      );
      const receipt: ReadReceipt = {
        id: randomUUID(), tenantId: input.tenantId, agentId: input.agentId, artifactId: artifact.id,
        artifactVersionId: version.id, purpose: input.purpose, readAt: new Date().toISOString(),
      };
      await client.query(
        `INSERT INTO artifact_read_receipts
          (id,tenant_id,agent_id,artifact_id,artifact_version_id,purpose,read_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [receipt.id, receipt.tenantId, receipt.agentId, receipt.artifactId, receipt.artifactVersionId, receipt.purpose, receipt.readAt],
      );
      return {
        artifact, version,
        capsule: {
          path: artifact.path, selector: artifact.selector, currentVersionId: version.id,
          currentContentHash: version.contentHash,
          changesSinceLastRead: changes.rows.map(mapWrite).map((event) => ({
            agentId: event.agentId, summary: event.summary, outcome: event.outcome,
            createdAt: event.createdAt, newFileHash: event.newFileHash,
          })),
        },
      };
    });
  }

  async applyWrite(input: ApplyWriteInput): Promise<ApplyWriteResult> {
    return this.transaction(async (client) => {
      await this.assertAgent(client, input.tenantId, input.agentId);
      const fileResult = await client.query(
        "SELECT * FROM tracked_files WHERE tenant_id=$1 AND repository_id=$2 AND path=$3 FOR UPDATE",
        [input.tenantId, input.repositoryId, input.path],
      );
      if (!fileResult.rows[0]) throw new Error(`File ${input.path} is not tracked`);
      const file = mapFile(fileResult.rows[0]);
      const now = new Date().toISOString();
      if (file.contentHash !== input.expectedFileHash) {
        const event = this.makeWrite(input, file, now, "rejected_stale", null, [], []);
        await this.insertWrite(client, event);
        return { event, file, changedArtifacts: [], invalidatedClaims: [] };
      }

      const artifactResult = await client.query(
        `SELECT a.*, v.ordinal, v.content_hash
         FROM graph_artifacts a JOIN graph_artifact_versions v ON v.id=a.current_version_id
         WHERE a.file_id=$1 ORDER BY a.selector`,
        [file.id],
      );
      const newFileHash = sha256(input.content);
      const changedArtifacts: Artifact[] = [];
      for (const row of artifactResult.rows) {
        const artifact = mapArtifact(row);
        const content = artifact.kind === "whole-file" ? input.content : canonicalPointerValue(input.content, artifact.selector);
        const contentHash = sha256(content);
        if (contentHash === String(row.content_hash)) continue;
        const version: ArtifactVersion = {
          id: randomUUID(), artifactId: artifact.id, ordinal: Number(row.ordinal) + 1, content, contentHash,
          fileContentHash: newFileHash, sourceRevision: input.sourceRevision,
          createdByAgentId: input.agentId, createdAt: now,
        };
        await this.insertVersion(client, version);
        const updated = await client.query(
          "UPDATE graph_artifacts SET current_version_id=$1 WHERE id=$2 AND current_version_id=$3 RETURNING *",
          [version.id, artifact.id, artifact.currentVersionId],
        );
        if (updated.rowCount !== 1) throw Object.assign(new Error("Concurrent artifact version change"), { code: "40001" });
        changedArtifacts.push(mapArtifact(updated.rows[0]));
      }
      await client.query(
        `UPDATE tracked_files SET content=$1,content_hash=$2,source_revision=$3,
          updated_by_agent_id=$4,updated_at=$5 WHERE id=$6`,
        [input.content, newFileHash, input.sourceRevision, input.agentId, now, file.id],
      );

      let invalidatedClaims: MemoryClaim[] = [];
      if (changedArtifacts.length) {
        const invalidated = await client.query(
          `WITH RECURSIVE impacted(claim_id) AS (
             SELECT DISTINCT claim_id FROM claim_dependencies WHERE artifact_id = ANY($1::STRING[])
             UNION
             SELECT r.from_claim_id FROM claim_relationships r
             JOIN impacted i ON i.claim_id=r.to_claim_id
             WHERE r.relationship='derived_from'
           )
           UPDATE memory_claims SET status='stale',invalidated_at=$2,
             invalidation_reason='An anchored artifact or upstream claim changed'
           WHERE id IN (SELECT claim_id FROM impacted) AND status='valid'
           RETURNING *`,
          [changedArtifacts.map((item) => item.id), now],
        );
        invalidatedClaims = invalidated.rows.map(mapClaim);
      }
      const updatedFile: TrackedFile = { ...file, content: input.content, contentHash: newFileHash,
        sourceRevision: input.sourceRevision, updatedByAgentId: input.agentId, updatedAt: now };
      const event = this.makeWrite(input, updatedFile, now, "applied", newFileHash,
        changedArtifacts.map((item) => item.id), invalidatedClaims.map((item) => item.id));
      await this.insertWrite(client, event);
      return { event, file: updatedFile, changedArtifacts, invalidatedClaims };
    });
  }

  async rememberClaim(input: RememberClaimInput): Promise<MemoryClaim> {
    return this.transaction(async (client) => {
      await this.assertAgent(client, input.tenantId, input.agentId);
      for (const dependency of input.dependencies) {
        const result = await client.query("SELECT current_version_id FROM graph_artifacts WHERE id=$1 AND repository_id=$2", [dependency.artifactId, input.repositoryId]);
        if (!result.rows[0] || String(result.rows[0].current_version_id) !== dependency.artifactVersionId) {
          throw new Error(`Cannot create claim from stale artifact ${dependency.artifactId}`);
        }
      }
      for (const parentId of input.derivedFromClaimIds ?? []) {
        const result = await client.query("SELECT status FROM memory_claims WHERE id=$1 AND repository_id=$2", [parentId, input.repositoryId]);
        if (!result.rows[0] || result.rows[0].status !== "valid") throw new Error(`Cannot derive from non-valid claim ${parentId}`);
      }
      const claim: MemoryClaim = {
        id: input.id ?? randomUUID(), tenantId: input.tenantId, repositoryId: input.repositoryId,
        statement: input.statement, status: "valid", evidenceStrength: input.evidenceStrength,
        embedding: embedText(input.statement), createdByAgentId: input.agentId,
        validFromRevision: input.sourceRevision, invalidatedAt: null, invalidationReason: null,
        supersededByClaimId: null, createdAt: new Date().toISOString(),
      };
      await this.insertClaim(client, claim);
      for (const dependency of input.dependencies) {
        await this.insertDependency(client, {
          claimId: claim.id, artifactId: dependency.artifactId,
          anchoredVersionId: dependency.artifactVersionId, relationship: dependency.relationship,
          required: dependency.required ?? true,
        });
      }
      for (const parent of input.derivedFromClaimIds ?? []) {
        await this.insertRelationship(client, { fromClaimId: claim.id, toClaimId: parent, relationship: "derived_from" });
      }
      if (input.supersedesClaimId) {
        await client.query(
          `UPDATE memory_claims SET status='superseded',superseded_by_claim_id=$1,
            invalidated_at=coalesce(invalidated_at,$2) WHERE id=$3`,
          [claim.id, claim.createdAt, input.supersedesClaimId],
        );
        await this.insertRelationship(client, { fromClaimId: claim.id, toClaimId: input.supersedesClaimId, relationship: "supersedes" });
      }
      return claim;
    });
  }

  async recall(repositoryId: string, query: string, limit = 5): Promise<RecallResult> {
    const queryVector = toVectorLiteral(embedText(query));
    const result = await this.pool.query(
      `SELECT *, embedding <=> $2::VECTOR AS distance FROM memory_claims
       WHERE repository_id=$1 ORDER BY embedding <=> $2::VECTOR LIMIT $3`,
      [repositoryId, queryVector, Math.max(limit * 3, 12)],
    );
    const candidates: RecallCandidate[] = [];
    const parentsValidByClaimId = new Map<string, boolean>();
    for (const row of result.rows) {
      const claim = mapClaim(row);
      const deps = await this.pool.query(
        `SELECT d.*, a.*, av.id AS av_id,av.artifact_id AS av_artifact_id,av.ordinal AS av_ordinal,
                av.content AS av_content,av.content_hash AS av_content_hash,av.file_content_hash AS av_file_content_hash,
                av.source_revision AS av_source_revision,av.created_by_agent_id AS av_created_by_agent_id,av.created_at AS av_created_at,
                cv.id AS cv_id,cv.artifact_id AS cv_artifact_id,cv.ordinal AS cv_ordinal,
                cv.content AS cv_content,cv.content_hash AS cv_content_hash,cv.file_content_hash AS cv_file_content_hash,
                cv.source_revision AS cv_source_revision,cv.created_by_agent_id AS cv_created_by_agent_id,cv.created_at AS cv_created_at
         FROM claim_dependencies d JOIN graph_artifacts a ON a.id=d.artifact_id
         JOIN graph_artifact_versions av ON av.id=d.anchored_version_id
         JOIN graph_artifact_versions cv ON cv.id=a.current_version_id WHERE d.claim_id=$1`,
        [claim.id],
      );
      const parentResult = await this.pool.query(
        `SELECT r.to_claim_id,c.status FROM claim_relationships r JOIN memory_claims c ON c.id=r.to_claim_id
         WHERE r.from_claim_id=$1 AND r.relationship='derived_from'`,
        [claim.id],
      );
      const dependencies = deps.rows.map((dep) => {
        const artifact = mapArtifact(dep);
        const dependency = mapDependency(dep);
        const anchoredVersion = mapVersion({ id: dep.av_id, artifact_id: dep.av_artifact_id, ordinal: dep.av_ordinal, content: dep.av_content, content_hash: dep.av_content_hash, file_content_hash: dep.av_file_content_hash, source_revision: dep.av_source_revision, created_by_agent_id: dep.av_created_by_agent_id, created_at: dep.av_created_at });
        const currentVersion = mapVersion({ id: dep.cv_id, artifact_id: dep.cv_artifact_id, ordinal: dep.cv_ordinal, content: dep.cv_content, content_hash: dep.cv_content_hash, file_content_hash: dep.cv_file_content_hash, source_revision: dep.cv_source_revision, created_by_agent_id: dep.cv_created_by_agent_id, created_at: dep.cv_created_at });
        return { dependency, artifact, anchoredVersion, currentVersion, fresh: anchoredVersion.id === currentVersion.id };
      });
      const parentsValid = parentResult.rows.every((parent) => parent.status === "valid");
      parentsValidByClaimId.set(claim.id, parentsValid);
      candidates.push({
        claim, distance: row.distance === undefined ? cosineDistance(embedText(query), claim.embedding) : Number(row.distance),
        dependencies, derivedFromClaimIds: parentResult.rows.map((parent) => String(parent.to_claim_id)),
        ...(parentsValid ? {} : {}),
      });
    }
    const admissible = candidates.filter((candidate) =>
      candidate.claim.status === "valid" &&
      candidate.dependencies.every((item) => !item.dependency.required || item.fresh) &&
      parentsValidByClaimId.get(candidate.claim.id) !== false);
    return {
      query, admissible: admissible.slice(0, limit),
      withheld: candidates.filter((item) => !admissible.includes(item)).slice(0, limit),
      generatedAt: new Date().toISOString(),
    };
  }

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        if ((error as { code?: string }).code !== "40001" || attempt === 5) throw error;
      } finally {
        client.release();
      }
    }
    throw new Error("Transaction retry limit exceeded");
  }

  private async assertAgent(client: PoolClient, tenantId: string, agentId: string): Promise<void> {
    const result = await client.query("SELECT 1 FROM graph_agents WHERE tenant_id=$1 AND id=$2", [tenantId, agentId]);
    if (!result.rowCount) throw new Error(`Agent ${agentId} was not found`);
  }

  private async insertVersion(client: PoolClient, value: ArtifactVersion): Promise<void> {
    await client.query(
      `INSERT INTO graph_artifact_versions
        (id,artifact_id,ordinal,content,content_hash,file_content_hash,source_revision,created_by_agent_id,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [value.id,value.artifactId,value.ordinal,value.content,value.contentHash,value.fileContentHash,value.sourceRevision,value.createdByAgentId,value.createdAt],
    );
  }

  private async insertClaim(client: PoolClient, value: MemoryClaim): Promise<void> {
    await client.query(
      `INSERT INTO memory_claims
        (id,tenant_id,repository_id,statement,status,evidence_strength,embedding,created_by_agent_id,
         valid_from_revision,invalidated_at,invalidation_reason,superseded_by_claim_id,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::VECTOR,$8,$9,$10,$11,$12,$13)`,
      [value.id,value.tenantId,value.repositoryId,value.statement,value.status,value.evidenceStrength,toVectorLiteral(value.embedding),value.createdByAgentId,value.validFromRevision,value.invalidatedAt,value.invalidationReason,value.supersededByClaimId,value.createdAt],
    );
  }

  private async insertDependency(client: PoolClient, value: ClaimDependency): Promise<void> {
    await client.query(
      `INSERT INTO claim_dependencies (claim_id,artifact_id,anchored_version_id,relationship,required)
       VALUES ($1,$2,$3,$4,$5)`,
      [value.claimId,value.artifactId,value.anchoredVersionId,value.relationship,value.required],
    );
  }

  private async insertRelationship(client: PoolClient, value: ClaimRelationship): Promise<void> {
    await client.query(
      `INSERT INTO claim_relationships (from_claim_id,to_claim_id,relationship) VALUES ($1,$2,$3)`,
      [value.fromClaimId,value.toClaimId,value.relationship],
    );
  }

  private makeWrite(input: ApplyWriteInput, file: TrackedFile, createdAt: string,
    outcome: WriteEvent["outcome"], newFileHash: string | null,
    changedArtifactIds: string[], invalidatedClaimIds: string[]): WriteEvent {
    return {
      id: randomUUID(), tenantId: input.tenantId, repositoryId: input.repositoryId,
      agentId: input.agentId, fileId: file.id, path: input.path,
      expectedFileHash: input.expectedFileHash,
      observedFileHash: outcome === "applied" ? input.expectedFileHash : file.contentHash,
      newFileHash, summary: input.summary, sourceRevision: input.sourceRevision, outcome,
      changedArtifactIds, invalidatedClaimIds, createdAt,
    };
  }

  private async insertWrite(client: PoolClient, value: WriteEvent): Promise<void> {
    await client.query(
      `INSERT INTO artifact_write_events
        (id,tenant_id,repository_id,agent_id,file_id,path,expected_file_hash,observed_file_hash,new_file_hash,
         summary,source_revision,outcome,changed_artifact_ids,invalidated_claim_ids,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [value.id,value.tenantId,value.repositoryId,value.agentId,value.fileId,value.path,value.expectedFileHash,value.observedFileHash,value.newFileHash,value.summary,value.sourceRevision,value.outcome,value.changedArtifactIds,value.invalidatedClaimIds,value.createdAt],
    );
  }
}
