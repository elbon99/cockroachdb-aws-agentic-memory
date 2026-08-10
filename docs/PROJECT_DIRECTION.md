# Candidate project direction

Status: **candidate, not frozen**

## Working concept

### Durable Incident Memory Agent

An operational agent that investigates incidents and builds a verified memory of what actually worked.

Instead of starting every incident from zero, it accumulates durable operational knowledge.

## Problem

Incident response repeatedly loses context:

- telemetry is fragmented,
- similar incidents recur,
- important fixes live in Slack/tickets/human memory,
- an agent may repeat a failed remediation,
- runbooks age,
- teams rarely encode the full causal chain from symptom to verified recovery.

## Desired behavior

For a new incident:

1. Observe current symptoms/evidence.
2. Create durable incident state.
3. Retrieve semantically similar incidents from CockroachDB.
4. Retrieve structured outcomes and failed attempts.
5. Investigate live/current evidence with tools.
6. Propose a bounded remediation or next diagnostic step.
7. Require human approval for consequential actions if needed.
8. Execute.
9. Verify health/recovery.
10. Persist:
   - evidence,
   - action,
   - approval/override,
   - result,
   - verification,
   - learned memory,
   - provenance/confidence.

For a later similar incident, prior verified outcomes should materially change the plan.

## Why CockroachDB is naturally central

Potentially store together:

- relational incident/task state,
- action/audit records,
- embeddings for semantic similarity,
- structured service metadata,
- verification outcomes,
- memory provenance,
- human decisions.

This lets the demo show both **transactional memory and semantic memory** rather than introducing a separate operational DB and vector DB.

## Candidate CockroachDB tools

Likely strong combination:

1. **Distributed Vector Indexing**
   - retrieve semantically related incidents/memories.

2. **Managed MCP Server**
   - expose/query CockroachDB safely as part of agent tooling.

Possible third:
3. **ccloud CLI**
   - provisioning/ops/observability demonstration if it is genuinely useful rather than decorative.

Agent Skills may also be useful, but should not be included solely to satisfy tool count.

## Candidate AWS role

Keep AWS simple and load-bearing.

Possible architecture:

- Bedrock for model reasoning **or**
- ECS/Lambda for agent runtime
- S3 for large investigation artifacts where useful

Do not use three AWS services if one or two make a cleaner product.

## Demo hypothesis

Demonstrate two related incidents.

### Incident A
Agent has no relevant prior memory:
- investigates,
- takes/requests action,
- verifies recovery,
- writes verified memory.

### Incident B
Similar symptom occurs later:
- agent retrieves Incident A,
- recognizes a known failed/successful pattern,
- avoids redundant diagnostics or failed remediation,
- reaches a safe proposal faster,
- verifies again,
- updates memory.

This creates an extremely visible before/after story for “agentic memory.”

## Differentiation from AutoSRE

Do not build “AutoSRE on AWS with CockroachDB.”

AutoSRE's winning centerpiece was governed autonomous remediation.

Our centerpiece should be:

> **verified durable learning across incidents.**

Incident response is the domain; memory evolution is the product.

## Must-prove questions

Before implementation is frozen:

1. What exact evidence source will produce incidents?
2. What real tools can the agent safely use?
3. What memory schema makes CockroachDB indispensable?
4. How do memories become verified vs unverified?
5. How does memory age or become superseded?
6. What does semantic retrieval add beyond a SQL filter?
7. What is the one action the agent can perform that makes this agentic rather than RAG?
8. What is the smallest deterministic demo scenario?
