CREATE TABLE IF NOT EXISTS receipt_sources (
  id STRING PRIMARY KEY,
  tenant_id STRING NOT NULL,
  kind STRING NOT NULL CHECK (kind IN ('file', 'http', 'sql')),
  label STRING NOT NULL,
  locator STRING NOT NULL,
  freshness_seconds INT8 NOT NULL,
  current_observation_id UUID NULL,
  UNIQUE (tenant_id, locator)
);

CREATE TABLE IF NOT EXISTS tool_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  source_id STRING NOT NULL REFERENCES receipt_sources (id),
  tool_name STRING NOT NULL,
  request JSONB NOT NULL,
  response_hash STRING NOT NULL,
  source_version STRING NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  run_id STRING NOT NULL,
  step INT8 NOT NULL,
  UNIQUE (tenant_id, run_id, step, source_id)
);

CREATE INDEX IF NOT EXISTS tool_observations_source_time_idx
  ON tool_observations (tenant_id, source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS observation_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES tool_observations (id),
  selector STRING NOT NULL,
  value STRING NOT NULL,
  value_hash STRING NOT NULL,
  UNIQUE (observation_id, selector)
);

CREATE TABLE IF NOT EXISTS receipt_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  statement STRING NOT NULL,
  status STRING NOT NULL CHECK (status IN ('proposed', 'valid', 'stale', 'superseded', 'rejected')),
  proposed_by STRING NOT NULL CHECK (proposed_by IN ('bedrock', 'deterministic-demo')),
  rationale STRING NOT NULL,
  embedding VECTOR(256) NOT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  invalidated_at TIMESTAMPTZ NULL,
  invalidation_reason STRING NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_memories_status_idx
  ON receipt_memories (tenant_id, status, created_at DESC);

-- Tenant is the C-SPANN prefix column. Titan embeddings are normalized, so
-- L2 nearest-neighbor order is equivalent to cosine order.
CREATE VECTOR INDEX IF NOT EXISTS receipt_memories_embedding_idx
  ON receipt_memories (tenant_id, embedding);

CREATE TABLE IF NOT EXISTS memory_receipt_dependencies (
  memory_id UUID NOT NULL REFERENCES receipt_memories (id),
  fragment_id UUID NOT NULL REFERENCES observation_fragments (id),
  required BOOL NOT NULL DEFAULT true,
  PRIMARY KEY (memory_id, fragment_id)
);

CREATE INDEX IF NOT EXISTS memory_receipt_dependencies_fragment_idx
  ON memory_receipt_dependencies (fragment_id, memory_id);

CREATE TABLE IF NOT EXISTS memory_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  memory_id UUID NOT NULL REFERENCES receipt_memories (id),
  decision STRING NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reviewer STRING NOT NULL,
  reason STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id STRING NOT NULL,
  action STRING NOT NULL CHECK (action IN ('issue_refund', 'deny_refund')),
  outcome STRING NOT NULL CHECK (outcome IN ('executed', 'blocked')),
  memory_id UUID NULL REFERENCES receipt_memories (id),
  reason STRING NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_orders (
  order_id STRING PRIMARY KEY,
  age_days INT8 NOT NULL,
  damaged BOOL NOT NULL,
  evidence_verified BOOL NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

UPSERT INTO demo_orders (order_id, age_days, damaged, evidence_verified)
VALUES ('ORD-1042', 14, true, true);

CREATE OR REPLACE VIEW mcp_receipt_audit AS
SELECT o.tenant_id, o.id AS observation_id, s.kind, s.label, s.locator,
       o.tool_name, o.source_version, o.response_hash, o.run_id, o.step,
       f.selector, f.value_hash, o.observed_at, o.expires_at
FROM tool_observations AS o
JOIN receipt_sources AS s ON s.id = o.source_id
JOIN observation_fragments AS f ON f.observation_id = o.id;

CREATE OR REPLACE VIEW mcp_memory_decisions AS
SELECT m.tenant_id, m.id AS memory_id, m.statement, m.status, m.proposed_by,
       m.rationale, r.decision, r.reviewer, r.reason AS review_reason,
       a.action, a.outcome, a.reason AS action_reason,
       m.invalidated_at, m.invalidation_reason
FROM receipt_memories AS m
LEFT JOIN memory_reviews AS r ON r.memory_id = m.id
LEFT JOIN action_receipts AS a ON a.memory_id = m.id;
