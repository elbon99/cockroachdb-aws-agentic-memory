# Selected project direction

Status: **superseded design record**

> The current authoritative direction is [MEMORY_GRAPH_DIRECTION.md](MEMORY_GRAPH_DIRECTION.md): Git-aware, validity-gated memory with selective recursive invalidation. The atomic release work below remains useful prior art and schema context, but it is no longer the submission headline.

Decision date: **2026-08-15**

## Working name

### ContextSeal

**Atomic, replayable memory releases for AI agent fleets.**

## Product sentence

> ContextSeal publishes one coherent, authorized bundle of policies, tools, and knowledge to an agent fleet, proves which memory changed an action, and reconstructs the exact context behind any prior decision.

## Precise user

The first user is an enterprise agent-platform engineer operating several customer-support agents. They need to change policies, tool definitions, and approved knowledge without allowing agents to consume a mixture of old and new versions.

## Demonstration workflow

The demo uses one damaged-order support case.

- Release R17 contains a seven-day refund policy. The agent calls `deny_refund` for a fourteen-day-old order.
- Two R18 candidates based on R17 publish concurrently.
- CockroachDB permits one expected-base transition and rejects the other as stale.
- The winning R18 contains the approved thirty-day policy. The same case calls `issue_refund`.
- The interface displays the exact changed block hash and retrieved evidence that informed the action.
- The R17 invocation can be reconstructed from its immutable release manifest and evidence receipt.
- Two identical Bedrock calls under R18 demonstrate cache-write then cache-read telemetry when credentials and model access are configured.

## Core invariant

```text
An admitted invocation uses exactly one authorized release manifest.

Publishing candidate C succeeds only when:
active_release_id == C.expected_base_release_id

After one candidate advances R17 to R18, every other R17-based candidate is stale.
```

Serializable isolation is necessary but not sufficient. Publication must perform an expected-base compare-and-swap and revalidate it after retryable transaction conflicts.

## CockroachDB role

CockroachDB is the system of record for:

- immutable context blocks and content hashes;
- block embeddings and authorization metadata;
- release manifests and dependency edges;
- approval and supersession state;
- the active release pointer;
- invocation inputs, model configuration, selected evidence, action, and request hash;
- cache-token telemetry and audit events.

### Required CockroachDB tools

1. **Distributed Vector Indexing** retrieves authorized task-specific evidence after the stable cache checkpoint.
2. **CockroachDB Cloud Managed MCP Server** gives a read-oriented auditor agent access to the active release, invocation receipts, and reconstruction evidence.
3. **ccloud CLI** is optional supporting proof for reproducible provisioning or operational preflight; it is not counted if only shown in setup notes.

Writes use a scoped application service and parameterized SQL transactions. The model does not receive unrestricted write access.

## AWS role

- **Amazon Bedrock Converse API** performs the bounded support decision and exposes `cacheWriteInputTokens` and `cacheReadInputTokens`.
- **AWS Lambda/API Gateway** is the intended deployment boundary for the API if schedule permits; the correctness boundary remains the synchronous CockroachDB transaction and admission check.
- **CloudWatch** is optional for latency, publication failures, and cache telemetry.

The application has a clearly labeled deterministic demo engine so development and recorded fallback behavior remain reproducible. It must never present fallback counters as real Bedrock telemetry.

## Scope frozen for the vertical slice

Build only:

1. immutable block and manifest schema;
2. expected-base atomic publication;
3. one same-input action change;
4. authorized hybrid/vector evidence retrieval;
5. exact request reconstruction;
6. one real Bedrock cache write/read path;
7. one useful MCP auditor query;
8. a single-screen guided demo;
9. concurrency, causality, and reconstruction tests.

## Explicitly deferred

- generic prompt or memory registry;
- arbitrary workflow builder;
- live revocation of in-flight inference;
- provider-side cache deletion;
- EventBridge as a correctness mechanism;
- multi-region claims without proof;
- elaborate approval UI;
- agent acknowledgements and presence;
- many model providers;
- general enterprise connectors;
- chat-history storage;
- automatic memory extraction from transcripts.

## Falsification gates

The prototype fails its thesis if any of the following occurs:

1. More than one candidate based on R17 becomes a valid successor.
2. A consumer observes a manifest containing blocks from different releases.
3. The same-input behavior change cannot be traced to one approved block/evidence change.
4. A prior invocation request cannot be reconstructed byte-for-byte.
5. Vector retrieval does not affect the demonstrated action or is not authorization-filtered.
6. The Bedrock cache proof cannot produce real provider telemetry; in that case caching must be removed from the headline.

## Competitive boundary

Do not claim that prompt versioning, release aliases, rollback, or context bundles are new. LangSmith, LaunchDarkly, MLflow, Braintrust, Bedrock Prompt Management, and OPA already cover large portions of that surface.

The narrow claim to demonstrate is:

> One database transaction binds the active release, its exact immutable dependencies, the authorized dynamic evidence, and the resulting agent action into a replayable receipt while preventing stale concurrent publication.

## Evaluation reference

See [ATOMIC_MEMORY_RELEASES_EVALUATION_2026-08-14.md](ATOMIC_MEMORY_RELEASES_EVALUATION_2026-08-14.md) for the independent Idea-mode evaluation.
