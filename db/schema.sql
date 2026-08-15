CREATE TABLE IF NOT EXISTS environments (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  name STRING NOT NULL,
  active_release_id STRING NOT NULL,
  pointer_version INT8 NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS environments_tenant_idx
  ON environments (tenant_id, id);

CREATE TABLE IF NOT EXISTS context_blocks (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  kind STRING NOT NULL CHECK (kind IN ('policy', 'tools', 'knowledge')),
  version INT8 NOT NULL,
  title STRING NOT NULL,
  content STRING NOT NULL,
  content_hash STRING NOT NULL,
  status STRING NOT NULL CHECK (status IN ('approved', 'revoked')),
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, kind, version, content_hash)
);

CREATE INDEX IF NOT EXISTS context_blocks_tenant_status_idx
  ON context_blocks (tenant_id, status, kind);

CREATE TABLE IF NOT EXISTS releases (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  environment_id STRING NOT NULL,
  display_name STRING NOT NULL,
  sequence INT8 NOT NULL,
  candidate_name STRING NULL,
  expected_base_release_id STRING NULL,
  status STRING NOT NULL CHECK (status IN ('candidate', 'active', 'superseded', 'stale')),
  block_ids STRING[] NOT NULL,
  compiled_prefix STRING NOT NULL,
  compiled_prefix_hash STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS releases_environment_sequence_idx
  ON releases (environment_id, sequence, status);

CREATE TABLE IF NOT EXISTS evidence_memories (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  release_id STRING NOT NULL,
  purpose STRING NOT NULL,
  title STRING NOT NULL,
  content STRING NOT NULL,
  content_hash STRING NOT NULL,
  source_uri STRING NOT NULL,
  status STRING NOT NULL CHECK (status IN ('approved', 'rejected', 'superseded')),
  embedding VECTOR(8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS evidence_scope_idx
  ON evidence_memories (tenant_id, release_id, purpose, status);

CREATE VECTOR INDEX IF NOT EXISTS evidence_embedding_vector_idx
  ON evidence_memories (tenant_id, release_id, embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS invocations (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  environment_id STRING NOT NULL,
  release_id STRING NOT NULL,
  case_input JSONB NOT NULL,
  evidence_ids STRING[] NOT NULL,
  request_envelope JSONB NOT NULL,
  request_hash STRING NOT NULL,
  action JSONB NOT NULL,
  engine STRING NOT NULL CHECK (engine IN ('deterministic', 'bedrock')),
  usage JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS invocations_environment_created_idx
  ON invocations (environment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  environment_id STRING NOT NULL,
  type STRING NOT NULL,
  release_id STRING NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_environment_created_idx
  ON audit_events (environment_id, created_at DESC);

CREATE OR REPLACE VIEW mcp_active_release_audit AS
SELECT
  e.tenant_id,
  e.id AS environment_id,
  e.name AS environment_name,
  e.pointer_version,
  r.id AS release_id,
  r.display_name,
  r.candidate_name,
  r.compiled_prefix_hash,
  r.block_ids,
  r.activated_at
FROM environments AS e
JOIN releases AS r ON r.id = e.active_release_id;

CREATE OR REPLACE VIEW mcp_invocation_receipts AS
SELECT
  tenant_id,
  environment_id,
  id AS invocation_id,
  release_id,
  evidence_ids,
  request_hash,
  action,
  engine,
  usage,
  created_at
FROM invocations;

-- Validity-aware memory graph -------------------------------------------------

CREATE TABLE IF NOT EXISTS graph_repositories (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  display_name STRING NOT NULL,
  remote_url STRING NOT NULL,
  branch STRING NOT NULL,
  local_head STRING NOT NULL,
  remote_head STRING NOT NULL,
  remote_freshness STRING NOT NULL CHECK (remote_freshness IN ('current', 'changed', 'unknown')),
  checked_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS graph_repositories_tenant_idx
  ON graph_repositories (tenant_id, id);

CREATE TABLE IF NOT EXISTS graph_agents (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  team_id STRING NOT NULL,
  parent_agent_id STRING NULL,
  display_name STRING NOT NULL,
  role STRING NOT NULL CHECK (role IN ('root', 'subagent')),
  session_id STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS graph_agents_team_idx
  ON graph_agents (tenant_id, team_id, parent_agent_id);

CREATE TABLE IF NOT EXISTS tracked_files (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  repository_id STRING NOT NULL,
  path STRING NOT NULL,
  content STRING NOT NULL,
  content_hash STRING NOT NULL,
  source_revision STRING NOT NULL,
  updated_by_agent_id STRING NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (repository_id, path)
);

CREATE INDEX IF NOT EXISTS tracked_files_repository_path_idx
  ON tracked_files (repository_id, path);

CREATE TABLE IF NOT EXISTS graph_artifacts (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  repository_id STRING NOT NULL,
  file_id STRING NOT NULL,
  path STRING NOT NULL,
  selector STRING NOT NULL,
  kind STRING NOT NULL CHECK (kind IN ('json-pointer', 'whole-file')),
  current_version_id STRING NOT NULL,
  UNIQUE (repository_id, path, selector)
);

CREATE INDEX IF NOT EXISTS graph_artifacts_file_idx
  ON graph_artifacts (file_id, selector);

CREATE TABLE IF NOT EXISTS graph_artifact_versions (
  id STRING PRIMARY KEY,
  artifact_id STRING NOT NULL,
  ordinal INT8 NOT NULL,
  content STRING NOT NULL,
  content_hash STRING NOT NULL,
  file_content_hash STRING NOT NULL,
  source_revision STRING NOT NULL,
  created_by_agent_id STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (artifact_id, ordinal),
  UNIQUE (artifact_id, content_hash, source_revision)
);

CREATE INDEX IF NOT EXISTS graph_artifact_versions_artifact_idx
  ON graph_artifact_versions (artifact_id, ordinal DESC);

CREATE TABLE IF NOT EXISTS memory_claims (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  repository_id STRING NOT NULL,
  statement STRING NOT NULL,
  status STRING NOT NULL CHECK (status IN ('valid', 'stale', 'unprovable', 'superseded')),
  evidence_strength STRING NOT NULL CHECK (evidence_strength IN ('proven', 'partial', 'unknown')),
  embedding VECTOR(8) NOT NULL,
  created_by_agent_id STRING NOT NULL,
  valid_from_revision STRING NOT NULL,
  invalidated_at TIMESTAMPTZ NULL,
  invalidation_reason STRING NULL,
  superseded_by_claim_id STRING NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS memory_claims_scope_status_idx
  ON memory_claims (tenant_id, repository_id, status, created_at DESC);

CREATE VECTOR INDEX IF NOT EXISTS memory_claims_embedding_vector_idx
  ON memory_claims (tenant_id, repository_id, embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS claim_dependencies (
  claim_id STRING NOT NULL,
  artifact_id STRING NOT NULL,
  anchored_version_id STRING NOT NULL,
  relationship STRING NOT NULL CHECK (relationship IN ('supported_by', 'constrained_by')),
  required BOOL NOT NULL DEFAULT true,
  PRIMARY KEY (claim_id, artifact_id)
);

CREATE INDEX IF NOT EXISTS claim_dependencies_artifact_idx
  ON claim_dependencies (artifact_id, claim_id);

CREATE TABLE IF NOT EXISTS claim_relationships (
  from_claim_id STRING NOT NULL,
  to_claim_id STRING NOT NULL,
  relationship STRING NOT NULL CHECK (relationship IN ('derived_from', 'supersedes', 'contradicts')),
  PRIMARY KEY (from_claim_id, to_claim_id, relationship)
);

CREATE INDEX IF NOT EXISTS claim_relationships_reverse_idx
  ON claim_relationships (to_claim_id, relationship, from_claim_id);

CREATE TABLE IF NOT EXISTS artifact_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  agent_id STRING NOT NULL,
  artifact_id STRING NOT NULL,
  artifact_version_id STRING NOT NULL,
  purpose STRING NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifact_reads_agent_artifact_idx
  ON artifact_read_receipts (agent_id, artifact_id, read_at DESC);

CREATE TABLE IF NOT EXISTS artifact_write_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  repository_id STRING NOT NULL,
  agent_id STRING NOT NULL,
  file_id STRING NOT NULL,
  path STRING NOT NULL,
  expected_file_hash STRING NOT NULL,
  observed_file_hash STRING NOT NULL,
  new_file_hash STRING NULL,
  summary STRING NOT NULL,
  source_revision STRING NOT NULL,
  outcome STRING NOT NULL CHECK (outcome IN ('applied', 'rejected_stale')),
  changed_artifact_ids STRING[] NOT NULL,
  invalidated_claim_ids STRING[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifact_writes_repository_path_idx
  ON artifact_write_events (repository_id, path, created_at DESC);

CREATE OR REPLACE VIEW mcp_memory_validity AS
SELECT
  c.tenant_id,
  c.repository_id,
  c.id AS claim_id,
  c.statement,
  c.status,
  c.evidence_strength,
  count(d.artifact_id) AS dependency_count,
  count(*) FILTER (
    WHERE d.artifact_id IS NOT NULL
      AND a.current_version_id != d.anchored_version_id
  ) AS stale_dependency_count,
  c.valid_from_revision,
  c.invalidated_at,
  c.invalidation_reason,
  c.created_at
FROM memory_claims AS c
LEFT JOIN claim_dependencies AS d ON d.claim_id = c.id
LEFT JOIN graph_artifacts AS a ON a.id = d.artifact_id
GROUP BY c.id;

CREATE OR REPLACE VIEW mcp_agent_file_audit AS
SELECT
  w.tenant_id,
  w.repository_id,
  w.agent_id,
  a.parent_agent_id,
  a.team_id,
  w.path,
  w.outcome,
  w.summary,
  w.expected_file_hash,
  w.observed_file_hash,
  w.new_file_hash,
  w.changed_artifact_ids,
  w.invalidated_claim_ids,
  w.created_at
FROM artifact_write_events AS w
JOIN graph_agents AS a ON a.id = w.agent_id;
