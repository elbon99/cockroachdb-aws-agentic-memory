# ContextSeal backlog

ContextSeal is no longer targeting the August 2026 CockroachDB x AWS hackathon deadline. The next milestone is a credible post-hackathon prototype of evidence-current authorization for policy-sensitive agent actions.

## Priority 1 - make the real integration load-bearing

- [ ] Create a CockroachDB Cloud cluster and configure `DATABASE_URL` securely.
- [ ] Run migrations, seed data, persistence checks, and the contention stress test against CockroachDB Cloud.
- [ ] Replace deterministic hash embeddings with Bedrock Titan embeddings and demonstrate C-SPANN retrieval with `EXPLAIN` evidence.
- [ ] Configure Bedrock claim generation and verify a real Nova invocation and usage telemetry.
- [ ] Route the primary demo through the registered HTTP and SQL adapters instead of synthesized observations.
- [ ] Configure the CockroachDB Managed MCP Server and demonstrate a real read-only auditor-agent query.
- [ ] Deploy the sponsor-backed application on AWS and verify the public health and demo endpoints.

## Priority 2 - close safety and production gaps

- [ ] Add authentication, tenant-derived authorization, and real reviewer identities.
- [ ] Add action idempotency keys and an atomic compare-and-act/outbox transaction that revalidates evidence before committing an action intent.
- [ ] Replace the simulated refund receipt with a bounded mock action adapter and explicit execution verification.
- [ ] Add CockroachDB integration tests covering retries, duplicate requests, concurrent policy changes, persistence, and stale-memory withholding.
- [ ] Add metrics, tracing, alerting, backup/restore documentation, and failure-mode tests.
- [ ] Protect reset and administrative demo operations from unauthenticated callers.

## Priority 3 - validate the product claim

- [ ] Narrow positioning to evidence-current authorization for policy-sensitive agent actions.
- [ ] Build a realistic stale-heavy evaluation corpus.
- [ ] Compare vector-only recall, structured filtering, and receipt-gated recall across stale facts, irrelevant changes, conflicting sources, and concurrent updates.
- [ ] Measure recall quality, action correctness, latency, and invalidation precision.
- [ ] Document a direct capability comparison with Zep, Amazon Bedrock AgentCore Memory, Mem0, GitHub Copilot Memory, m1nd, rag-rat, and Graphiti.
- [ ] Interview prospective users in support, finance, compliance, or operations before expanding scope.

## Release and presentation

- [ ] Record a concise demo only after the live database, model, MCP auditor, and bounded action paths work end to end.
- [ ] Add a public deployment URL and an architecture diagram grounded in the deployed infrastructure.
- [ ] Rerun the independent prototype judge after sponsor integration and production-safety work.

