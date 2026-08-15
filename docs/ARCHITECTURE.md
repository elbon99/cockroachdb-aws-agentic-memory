# ContextSeal architecture

Status: **superseded release-layer contract**

> The active implementation contract is [MEMORY_GRAPH_DIRECTION.md](MEMORY_GRAPH_DIRECTION.md). The release/compiler architecture below is retained as the historical layer from which the graph implementation evolved.

Last updated: **2026-08-15**

## Runtime shape

```text
Browser demo
    |
    v
Next.js route handlers / AWS deployment boundary
    |
    +--> ContextSeal domain service
    |       +--> release compiler
    |       +--> expected-base publisher
    |       +--> admission gate
    |       +--> evidence retriever
    |       +--> invocation reconstructor
    |
    +--> CockroachDB repository
    |       +--> relational release and invocation state
    |       +--> VECTOR evidence search
    |
    +--> Bedrock Converse adapter
            +--> stable system prefix + cache checkpoint
            +--> variable case/evidence after checkpoint
            +--> bounded refund tools
```

## Deployment modes

### CockroachDB mode

`DATABASE_URL` points to CockroachDB. Schema migrations create the production tables and vector index. This is the required submission mode.

### Local deterministic mode

When `DATABASE_URL` is absent, the app uses an in-process repository and deterministic decision engine. The interface must label this mode. It exists for development, tests, and a reproducible fallback—not as hackathon proof.

### Bedrock mode

When `AGENT_ENGINE=bedrock`, the application invokes Bedrock Converse using a fixed region and model. Real usage telemetry is stored with the invocation.

### Deterministic engine

When `AGENT_ENGINE=deterministic`, the same compiled release and evidence receipt drive a bounded local decision function. Synthetic cache counters are forbidden.

## Publication transaction

Candidate preparation can occur outside the critical transaction. Publication performs:

1. begin serializable transaction;
2. load candidate and verify its status and expected base;
3. validate every manifest block exists, is immutable, and is approved;
4. conditionally update the environment pointer where `active_release_id = expected_base_release_id`;
5. if no row updates, mark or return the candidate as stale without changing the pointer;
6. mark the winner active and the former release superseded;
7. append the audit event;
8. commit;
9. retry the entire operation on SQLSTATE `40001`, then repeat the expected-base check.

## Admission and invocation receipt

Before every model call:

1. resolve the current release;
2. reject an explicitly requested release if it is not active or otherwise authorized;
3. deterministically compile the stable prefix;
4. retrieve evidence scoped by tenant, release, approval status, and purpose;
5. append variable case/evidence after the stable cache checkpoint;
6. hash the exact request envelope;
7. execute one bounded agent decision;
8. store the receipt and provider telemetry.

## Security boundaries

- The model can select only declared support tools.
- Database writes are parameterized application operations.
- MCP is configured for read-oriented audit queries in the demo.
- Tenant and environment filters are server-side.
- Evidence must be approved and release-eligible before retrieval.
- Secrets remain in environment variables and never enter invocation receipts.
- Bedrock failure falls back only when explicitly configured; the UI identifies the engine used.

## Demo proof surfaces

- **Memory behavior:** identical case, different release, different tool action.
- **Transaction correctness:** one R17-based successor under concurrent publication.
- **Retrieval:** exact authorized evidence IDs and distances.
- **Reconstruction:** stored request hash equals reconstructed request hash.
- **AWS:** real cache write/read fields from Bedrock usage.
- **MCP:** auditor agent reads the active release and receipt without mutation privileges.
